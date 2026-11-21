"""Carga data/profiles.parquet (190.000 perfiles de NTT DATA) en Postgres/Supabase.

Aplana el Parquet en las tablas de supabase/migrations/001_schema.sql y calcula los campos derivados:
la evidencia de cada skill (demostrada = aparece en algún proyecto o puesto), el número de proyectos
y el último año de uso, los sectores de todos sus proyectos y el catálogo de skills.

Uso:
    pip install duckdb "psycopg[binary]"
    # Supabase → Connect → Connection string → "Session pooler" (IPv4, puerto 5432); la "Direct connection" es solo IPv6
    $env:DATABASE_URL = "postgresql://postgres.<ref>:<PASSWORD>@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
    python scripts/load_profiles.py --schema            # crea el esquema y carga los 190k perfiles
    python scripts/load_profiles.py --solo-disponibles  # solo En banca + Roll-off <3 meses (34k perfiles, plan gratuito)
    python scripts/load_profiles.py --muestra 50000     # muestra estratificada de 50k perfiles completos
    python scripts/load_profiles.py --limit 5000        # carga solo los 5.000 primeros (para desarrollar)

Todas las columnas y bloques del Parquet se cargan tal cual; --solo-disponibles, --muestra y --limit solo reducen el número de perfiles.

Es idempotente: vacía las tablas del dataset antes de cargar. DuckDB aplana el Parquet y lo inserta con su extensión postgres (COPY binario);
psycopg ejecuta el SQL del esquema (varias sentencias, funciones, bloques DO).
"""
import argparse
import os
import pathlib
import re
import sys
import time

import duckdb
import psycopg

ROOT = pathlib.Path(__file__).resolve().parents[1]
TABLES = ["empleados", "empleado_skills", "proyectos", "experiencia", "estudios", "certificaciones", "idiomas", "catalogo_skills"]


def q(s: str) -> str:
    """Literal SQL entre comillas simples."""
    return "'" + s.replace("'", "''") + "'"


def redact(text: str) -> str:
    """Oculta la contraseña de cualquier URI postgres que aparezca en un mensaje."""
    return re.sub(r"(postgres(?:ql)?://[^:/@\s]+:)[^@\s]+@", r"\1****@", text)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--db", default=os.environ.get("DATABASE_URL"), help="URI de Postgres (por defecto, $DATABASE_URL)")
    ap.add_argument("--parquet", default=str(ROOT / "data" / "profiles.parquet"))
    ap.add_argument("--schema", action="store_true", help="aplica antes todas las migraciones de supabase/migrations/ en orden")
    ap.add_argument("--limit", type=int, help="carga solo los N primeros perfiles por employee_id")
    ap.add_argument("--solo-disponibles", action="store_true",
                    help="carga solo perfiles disponibles: 'En banca' y 'Roll-off próximo (<3 meses)'")
    ap.add_argument("--muestra", type=int,
                    help="muestra estratificada de N perfiles completos (proporcional por área × disponibilidad × sector)")
    args = ap.parse_args()
    if not args.db:
        sys.exit("Falta la conexión: usa --db o define DATABASE_URL (nunca la guardes en el repo).")

    # Prueba la conexión antes de nada, con un mensaje claro (y sin mostrar la contraseña).
    try:
        psycopg.connect(args.db, connect_timeout=15).close()
    except psycopg.OperationalError as e:
        msg = str(e)
        hint = ("Contraseña incorrecta: revísala o usa 'Reset database password' en Supabase (tarda ~1 min en aplicarse)."
                if "password authentication failed" in msg else
                "No se pudo conectar: en Supabase usa la cadena del 'Session pooler' (IPv4), no la 'Direct connection' (IPv6).")
        sys.exit(f"{hint}\nDetalle: {redact(msg)}")

    con = duckdb.connect()
    con.execute("INSTALL postgres; LOAD postgres;")
    con.execute(f"ATTACH {q(args.db)} AS pg (TYPE postgres)")

    def pg_exec(sql: str) -> None:
        with psycopg.connect(args.db, autocommit=True) as c:
            c.execute(sql)

    if args.schema:
        for mig in sorted((ROOT / "supabase" / "migrations").glob("*.sql")):
            pg_exec(mig.read_text(encoding="utf-8"))
            print(f"Migración aplicada: {mig.name}")
        con.execute("DETACH pg")  # recarga el catálogo para ver las tablas nuevas
        con.execute(f"ATTACH {q(args.db)} AS pg (TYPE postgres)")

    full_src = f"read_parquet({q(args.parquet)})"
    src = full_src
    if args.solo_disponibles:
        src = f"(SELECT * FROM {full_src} WHERE disponibilidad IN ('En banca', 'Roll-off próximo (<3 meses)'))"
    if args.muestra:
        # Estratificada y reproducible: en cada estrato (área × disponibilidad × sector) se toma la misma proporción,
        # ordenando por hash del id. Así la muestra conserva la distribución del dataset completo.
        con.execute(f"""CREATE TEMP TABLE src AS
            SELECT * EXCLUDE (rn, n, total) FROM (
                SELECT *, row_number() OVER w AS rn, count(*) OVER (PARTITION BY area, disponibilidad, sector_principal) AS n,
                       count(*) OVER () AS total
                FROM {src}
                WINDOW w AS (PARTITION BY area, disponibilidad, sector_principal ORDER BY hash(employee_id))
            ) WHERE rn <= ceil(n * {int(args.muestra)} / total)""")
    else:
        limit = f"ORDER BY employee_id LIMIT {int(args.limit)}" if args.limit else ""
        con.execute(f"CREATE TEMP TABLE src AS SELECT * FROM {src} {limit}")
    total = con.execute("SELECT count(*) FROM src").fetchone()[0]
    print(f"Perfiles a cargar: {total:,}")
    if args.muestra or args.solo_disponibles:
        # Comprueba que la muestra tiene "un poco de todo": mismos roles, skills, certificaciones, países y sectores.
        cov = """SELECT count(DISTINCT rol), (SELECT count(DISTINCT s.skill) FROM (SELECT unnest(skills) s FROM {t})),
                        (SELECT count(DISTINCT c.nombre) FROM (SELECT unnest(certificaciones) c FROM {t})),
                        count(DISTINCT pais), count(DISTINCT sector_principal) FROM {t}"""
        got = con.execute(cov.format(t="src")).fetchone()
        full = con.execute(cov.format(t=full_src)).fetchone()
        for name, g, f in zip(["roles", "skills", "certificaciones", "países", "sectores"], got, full):
            print(f"  cobertura {name:<16} {g}/{f}" + ("" if g == f else "  ⚠️ faltan valores"))

    pg_exec(f"TRUNCATE {', '.join(TABLES)} RESTART IDENTITY CASCADE")

    steps = {
        "empleados": """
            INSERT INTO pg.public.empleados
            SELECT employee_id, nombre, apellidos, nombre_completo, email, pais, ciudad, area, rol, nivel_seniority,
                   puesto_actual, anios_experiencia, greatest(anios_en_ntt, 0)::DECIMAL(4,1), fecha_incorporacion::DATE,
                   sector_principal, disponibilidad, modalidad_trabajo, movilidad_internacional,
                   metodologias, habilidades_blandas, skills_texto, resumen,
                   list_sort(list_distinct(list_transform(proyectos, lambda p: p.cliente_sector)))
            FROM src""",
        "empleado_skills": """
            INSERT INTO pg.public.empleado_skills
            WITH x AS (
                SELECT employee_id, unnest(skills) AS s, proyectos,
                       flatten(list_transform(experiencia, lambda e: e.tecnologias)) AS tec_exp
                FROM src
            ), y AS (
                SELECT employee_id, s, tec_exp,
                       list_filter(proyectos, lambda p: list_contains(p.tecnologias, s.skill)) AS usados
                FROM x
            )
            SELECT employee_id, s.skill, s.nivel, s.anios::FLOAT,
                   len(usados) > 0 OR list_contains(tec_exp, s.skill),
                   len(usados),
                   list_max(list_transform(usados, lambda p: p.anio))
            FROM y""",
        "proyectos": """
            INSERT INTO pg.public.proyectos (employee_id, orden, nombre, cliente_sector, anio, rol, tecnologias)
            WITH x AS (SELECT employee_id, unnest(proyectos) AS p, generate_subscripts(proyectos, 1) AS orden FROM src)
            SELECT employee_id, orden, p.nombre, p.cliente_sector, p.anio, p.rol, p.tecnologias FROM x""",
        "experiencia": """
            INSERT INTO pg.public.experiencia (employee_id, orden, empresa, puesto, inicio, fin, es_actual, ubicacion, tecnologias, es_ntt)
            WITH x AS (SELECT employee_id, unnest(experiencia) AS e, generate_subscripts(experiencia, 1) AS orden FROM src)
            SELECT employee_id, orden, e.empresa, e.puesto, e.inicio::DATE,
                   CASE WHEN e.fin = 'Actual' THEN NULL ELSE e.fin::DATE END, e.fin = 'Actual',
                   e.ubicacion, e.tecnologias, e.es_ntt
            FROM x""",
        "estudios": """
            INSERT INTO pg.public.estudios (employee_id, nivel, titulo, institucion, anio_inicio, anio_fin)
            WITH x AS (SELECT employee_id, unnest(estudios) AS d FROM src)
            SELECT employee_id, d.nivel, d.titulo, d.institucion, d.anio_inicio, d.anio_fin FROM x""",
        "certificaciones": """
            INSERT INTO pg.public.certificaciones (employee_id, nombre, anio)
            WITH x AS (SELECT employee_id, unnest(certificaciones) AS c FROM src)
            SELECT employee_id, c.nombre, c.anio FROM x""",
        "idiomas": """
            INSERT INTO pg.public.idiomas
            WITH x AS (SELECT employee_id, unnest(idiomas) AS i FROM src)
            SELECT employee_id, i.idioma, i.nivel FROM x""",
        "catalogo_skills": """
            INSERT INTO pg.public.catalogo_skills
            WITH x AS (SELECT area, unnest(skills).skill AS skill FROM src)
            SELECT skill, count(*), mode(area) FROM x GROUP BY skill""",
    }
    for table, sql in steps.items():
        t0 = time.time()
        con.execute(sql)
        n = con.execute(f"SELECT count(*) FROM pg.public.{table}").fetchone()[0]
        print(f"  {table:<16} {n:>10,} filas  ({time.time() - t0:.1f} s)")

    pg_exec("ANALYZE")
    with psycopg.connect(args.db) as c:
        size = c.execute("select pg_size_pretty(pg_database_size(current_database()))").fetchone()[0]
    print(f"Listo. Tamaño de la base de datos: {size}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # nunca imprimir la cadena de conexión con la contraseña
        sys.exit(f"Error: {redact(str(e))}")

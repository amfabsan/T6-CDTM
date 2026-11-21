"""Calcula los embeddings de la búsqueda híbrida (paso 6) y los guarda en Postgres/Supabase.

- skill_embeddings: las 614 skills de catalogo_skills.
- rol_embeddings: los 87 roles de empleados.rol.
- perfil_busqueda.embedding: un vector por perfil, a partir de perfil_busqueda.texto (lo genera refrescar_busqueda()).

Modelo local multilingüe: sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 (384 dim, ONNX con fastembed).
No usa ninguna API ni clave: se ejecuta una vez tras cada carga. En ejecución, el vector de la consulta es la media
de skill_embeddings/rol_embeddings, así que la app nunca tiene que ejecutar el modelo.

Uso:
    .\\.venv\\Scripts\\pip install fastembed duckdb "psycopg[binary]"
    $env:DATABASE_URL = "postgresql://postgres.<ref>:<PASSWORD>@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
    .\\.venv\\Scripts\\python -X utf8 scripts\\build_embeddings.py           # solo lo que falte
    .\\.venv\\Scripts\\python -X utf8 scripts\\build_embeddings.py --todo    # recalcula todo
"""
import argparse
import os
import re
import sys
import time

import psycopg
from fastembed import TextEmbedding

MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
BATCH = 256


def redact(text: str) -> str:
    return re.sub(r"(postgres(?:ql)?://[^:/@\s]+:)[^@\s]+@", r"\1****@", text)


def vec_literal(v) -> str:
    return "[" + ",".join(f"{x:.6f}" for x in v) + "]"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--db", default=os.environ.get("DATABASE_URL"))
    ap.add_argument("--todo", action="store_true", help="recalcula también los que ya tienen embedding")
    args = ap.parse_args()
    if not args.db:
        sys.exit("Falta la conexión: usa --db o define DATABASE_URL.")

    model = TextEmbedding(MODEL)
    embed = lambda texts: list(model.embed(texts, batch_size=BATCH))

    with psycopg.connect(args.db) as c:
        c.execute("set search_path = public, extensions")  # en Supabase pgvector vive en el esquema extensions
        if c.execute("select count(*) from perfil_busqueda").fetchone()[0] == 0:
            c.execute("select refrescar_busqueda()")

        # Skills y roles: pocos, se recalculan siempre (son la "consulta").
        for table, col, src in [("skill_embeddings", "skill", "select skill from catalogo_skills order by skill"),
                                ("rol_embeddings", "rol", "select distinct rol from empleados order by rol")]:
            names = [r[0] for r in c.execute(src).fetchall()]
            vecs = embed(names)
            with c.cursor() as cur:
                cur.executemany(
                    f"insert into {table} ({col}, embedding) values (%s, %s::vector) "
                    f"on conflict ({col}) do update set embedding = excluded.embedding",
                    [(n, vec_literal(v)) for n, v in zip(names, vecs)])
            c.commit()
            print(f"  {table:<18} {len(names):>7,}")

        where = "" if args.todo else "where embedding is null"
        rows = c.execute(f"select employee_id, texto from perfil_busqueda {where} order by employee_id").fetchall()
        print(f"  perfiles a embeber {len(rows):>7,}")
        t0 = time.time()
        for i in range(0, len(rows), 2000):
            chunk = rows[i:i + 2000]
            vecs = embed([t for _, t in chunk])
            with c.cursor() as cur:
                cur.executemany("update perfil_busqueda set embedding = %s::vector where employee_id = %s",
                                [(vec_literal(v), eid) for (eid, _), v in zip(chunk, vecs)])
            c.commit()
            print(f"    {i + len(chunk):>7,} / {len(rows):,}  ({time.time() - t0:.0f} s)")
        c.execute("analyze perfil_busqueda")
    print("Listo.")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        sys.exit(f"Error: {redact(str(e))}")

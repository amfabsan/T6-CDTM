"""Comprueba y, si se pide, aplica SOLO las migraciones 005-007 en Supabase (sin tocar los datos).

    .venv/bin/python scripts/migrate.py              # solo comprueba (no escribe nada)
    .venv/bin/python scripts/migrate.py --apply      # aplica las que falten, cada una en su transacción

Lee DATABASE_URL del entorno (cadena del Session pooler de Supabase). No la imprime.
"""
import argparse, os, pathlib, re, sys
import psycopg

ROOT = pathlib.Path(__file__).resolve().parents[1]
MIG = ROOT / "supabase" / "migrations"

CHECKS = {
    "005_costes_por_hora": [
        ("scenario_assumptions.rates_by_seniority", "select 1 from information_schema.columns where table_name='scenario_assumptions' and column_name='rates_by_seniority'"),
        ("scenario_assumptions.hours_per_person", "select 1 from information_schema.columns where table_name='scenario_assumptions' and column_name='hours_per_person'"),
        ("scenario_assumptions.rolloff_days", "select 1 from information_schema.columns where table_name='scenario_assumptions' and column_name='rolloff_days'"),
    ],
    "006_requisitos_confirmados": [
        ("project_requirements.status", "select 1 from information_schema.columns where table_name='project_requirements' and column_name='status'"),
        ("project_requirements.reviewed_by", "select 1 from information_schema.columns where table_name='project_requirements' and column_name='reviewed_by'"),
        ("función confirmar_requisitos()", "select 1 from pg_proc where proname='confirmar_requisitos'"),
        ("trigger nace_borrador", "select 1 from pg_trigger where tgname='project_requirements_nace_borrador'"),
    ],
    "007_recuperacion_exacta": [
        ("función skills_afines()", "select 1 from pg_proc where proname='skills_afines'"),
        ("buscar_candidatos(p_max_exactos)", "select 1 from pg_proc where proname='buscar_candidatos' and 'p_max_exactos' = any(proargnames)"),
    ],
}


def redact(t: str) -> str:
    return re.sub(r"(postgres(?:ql)?://[^:/@\s]+:)[^@\s]+@", r"\1****@", t)


def status(c) -> dict[str, list[tuple[str, bool]]]:
    c.execute("set search_path = public, extensions")
    return {m: [(name, c.execute(sql).fetchone() is not None) for name, sql in checks] for m, checks in CHECKS.items()}


def show(st) -> list[str]:
    missing = []
    for m, items in st.items():
        ok = all(v for _, v in items)
        print(f"{'✅' if ok else '❌'} {m}")
        for name, v in items:
            print(f"     {'✓' if v else '✗'} {name}")
        if not ok:
            missing.append(m)
    return missing


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()
    db = os.environ.get("DATABASE_URL")
    if not db:
        sys.exit("Falta DATABASE_URL en el entorno (o en .env).")
    with psycopg.connect(db, autocommit=False) as c:
        missing = show(status(c))
        c.rollback()
        if not missing:
            print("Todas activas."); return
        if not args.apply:
            print(f"Faltan: {', '.join(missing)}. Ejecuta con --apply para aplicarlas."); return
        for m in missing:
            sql = (MIG / f"{m}.sql").read_text(encoding="utf-8")
            print(f"Aplicando {m}…")
            c.execute(sql)
            c.commit()
        print("\nDespués de aplicar:")
        if show(status(c)):
            sys.exit("Siguen faltando cosas: revisa el error de arriba.")
        print("Todas activas.")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        sys.exit(f"Error: {redact(str(e))}")

"""Pasos 5-10 sobre los 34.003 disponibles del Parquet, sin base de datos.
Paso 5 = solo «no Asignado» (como 004_filtros_minimos). Paso 6 APROXIMADO: en vez de la búsqueda híbrida
(full-text + embeddings + RRF, que vive en Supabase) se ordena por coincidencia con las skills y roles pedidos
y se cogen 200 por rol. Pasos 7-10: matching/ real.
    .venv/bin/python scripts/e2e/run_matching.py <outdir>
"""
import json, pathlib, sys, time
import pyarrow.compute as pc, pyarrow.parquet as pq
ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from matching.contract import from_llm_plan
from matching.pipeline import run_matching

out = pathlib.Path(sys.argv[1])
t0 = time.time()
tbl = pq.read_table(ROOT / "data/profiles.parquet")
avail = tbl.filter(pc.not_equal(tbl["disponibilidad"], "Asignado")).to_pylist()
print(f"disponibles: {len(avail):,} ({time.time() - t0:.0f} s)")

def retrieve(role, k=200):
    must = {n for n, _ in role.mandatory}; nice = set(role.desirable); roles = set(role.roles)
    def rel(p):
        sk = {s["skill"] for s in p["skills"]}
        return 2 * len(sk & must) + len(sk & nice) + (2 if p["rol"] in roles else 0)
    ranked = sorted(((rel(p), p["employee_id"], p) for p in avail), key=lambda x: (-x[0], x[1]))
    return [p for r, _, p in ranked[:k] if r > 0]

briefs = json.loads((pathlib.Path(__file__).parent / "briefs.json").read_text(encoding="utf-8"))
for b in briefs:
    plan = json.loads((out / f"plan_{b['id']}.json").read_text(encoding="utf-8"))
    _, roles = from_llm_plan(plan)
    cands = {r.role: retrieve(r) for r in roles}
    res = run_matching(plan, cands)
    res["plan"] = plan
    (out / f"match_{b['id']}.json").write_text(json.dumps(res, ensure_ascii=False, default=str), encoding="utf-8")
    print(f"{b['id']}: {[f'{r.role}×{r.count}' for r in roles]} · equipos {res['teams_total']}")

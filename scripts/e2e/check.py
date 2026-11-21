"""Comprueba lo que pide cada brief de prueba de NTT DATA sobre la salida de los pasos 2 y 7-10."""
import json, pathlib, sys
out = pathlib.Path(sys.argv[1])
by_id = {}
import pyarrow.parquet as pq
ROOT = pathlib.Path(__file__).resolve().parents[2]
t = pq.read_table(ROOT / "data/profiles.parquet", columns=["employee_id", "anios_experiencia", "disponibilidad", "sectores_proyectos"] if False else ["employee_id", "anios_experiencia", "disponibilidad", "proyectos"]).to_pylist()
P = {r["employee_id"]: r for r in t}
def banca(eid): return any(x["cliente_sector"] == "Banca y Finanzas" for x in P[eid]["proyectos"])
rep = {}
for name in ["core_banking", "retail_ia", "ciberseguridad_publico"]:
    m = json.loads((out / f"match_{name}.json").read_text(encoding="utf-8"))
    req = m["plan"]["requirements"]; roles = req["roles"]
    top = m["top_teams"]["items"]
    r = {"roles": [(x["title"], x["count"], [s["name"] for s in x["mandatory_skills"]], [s["name"] for s in x["desirable_skills"]],
                    x.get("sector_experience"), x.get("sector_required"), x.get("min_years_experience")) for x in roles],
         "project": req["project"], "teams_total": m["teams_total"],
         "nadie_repetido_en_un_equipo": all(len({mm["employee_id"] for mm in t["members"]}) == len(t["members"]) for t in m["teams"])}
    items = [c for v in m["ranking"].values() for c in v["items"]]
    if name == "core_banking":
        r["top_ranking_con_proyectos_de_banca"] = f"{sum(banca(c['employee_id']) for c in items)}/{len(items)}"
        r["sector_detectado"] = [x.get("sector_experience") for x in roles]
    if name == "retail_ia":
        r["excluidos_por_retail"] = sum("retail" in " ".join(e["reasons"]).lower() for v in m["excluded"].values() for e in v)
        r["top_sin_proyectos_retail"] = f"{sum(not any(x['cliente_sector']=='Retail y Consumo' for x in P[c['employee_id']]['proyectos']) for c in items)}/{len(items)}"
    if name == "ciberseguridad_publico":
        r["min_years_pedido"] = [x.get("min_years_experience") for x in roles]
        r["top_ranking_con_menos_de_3_anios"] = [c["employee_id"] for c in items if P[c["employee_id"]]["anios_experiencia"] < 3]
        r["top_ranking_en_rolloff"] = [c["employee_id"] for c in items if P[c["employee_id"]]["disponibilidad"] != "En banca"]
        mem = [mm["employee_id"] for t in top for mm in t["members"]]
        r["top5_equipos_miembros_que_violan"] = sorted({e for e in mem if P[e]["anios_experiencia"] < 3 or P[e]["disponibilidad"] != "En banca"})
    rep[name] = r
print(json.dumps(rep, ensure_ascii=False, indent=1, default=str))

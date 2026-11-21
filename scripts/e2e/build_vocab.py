"""Vocabulario del paso 2 (lo mismo que la RPC vocabulario_orbit) sacado del Parquet, sin base de datos."""
import json, pathlib, sys
import pyarrow.parquet as pq
ROOT = pathlib.Path(__file__).resolve().parents[2]
t = pq.read_table(ROOT / "data/profiles.parquet", columns=["rol", "pais", "ciudad", "sector_principal"]).to_pydict()
v = json.loads((ROOT / "data/sample/vocabulario.json").read_text(encoding="utf-8"))
vocab = {
    "skills": sorted(s["skill"] for s in v["skills"]),
    "roles": sorted(set(t["rol"])),
    "sectores": sorted(set(t["sector_principal"])),
    "certificaciones": sorted(c["nombre"] for c in v["certificaciones"]),
    "idiomas": v["idiomas"], "paises": sorted(set(t["pais"])), "ciudades": sorted(set(t["ciudad"])),
    "niveles_idioma": ["A1", "A2", "B1", "B2", "C1", "C2", "Nativo"],
    "seniorities": ["Trainee", "Junior", "Mid", "Senior", "Lead", "Principal"],
    "modalidades": ["remoto", "hibrido", "presencial"],
}
out = pathlib.Path(sys.argv[1]); out.write_text(json.dumps(vocab, ensure_ascii=False))
print({k: len(x) for k, x in vocab.items()})

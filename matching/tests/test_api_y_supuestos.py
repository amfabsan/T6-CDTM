"""Supuestos por defecto, plazas con el mismo título y servicio HTTP (sin red: Supabase simulado)."""
import json
import pathlib
import unittest

from fastapi.testclient import TestClient

from matching.api import app, match_project
from matching.contract import from_llm_plan
from matching.pipeline import run_matching

ROOT = pathlib.Path(__file__).resolve().parents[2]
SAMPLE = json.loads((ROOT / "data" / "sample" / "profiles_sample.json").read_text(encoding="utf-8"))
REQ = {"project": {"client_sector": "Banca y Finanzas", "country": "España", "modality": "remoto", "country_required": False,
                   "start_date": "2026-12-01"},
       "roles": [{"title": "Backend", "count": 1, "matching_roles": ["Backend Developer .NET"],
                  "mandatory_skills": [{"name": "C#", "min_level": 3}, {"name": ".NET", "min_level": 3}], "desirable_skills": [],
                  "languages": [], "certifications": [], "certification_options": []},
                 {"title": "Backend", "count": 1, "matching_roles": ["Backend Developer Java"],
                  "mandatory_skills": [{"name": "Java", "min_level": 3}], "desirable_skills": [],
                  "languages": [], "certifications": [], "certification_options": []}]}


class Supuestos(unittest.TestCase):
    def test_titulos_duplicados_se_desambiguan(self):
        _, roles = from_llm_plan(REQ)
        self.assertEqual([r.role for r in roles], ["Backend", "Backend (2)"])

    def test_supuestos_por_defecto_marcados(self):
        out = run_matching(REQ, {"Backend": SAMPLE, "Backend (2)": SAMPLE})
        self.assertTrue(out["assumptions"]["is_illustrative"])
        t = out["top_teams"]["items"][0]
        self.assertEqual(t["cost"]["status"], "supuesto")  # tarifa por seniority × 160 h
        self.assertIsNotNone(t["cost"]["value"])
        rolloff = [m for tt in out["teams"] for m in tt["members"] if m["disponibilidad"] != "En banca"]
        if rolloff:  # Roll-off sin fecha -> inicio + 45 días, supuesto
            self.assertEqual(rolloff[0]["available_on"], "2027-01-15")
        sin = run_matching(REQ, {"Backend": SAMPLE, "Backend (2)": SAMPLE}, rate_per_hour=None, hours_per_person=None, rolloff_days=None)
        self.assertEqual(sin["top_teams"]["items"][0]["cost"]["status"], "por estimar")


class Api(unittest.TestCase):
    def test_match_project_con_supabase_simulado(self):
        ids = [p["employee_id"] for p in SAMPLE[:20]]
        calls = []

        def fake(path, body):
            calls.append(path)
            if path.startswith("project_requirements"):
                return [{"id": "p1", "country": "España", "modality": "remoto", "country_required": False,
                         "project_start_date": "2026-12-01", "client_sector": "Banca y Finanzas", "roles": REQ["roles"]}]
            if path == "rpc/candidatos_proyecto":
                return [{"role_index": i, "title": "Backend", "count": 1, "n_filtrados": 20,
                         "candidates": [{"employee_id": e, "rrf": 0.1, "pos_texto": 1, "pos_vector": 1} for e in ids]} for i in (0, 1)]
            if path == "rpc/perfiles":
                return [p for p in SAMPLE if p["employee_id"] in body["p_ids"]]
            raise AssertionError(path)

        out = match_project("p1", {"top": 3}, fetch=fake)
        self.assertEqual(calls, ["project_requirements?id=eq.p1&select=*", "rpc/candidatos_proyecto", "rpc/perfiles"])
        self.assertEqual(set(out["ranking"]), {"Backend", "Backend (2)"})
        self.assertEqual(out["n_filtrados"], {"Backend": 20})
        json.dumps(out)

    def test_endpoints(self):
        c = TestClient(app)
        self.assertEqual(c.get("/health").json(), {"ok": True})
        r = c.post("/match/direct", json={"requirements": REQ, "candidates_by_role": {"Backend": SAMPLE[:10]}, "options": {"top": 2}})
        self.assertEqual(r.status_code, 200)
        self.assertLessEqual(len(r.json()["ranking"]["Backend"]["items"]), 2)
        self.assertEqual(c.post("/match/direct", json={"requirements": REQ, "candidates_by_role": {}, "options": {"x": 1}}).status_code, 422)


if __name__ == "__main__":
    unittest.main()

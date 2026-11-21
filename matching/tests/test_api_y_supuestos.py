"""Supuestos por defecto, plazas con el mismo título y servicio HTTP (sin red: Supabase simulado)."""
import json
import os
import pathlib
import unittest
from unittest.mock import patch

from fastapi import HTTPException
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
    def fake_supabase(self, status, calls):
        ids = [p["employee_id"] for p in SAMPLE[:20]]

        def fake(path, body):
            calls.append(path)
            if path.startswith("project_requirements"):
                return [{"id": "p1", "status": status, "country": "España", "modality": "remoto", "country_required": False,
                         "project_start_date": "2026-12-01", "client_sector": "Banca y Finanzas", "roles": REQ["roles"]}]
            if path == "rpc/candidatos_proyecto":
                return [{"role_index": i, "title": "Backend", "count": 1, "n_filtrados": 20,
                         "candidates": [{"employee_id": e, "rrf": 0.1, "pos_texto": 1, "pos_vector": 1} for e in ids]} for i in (0, 1)]
            if path == "rpc/perfiles":
                return [p for p in SAMPLE if p["employee_id"] in body["p_ids"]]
            if path.startswith("scenario_assumptions"):
                return [{"rates_by_seniority": {"Junior": 1, "Mid": 1, "Senior": 1, "Lead": 1, "Principal": 1, "Trainee": 1},
                         "hours_per_person": 10, "rolloff_days": None}]
            if path == "rpc/skills_afines":
                self.assertEqual(body["p_skills"], [".NET", "C#", "Java"])
                return [{"skill": "C#", "afin": ".NET", "sim": 0.82}]
            raise AssertionError(path)
        return fake

    def test_match_project_confirmado(self):
        calls = []
        out = match_project("p1", {"top": 3}, fetch=self.fake_supabase("confirmado", calls))
        self.assertEqual(calls, ["project_requirements?id=eq.p1&select=*", "rpc/candidatos_proyecto", "rpc/perfiles",
                                 "rpc/skills_afines", "scenario_assumptions?project_id=eq.p1&select=*&order=created_at.desc&limit=1"])
        self.assertEqual(set(out["ranking"]), {"Backend", "Backend (2)"})
        # Supuestos de scenario_assumptions (005): 1 €/h × 10 h por persona; rolloff_days nulo → el de por defecto.
        self.assertEqual((out["assumptions"]["hours_per_person"], out["assumptions"]["rolloff_days"]), (10, 45))
        self.assertEqual(out["assumptions"]["rate_per_hour"]["Senior"], 1)
        for t in out["teams"]:
            self.assertEqual(t["cost"]["value"], 10 * len(t["members"]))
        self.assertEqual(out["n_filtrados"], {"Backend": 20})
        json.dumps(out)

    def test_match_project_sin_revisar_no_filtra_ni_puntua(self):
        for status in ("borrador", None):
            calls = []
            with self.assertRaises(HTTPException) as e:
                match_project("p1", {}, fetch=self.fake_supabase(status, calls))
            self.assertEqual(e.exception.status_code, 409)
            self.assertEqual(calls, ["project_requirements?id=eq.p1&select=*"])  # no llega a pedir candidatos

    def test_endpoints(self):
        c = TestClient(app)
        self.assertEqual(c.get("/health").json(), {"ok": True})
        body = {"requirements": REQ, "candidates_by_role": {"Backend": SAMPLE[:10]}, "options": {"top": 2}}
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("ORBIT_ALLOW_DIRECT", None)
            self.assertEqual(c.post("/match/direct", json=body).status_code, 403)  # se salta la revisión: desactivado
        with patch.dict(os.environ, {"ORBIT_ALLOW_DIRECT": "1"}):
            r = c.post("/match/direct", json=body)
            self.assertEqual(r.status_code, 200)
            self.assertLessEqual(len(r.json()["ranking"]["Backend"]["items"]), 2)
            self.assertEqual(c.post("/match/direct", json={**body, "options": {"x": 1}}).status_code, 422)


if __name__ == "__main__":
    unittest.main()

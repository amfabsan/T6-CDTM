"""python -m unittest discover -s matching/tests -t .      (desde la raíz del repo, solo stdlib)"""
import json
import pathlib
import unittest

from matching.contract import from_llm_plan, normalize_profile
from matching.pipeline import run_matching
from matching.scoring import confidence, eligibility_reasons, hard_filter_reasons, rank_role, score_candidate
from matching.teams import build_teams, score_teams, top_teams

ROOT = pathlib.Path(__file__).resolve().parents[2]
FIX = ROOT / "matching" / "fixtures"
load = lambda p: json.loads(p.read_text(encoding="utf-8"))

PLAN = load(FIX / "plan_banco_pagos.json")
PROJECT, ROLES = from_llm_plan(PLAN)
BACKEND = ROLES[1]
BASE = {
    "employee_id": "NTT1", "nombre_completo": "A", "rol": "Backend Developer Java", "nivel_seniority": "Senior", "anios_experiencia": 8,
    "sector_principal": "Seguros", "disponibilidad": "En banca", "pais": "España", "ciudad": "Madrid", "modalidad_trabajo": "Remoto",
    "movilidad_internacional": False, "sectores_proyectos": ["Banca y Finanzas"],
    "skills": [
        {"skill": "REST APIs", "nivel": 4, "anios": 6, "demostrada": True, "n_proyectos": 2, "ultimo_anio": 2026},
        {"skill": "Microservicios", "nivel": 3, "anios": 4, "demostrada": True, "n_proyectos": 2, "ultimo_anio": 2025},
        {"skill": "Kubernetes", "nivel": 1, "anios": 5, "demostrada": False, "n_proyectos": 0, "ultimo_anio": None},
    ],
    "proyectos": [{"nombre": "Pasarela de pagos", "cliente_sector": "Banca y Finanzas", "anio": 2026, "rol": "Dev",
                   "tecnologias": ["REST APIs", "Microservicios"]}],
    "certificaciones": [], "idiomas": [{"idioma": "Inglés", "nivel": "C1"}],
}


def mk(eid, role, score):
    return {"employee_id": eid, "role": role, "score": score, "gaps": [], "disponibilidad": "En banca", "nivel_seniority": "Senior"}


class Pasos7a9(unittest.TestCase):
    def test_contrato(self):
        self.assertEqual(BACKEND.sectors, ["Banca y Finanzas"])
        _, rs = from_llm_plan({"project": {}, "roles": [{"title": "x", "count": 1, "mandatory_skills": [{"name": "SQL"}]}]})
        self.assertEqual(rs[0].mandatory, [("SQL", 3)])

    def test_score_alto_con_evidencia_e_incoherencia(self):
        s = score_candidate(BASE, BACKEND, PROJECT)
        self.assertEqual(s["breakdown"]["mandatory"]["value"], 1)
        self.assertEqual(s["gaps"], [])
        self.assertTrue(any(r.startswith("Kubernetes: nivel 1") for r in s["risks"]))
        self.assertEqual(s["evidence"][0]["proyecto"], "Pasarela de pagos")
        self.assertTrue(80 < s["score"] < 100, s["score"])
        self.assertEqual(sum(b["weight"] for b in s["breakdown"].values()), 100)

    def test_obligatoria_ausente_es_gap_no_descarte(self):
        s = score_candidate({**BASE, "skills": BASE["skills"][2:]}, BACKEND, PROJECT)
        self.assertEqual(s["breakdown"]["mandatory"]["value"], 0)
        self.assertIn("Falta obligatoria: REST APIs", s["gaps"])
        self.assertLess(s["score"], 60)

    def test_modalidad_remota(self):
        p = {**BASE, "modalidad_trabajo": "Presencial", "pais": "México"}
        s = score_candidate(p, BACKEND, PROJECT)
        self.assertIn("Prefiere presencial (proyecto remoto)", s["risks"])
        self.assertTrue(any(r.startswith("Reside en México") for r in s["risks"]))
        PROJECT.country_required = True
        try:
            self.assertIn("Fuera del país exigido (España)", score_candidate(p, BACKEND, PROJECT)["gaps"])
        finally:
            PROJECT.country_required = False

    def test_confianza(self):
        self.assertEqual(confidence(BASE["skills"][0]), 1)
        self.assertAlmostEqual(confidence(BASE["skills"][2]), 0.42)

    def test_elegibilidad_por_score_y_filtros_por_defecto(self):
        p = {**BASE, "anios_experiencia": 1, "nivel_seniority": "Junior", "idiomas": []}
        req = from_llm_plan({"project": {}, "roles": [{"title": "B", "count": 1, "min_years": 5, "seniority_min": "Senior",
                             "languages": [{"name": "Inglés", "level": "B2"}], "mandatory_skills": [{"name": "REST APIs"}]}]})[1][0]
        self.assertEqual(hard_filter_reasons(p, req, PROJECT), [])  # años, seniority e idioma no excluyen por defecto
        s = score_candidate(p, req, PROJECT)
        self.assertTrue({"1 años < 5", "Seniority Junior < Senior", "Inglés por debajo de B2"} <= set(s["gaps"]))
        self.assertEqual(eligibility_reasons(s), [])
        self.assertEqual(hard_filter_reasons({**p, "disponibilidad": "Asignado"}, req, PROJECT), ["Asignado (no disponible)"])
        nada = score_candidate({**BASE, "skills": []}, req, PROJECT)
        self.assertIn("Ninguna skill pedida", eligibility_reasons(nada))
        out = run_matching(PLAN, {"Backend": [{**BASE, "skills": []}, BASE]})
        self.assertEqual([x["employee_id"] for x in out["ranking"]["Backend"]["items"]], ["NTT1"])
        self.assertEqual(out["excluded"]["Backend"][0]["reasons"], ["Ninguna skill pedida"])

    def test_ranking(self):
        r = rank_role([mk(i, "x", sc) for i, sc in [("a", 70), ("b", 90), ("c", 85), ("d", 79)]], top=2, min_score=80)
        self.assertEqual(r["cumplen"], 2)
        self.assertEqual([x["employee_id"] for x in r["items"]], ["b", "c"])

    def test_equipos_sin_repeticion_y_beam(self):
        pools = {"Arq": [mk("x", "Arq", 90), mk("y", "Arq", 80)],
                 "Back": [mk("x", "Back", 95), mk("b1", "Back", 70), mk("b2", "Back", 60), mk("b3", "Back", 50)]}
        slots = [{"role": "Arq", "count": 1}, {"role": "Back", "count": 2}]
        allt = build_teams(slots, pools)
        self.assertEqual(len(allt), 9)  # 2×C(4,2)=12 menos 3 con «x» en dos plazas
        for t in allt:
            self.assertEqual(len({m["employee_id"] for m in t}), 3)
        keys = [",".join(sorted(m["employee_id"] for m in t)) for t in allt]
        self.assertEqual(len(set(keys)), len(keys))
        beam = build_teams(slots, pools, max_exhaustive=1, beam=2)
        self.assertEqual([m["employee_id"] for m in beam[0]], ["y", "x", "b1"])
        self.assertEqual(len(beam), 2)

    def test_e2e_muestra_real(self):
        sample = load(ROOT / "data" / "sample" / "profiles_sample.json")
        out = run_matching(PLAN, {r.role: sample for r in ROLES})
        self.assertTrue(all(any("Asignado (no disponible)" in x["reasons"] for x in xs) for xs in out["excluded"].values()))
        self.assertTrue(out["teams"])
        for t in out["teams"]:
            self.assertEqual(len({m["employee_id"] for m in t["members"]}), 4)
        self.assertLessEqual(len(out["top_teams"]["items"]), 5)
        self.assertTrue(all(isinstance(s["demostrada"], bool) for s in normalize_profile(sample[0])["skills"]))
        json.dumps(out)  # la salida es serializable


# ───────────── Caso de demo del pitch (docs/ORBIT_AI_Caso_Demo_Pitch.md §5) ─────────────
# fixture_match sustituye al score del paso 7, como pide el caso, para obtener salidas reproducibles.
CASO = load(FIX / "caso_demo_core_bancario.json")
DPROJ, DROLES = from_llm_plan(load(FIX / "plan_core_bancario_azure.json"))
DSLOTS = [{"role": r.role, "count": r.count, "hours": r.planned_hours} for r in DROLES]


# El caso pide que los años mínimos excluyan (X2): se activa ese filtro solo aquí. Por defecto solo excluye «Asignado».
CASO_STRICT = ("disponibilidad", "min_years")


def demo(overrides=None, strict=CASO_STRICT):
    overrides = overrides or {}
    eligible, excluded = {}, []
    for r in DROLES:
        eligible[r.role] = []
        for x in (p for p in CASO["profiles"] if p["candidate_role"] == r.role):
            prof = {"employee_id": x["id"], "nivel_seniority": "Senior", "anios_experiencia": x["total_years"],
                    "disponibilidad": "Asignado" if x["availability"] == "asignado" else "En banca",
                    "pais": "España", "idiomas": [], "certificaciones": []}
            if hard_filter_reasons(prof, r, DPROJ, strict):
                excluded.append(x["id"])
                continue
            eligible[r.role].append({"employee_id": x["id"], "nombre_completo": x["name"], "role": r.role, "score": x["fixture_match"],
                                     "gaps": [], "disponibilidad": prof["disponibilidad"], "nivel_seniority": "Senior",
                                     "available_on": overrides.get(x["id"], x["available_on"]), "cost_per_hour": x["cost_per_hour"]})
    return eligible, excluded, score_teams(build_teams(DSLOTS, eligible), DSLOTS, eligible, DPROJ)


ids = lambda r: [t["id"] for t in r["items"]]


class CasoDemo(unittest.TestCase):
    def test_elegibles_y_equipos(self):
        eligible, excluded, teams = demo()
        self.assertEqual(sorted(excluded), ["X1", "X2"])
        self.assertEqual(sum(map(len, eligible.values())), 9)
        self.assertEqual(len(teams), 27)

    def test_por_defecto_X2_es_elegible_con_gap_y_solo_X1_excluido(self):
        eligible, excluded, teams = demo(strict=("disponibilidad",))
        self.assertEqual(excluded, ["X1"])
        self.assertIn("X2", [c["employee_id"] for c in eligible["BACK"]])
        self.assertEqual(len(teams), 36)

    def test_ranking_backend_top3_min90(self):
        r = rank_role(demo()[0]["BACK"], top=3, min_score=90)
        self.assertEqual([(x["employee_id"], x["score"]) for x in r["items"]], [("B1", 96), ("B2", 91)])

    def test_top5_por_cada_orden(self):
        teams = demo()[2]
        self.assertEqual(ids(top_teams(teams, "fit")), ["A1+B1+S1", "A1+B2+S1", "A2+B1+S1", "A1+B1+S2", "A2+B2+S1"])
        self.assertEqual(ids(top_teams(teams, "cost")), ["A3+B3+S3", "A3+B2+S3", "A3+B1+S3", "A3+B3+S2", "A3+B2+S2"])
        self.assertEqual(ids(top_teams(teams, "start")), ["A1+B1+S2", "A1+B3+S2", "A1+B1+S1", "A1+B2+S1", "A1+B3+S1"])
        self.assertEqual(ids(top_teams(teams, "risk")), ["A2+B1+S1", "A2+B2+S1", "A3+B1+S1", "A1+B1+S3", "A2+B1+S2"])

    def test_metricas_de_la_tabla(self):
        t = {x["id"]: x for x in demo()[2]}
        row = lambda i: (f"{t[i]['fit']:.2f}", t[i]["cost"]["value"], t[i]["start"]["date"],
                         f"{t[i]['continuity']['covered']}/{t[i]['continuity']['total']}")
        self.assertEqual(row("A1+B1+S1"), ("98.33", 11800, "2026-11-24", "2/3"))
        self.assertEqual(row("A3+B3+S3"), ("86.00", 7800, "2026-11-26", "3/3"))
        self.assertEqual(row("A1+B1+S2"), ("95.33", 10800, "2026-11-23", "2/3"))
        self.assertEqual(row("A2+B1+S1"), ("96.67", 11000, "2026-11-25", "3/3"))

    def test_filtros_inclusivos(self):
        self.assertEqual(ids(top_teams(demo()[2], min_fit=96, max_cost=11000)), ["A2+B1+S1"])

    def test_baja_de_A1(self):
        w = next(x for x in demo()[2] if x["id"] == "A1+B1+S1")["continuity"]["worst"]
        self.assertEqual((w["employee_id"], w["role"], w["substitute"], w["late_substitute"]),
                         ("A1", "ARQ", None, {"employee_id": "A2", "available_on": "2026-11-25"}))

    def test_adelantar_A2(self):
        teams = demo({"A2": "2026-11-24"})[2]
        self.assertEqual(next(x for x in teams if x["id"] == "A1+B1+S1")["continuity"]["covered"], 3)
        self.assertEqual(top_teams(teams, "risk")["items"][0]["id"], "A1+B1+S1")

    def test_misma_persona_en_dos_roles(self):
        eligible = demo()[0]
        eligible["SEG"] = eligible["SEG"] + [{**eligible["ARQ"][0], "role": "SEG"}]  # A1 también candidata de Seguridad
        teams = score_teams(build_teams(DSLOTS, eligible), DSLOTS, eligible, DPROJ)
        for t in teams:
            self.assertEqual(len({m["employee_id"] for m in t["members"]}), 3)
            s = t["continuity"]["worst"]["substitute"]
            self.assertFalse(s and any(m["employee_id"] == s for m in t["members"]))


if __name__ == "__main__":
    unittest.main()

"""Pasos 7-10 en una llamada.

Entrada: el plan (salida del LLM, paso 2) y, por rol, los perfiles candidatos que devuelven los pasos 5-6
(filtros duros + búsqueda híbrida en SQL). Sin LLM ni base de datos: puro y testeable.
"""
from __future__ import annotations

from .contract import from_llm_plan, normalize_profile
from .scoring import WEIGHTS, hard_filter_reasons, rank_role, score_candidate
from .teams import build_teams, score_teams, top_teams


def run_matching(plan: dict, candidates_by_role: dict[str, list[dict]], *, weights: dict = WEIGHTS, ref_year: int = 2026,
                 top: int = 5, min_score: float = 0, pool_size: int = 10, beam: int = 500, max_exhaustive: int = 20000,
                 hours_per_person: float | None = None, rate_per_hour: float | dict | None = None,
                 sort_by: str = "fit", team_filters: dict | None = None, top_n_teams: int = 5) -> dict:
    project, roles = from_llm_plan(plan)
    eligible, excluded = {}, {}
    for r in roles:
        eligible[r.role], excluded[r.role] = [], []
        for raw in candidates_by_role.get(r.role, []):
            p = normalize_profile(raw)
            reasons = hard_filter_reasons(p, r, project)
            if reasons:
                excluded[r.role].append({"employee_id": p["employee_id"], "reasons": reasons})
            else:
                eligible[r.role].append(score_candidate(p, r, project, ref_year, weights))
    slots = [{"role": r.role, "count": r.count, "hours": r.planned_hours} for r in roles]
    combos = build_teams(slots, eligible, pool_size=pool_size, beam=beam, max_exhaustive=max_exhaustive)
    teams = score_teams(combos, slots, eligible, project, hours_per_person, rate_per_hour)
    shown = top_teams(teams, sort_by=sort_by, top=top_n_teams, **(team_filters or {}))
    by_key = {(c["role"], c["employee_id"]): c for cs in eligible.values() for c in cs}
    shown_keys = dict.fromkeys((m["role"], m["employee_id"]) for t in shown["items"] for m in t["members"])
    return {
        "weights": weights,
        "ranking": {r.role: rank_role(eligible[r.role], top=top, min_score=min_score) for r in roles},
        "excluded": excluded,
        "teams_total": len(teams),
        "top_teams": shown,
        # Paso 11: ficha puntuada (evidence, skills, gaps, risks) de cada integrante de los equipos mostrados,
        # aunque no esté en el Top N del ranking de su rol. Una entrada por (rol, persona).
        "members_detail": [by_key[k] for k in shown_keys if k in by_key],
        "teams": teams,  # todos los válidos: la UI reordena/filtra con top_teams()
    }

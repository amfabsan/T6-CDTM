"""Pasos 7-10 en una llamada.

Entrada: los requisitos (salida de interpret-project o fila de project_requirements) y, por rol (title), los perfiles
candidatos de los pasos 5-6: `candidates_from_rpc(supabase.rpc('candidatos_proyecto'), perfiles)`.
Sin LLM ni base de datos: puro y testeable.
"""
from __future__ import annotations

from .contract import from_llm_plan, normalize_profile
from .scoring import DEFAULT_STRICT, WEIGHTS, eligibility_reasons, hard_filter_reasons, rank_role, score_candidate
from .teams import build_teams, score_teams, top_teams


def run_matching(plan: dict, candidates_by_role: dict[str, list[dict]], *, weights: dict = WEIGHTS, ref_year: int = 2026,
                 strict=DEFAULT_STRICT, min_eligible_score: float = 0,
                 top: int = 5, min_score: float = 0, pool_size: int = 10, beam: int = 500, max_exhaustive: int = 20000,
                 hours_per_person: float | None = None, rate_per_hour: float | dict | None = None,
                 sort_by: str = "fit", team_filters: dict | None = None, top_n_teams: int = 5) -> dict:
    """Elegible = pasa los filtros de `strict` (por defecto solo «no Asignado») y score > min_eligible_score con
    al menos una skill pedida. Los excluidos quedan anotados con su motivo y su score, nunca desaparecen."""
    project, roles = from_llm_plan(plan)
    eligible, excluded = {}, {}
    for r in roles:
        eligible[r.role], excluded[r.role] = [], []
        for raw in candidates_by_role.get(r.role, []):
            p = normalize_profile(raw)
            s = score_candidate(p, r, project, ref_year, weights)
            reasons = hard_filter_reasons(p, r, project, strict) + eligibility_reasons(s, min_eligible_score)
            if reasons:
                excluded[r.role].append({"employee_id": p["employee_id"], "score": s["score"], "reasons": reasons})
            else:
                eligible[r.role].append(s)
    slots = [{"role": r.role, "count": r.count, "hours": r.planned_hours} for r in roles]
    combos = build_teams(slots, eligible, pool_size=pool_size, beam=beam, max_exhaustive=max_exhaustive)
    teams = score_teams(combos, slots, eligible, project, hours_per_person, rate_per_hour)
    return {
        "weights": weights,
        "ranking": {r.role: rank_role(eligible[r.role], top=top, min_score=min_score) for r in roles},
        "excluded": excluded,
        "teams_total": len(teams),
        "top_teams": top_teams(teams, sort_by=sort_by, top=top_n_teams, **(team_filters or {})),
        "teams": teams,  # todos los válidos: la UI reordena/filtra con top_teams()
    }

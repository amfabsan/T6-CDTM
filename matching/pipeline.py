"""Pasos 7-10 en una llamada.

Entrada: los requisitos (salida de interpret-project o fila de project_requirements) y, por rol (title), los perfiles
candidatos de los pasos 5-6: `candidates_from_rpc(supabase.rpc('candidatos_proyecto'), perfiles)`.
Sin LLM ni base de datos: puro y testeable.
"""
from __future__ import annotations

from .contract import from_llm_plan, normalize_profile
from .scoring import (DEFAULT_STRICT, WEIGHTS, coverage, eligibility_reasons, hard_filter_reasons, rank_role,
                      requirement_items, score_candidate)
from .teams import build_teams, score_teams, top_teams

# Supuestos ILUSTRATIVOS por defecto (el dataset no trae tarifas, horas ni fechas de roll-off). Editables desde la UI;
# los equipos que los usan salen con estado «supuesto». Pasar None para desactivarlos.
DEFAULT_ASSUMPTIONS = {
    "rate_per_hour": {"Trainee": 20, "Junior": 30, "Mid": 45, "Senior": 60, "Lead": 75, "Principal": 90},  # €/h
    "hours_per_person": 160,   # un mes de dedicación completa
    "rolloff_days": 45,        # «Roll-off próximo (<3 meses)»: mitad de la ventana
}


def run_matching(plan: dict, candidates_by_role: dict[str, list[dict]], *, weights: dict = WEIGHTS, ref_year: int = 2026,
                 strict=DEFAULT_STRICT, min_eligible_score: float = 0,
                 top: int = 5, min_score: float = 0, pool_size: int = 10, beam: int = 500, max_exhaustive: int = 20000,
                 hours_per_person: float | None = DEFAULT_ASSUMPTIONS["hours_per_person"],
                 rate_per_hour: float | dict | None = DEFAULT_ASSUMPTIONS["rate_per_hour"],
                 rolloff_days: int | None = DEFAULT_ASSUMPTIONS["rolloff_days"],
                 sort_by: str = "fit", team_filters: dict | None = None, top_n_teams: int = 5,
                 affinities: dict[str, list[tuple[str, float]]] | None = None, synergy_weight: float = 15) -> dict:
    """Elegible = pasa los filtros de `strict` (por defecto solo «no Asignado») y score > min_eligible_score con
    al menos una skill pedida. Los excluidos quedan anotados con su motivo y su score, nunca desaparecen."""
    project, roles = from_llm_plan(plan)
    # Obligatorias de TODAS las plazas: para la sinergia, cada candidato se mide también contra las de las otras plazas.
    slot_items = {r.role: [k for k, _, _ in requirement_items(r)] for r in roles}
    all_items = {k: (o, lv) for r in roles for k, o, lv in requirement_items(r)}
    eligible, excluded = {}, {}
    for r in roles:
        eligible[r.role], excluded[r.role] = [], []
        for raw in candidates_by_role.get(r.role, []):
            p = normalize_profile(raw)
            s = score_candidate(p, r, project, ref_year, weights, affinities)
            reasons = hard_filter_reasons(p, r, project, strict) + eligibility_reasons(s, min_eligible_score)
            if reasons:
                excluded[r.role].append({"employee_id": p["employee_id"], "score": s["score"], "reasons": reasons})
            else:
                cov = {k: coverage(p, o, lv) for k, (o, lv) in all_items.items()}
                s["coverage"] = {k: round(v, 3) for k, (v, _) in cov.items() if v > 0}
                s["coverage_ok"] = sorted(k for k, (_, ok) in cov.items() if ok)  # llega al nivel mínimo: puede cubrir a otro
                eligible[r.role].append(s)
    slots = [{"role": r.role, "count": r.count, "hours": r.planned_hours} for r in roles]
    combos = build_teams(slots, eligible, pool_size=pool_size, beam=beam, max_exhaustive=max_exhaustive)
    teams = score_teams(combos, slots, eligible, project, hours_per_person, rate_per_hour, rolloff_days,
                        slot_items=slot_items, synergy_weight=synergy_weight)
    shown = top_teams(teams, sort_by=sort_by, top=top_n_teams, **(team_filters or {}))
    by_key = {(c["role"], c["employee_id"]): c for cs in eligible.values() for c in cs}
    shown_keys = dict.fromkeys((m["role"], m["employee_id"]) for t in shown["items"] for m in t["members"])
    return {
        "weights": weights,
        "assumptions": {"rate_per_hour": rate_per_hour, "hours_per_person": hours_per_person, "rolloff_days": rolloff_days,
                        "is_illustrative": True},
        "ranking": {r.role: rank_role(eligible[r.role], top=top, min_score=min_score) for r in roles},
        "excluded": excluded,
        "teams_total": len(teams),
        "top_teams": shown,
        # Paso 11: ficha puntuada (evidence, skills, gaps, risks) de cada integrante de los equipos mostrados,
        # aunque no esté en el Top N del ranking de su rol. Una entrada por (rol, persona).
        "members_detail": [by_key[k] for k in shown_keys if k in by_key],
        "teams": teams,  # todos los válidos: la UI reordena/filtra con top_teams()
    }

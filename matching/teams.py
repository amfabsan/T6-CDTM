"""Pasos 9-10 · Equipos y su puntuación, según docs/ORBIT_AI_Rankings_y_Filtros.md.

- Todas las combinaciones válidas si caben (≤ max_exhaustive); si no, beam search sobre el pool (8-10 por rol).
- Una persona nunca ocupa dos plazas del mismo equipo (ni como sustituta); sí puede estar en equipos distintos.
- Encaje, coste, inicio y continuidad ante una baja; orden por cualquiera de los cuatro y filtros inclusivos.
"""
from __future__ import annotations

from math import comb, inf

from .contract import Project

SORT_BY = ("fit", "cost", "start", "risk")


def _by_score(c: dict):
    return (-c["score"], c["employee_id"])


def build_teams(slots: list[dict], scored_by_role: dict[str, list[dict]],
                pool_size: int = 10, beam: int = 500, max_exhaustive: int = 20000) -> list[list[dict]]:
    """Paso 9 · slots = [{"role", "count", "hours"}]. Devuelve combinaciones (listas de candidatos en el orden de los roles)."""
    pools = {s["role"]: sorted(scored_by_role.get(s["role"], []), key=_by_score)[:pool_size] for s in slots}
    n_combos = 1
    for s in slots:
        n_combos *= comb(len(pools[s["role"]]), s["count"])
    width = inf if n_combos <= max_exhaustive else beam
    flat = [s["role"] for s in slots for _ in range(s["count"])]

    # last_idx por rol: en roles con varias plazas solo se avanza en el pool, así no salen permutaciones del mismo equipo.
    states = [([], {}, 0.0)]  # (miembros, last_idx, suma)
    for role in flat:
        cands, nxt = pools[role], []
        for members, last_idx, total in states:
            used = {m["employee_id"] for m in members}
            for i in range(last_idx.get(role, -1) + 1, len(cands)):
                if cands[i]["employee_id"] not in used:
                    nxt.append((members + [cands[i]], {**last_idx, role: i}, total + cands[i]["score"]))
        states = nxt if width == inf else sorted(nxt, key=lambda s: -s[2])[:width]
    return [m for m, _, _ in states]


def _available_on(m: dict, prj: Project) -> str | None:
    """Fecha confirmada; si está En banca sin fecha, la mínima del proyecto. Roll-off sin fecha = desconocida (nunca se inventa)."""
    return m.get("available_on") or (prj.earliest_start if m.get("disponibilidad") == "En banca" else None)


def score_teams(combos: list[list[dict]], slots: list[dict], eligible_by_role: dict[str, list[dict]], prj: Project,
                hours_per_person: float | None = None, rate_per_hour: float | dict | None = None) -> list[dict]:
    """Paso 10 · eligible_by_role = todos los elegibles por rol (posibles sustitutos).
    Supuestos editables: horas (si el rol no trae planned_hours) y tarifa (si el candidato no trae cost_per_hour)."""
    hours = {s["role"]: s.get("hours") or hours_per_person for s in slots}

    def rate(m):
        if m.get("cost_per_hour") is not None:
            return m["cost_per_hour"]
        return rate_per_hour.get(m["nivel_seniority"]) if isinstance(rate_per_hour, dict) else rate_per_hour

    out = []
    for members in combos:
        total = len(members)
        ids = {m["employee_id"] for m in members}
        dates = [_available_on(m, prj) for m in members]
        start = max(dates + ([prj.earliest_start] if prj.earliest_start else [])) if all(dates) else None
        costs = [rate(m) * hours[m["role"]] if rate(m) is not None and hours[m["role"]] is not None else None for m in members]

        # Continuidad: se retira a cada integrante; su plaza se cubre con alguien elegible del mismo rol, fuera del
        # equipo, disponible como tarde en la fecha de inicio original del equipo. Se muestra el peor caso.
        worst, covered = None, total
        for m in members:
            subs = sorted(((c, _available_on(c, prj)) for c in eligible_by_role.get(m["role"], []) if c["employee_id"] not in ids),
                          key=lambda cd: (cd[1] or "9999", *_by_score(cd[0])))
            in_time = next((c for c, d in subs if start is None or (d is not None and d <= start)), None)
            cov = total if in_time else total - 1
            if worst is None or cov < covered:
                covered = cov
                late = None if in_time or not subs else {"employee_id": subs[0][0]["employee_id"], "available_on": subs[0][1]}
                worst = {"employee_id": m["employee_id"], "role": m["role"],
                         "substitute": in_time["employee_id"] if in_time else None, "late_substitute": late}
        cost_known = all(c is not None for c in costs)
        out.append({
            "id": "+".join(m["employee_id"] for m in members),     # en el orden de los roles del plan
            "members": [{"role": m["role"], "employee_id": m["employee_id"], "nombre_completo": m.get("nombre_completo"),
                         "score": m["score"], "disponibilidad": m.get("disponibilidad"), "available_on": d, "cost": c}
                        for m, d, c in zip(members, dates, costs)],
            "fit": sum(m["score"] for m in members) / total,       # sin redondear: la UI redondea
            "cost": {"value": sum(costs) if cost_known else None, "status": "estimado" if cost_known else "por estimar",
                     "is_illustrative": True},
            "start": {"date": start, "status": "estimado" if start else "por confirmar"},
            "continuity": {"covered": covered, "total": total, "pct": round(100 * covered / total) if total else 0, "worst": worst},
            "gaps": sum(len(m.get("gaps", [])) for m in members),
        })
    return out


def sort_teams(teams: list[dict], by: str = "fit") -> list[dict]:
    """Orden por criterio; empate → mayor encaje → ID. Datos pendientes (coste/inicio nulos) al final."""
    def key(t):
        k = {"cost": t["cost"]["value"], "start": t["start"]["date"],
             "risk": -t["continuity"]["covered"] / (t["continuity"]["total"] or 1), "fit": -t["fit"]}[by]
        return (k is None, k if k is not None else 0, -t["fit"], t["id"])
    return sorted(teams, key=key)


def top_teams(teams: list[dict], sort_by: str = "fit", top: int = 5, min_fit: float | None = None, max_cost: float | None = None,
              latest_start: str | None = None, min_continuity: float | None = None) -> dict:
    """Top N tras filtros inclusivos. Equipos cuyo dato pendiente afecta a un filtro activo van aparte (`pending`)."""
    ok, pending = [], []
    for t in teams:
        if min_fit is not None and t["fit"] < min_fit - 1e-9:
            continue
        if min_continuity is not None and t["continuity"]["pct"] < min_continuity:
            continue
        if (max_cost is not None and t["cost"]["value"] is None) or (latest_start is not None and t["start"]["date"] is None):
            pending.append(t)
            continue
        if max_cost is not None and t["cost"]["value"] > max_cost:
            continue
        if latest_start is not None and t["start"]["date"] > latest_start:
            continue
        ok.append(t)
    return {"cumplen": len(ok), "items": sort_teams(ok, sort_by)[:top], "pending": sort_teams(pending, sort_by)}

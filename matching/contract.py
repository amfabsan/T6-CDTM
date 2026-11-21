"""Contratos de entrada de los pasos 7-10, alineados con lo que ya hay en main:

- Requisitos: la salida de `interpret-project` (`supabase/functions/_shared/interpret.ts`):
    {"requirements": {"project": {...}, "roles": [...]}}  o directamente  {"project": {...}, "roles": [...]}
  o una fila de `project_requirements` (columnas planas + `roles` jsonb, migraciones 002/003).
    project: project_name, client_sector, country, city, modality (remoto|hibrido|presencial), country_required, start_date,
             start_deadline_day (días desde start_date hasta la fecha límite)
    roles[]: title, count, matching_roles[], seniority_min, min_years_experience, mandatory_skills[{name,min_level}],
             desirable_skills[{name}], languages[{name,level|null}], certifications[], certification_options[],
             sector_experience[], sector_required, planned_hours
  Si un rol no trae sector_experience, se usa el client_sector del proyecto como deseable.

- Candidatos: la salida de la RPC `candidatos_proyecto` (pasos 5-6) + los perfiles de `perfil()`/`perfiles()`;
  ver `candidates_from_rpc()`.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta

DEFAULT_MIN_LEVEL = 3
MODALITY = {"remoto": "Remoto", "hibrido": "Híbrido", "híbrido": "Híbrido", "presencial": "Presencial"}


@dataclass
class Project:
    sector: str | None = None
    country: str | None = None
    city: str | None = None
    country_required: bool = False
    work_mode: str | None = None          # Remoto | Híbrido | Presencial
    earliest_start: str | None = None     # ISO YYYY-MM-DD (start_date)
    latest_start: str | None = None       # start_date + start_deadline_day


@dataclass
class RoleRequirements:
    role: str
    count: int = 1
    roles: list[str] = field(default_factory=list)              # matching_roles (de los 87)
    seniority: str | None = None
    min_years: int | None = None
    mandatory: list[tuple[str, int]] = field(default_factory=list)  # (skill, nivel mínimo)
    desirable: list[str] = field(default_factory=list)
    languages: list[tuple[str, str | None]] = field(default_factory=list)  # (idioma, nivel mínimo o None = cualquiera)
    certifications: list[str] = field(default_factory=list)     # todas
    certification_options: list[str] = field(default_factory=list)  # basta una
    sectors: list[str] = field(default_factory=list)
    sector_required: bool = False                               # True = gap si falta; False = riesgo
    planned_hours: float | None = None


def from_llm_plan(plan: dict) -> tuple[Project, list[RoleRequirements]]:
    plan = plan.get("requirements", plan)
    if "project" in plan:
        p = plan["project"] or {}
        deadline = p.get("start_deadline_day", plan.get("start_deadline_day"))
    else:  # fila de project_requirements
        p = {"client_sector": plan.get("client_sector"), "country": plan.get("country"), "city": plan.get("city"),
             "modality": plan.get("modality"), "country_required": plan.get("country_required"),
             "start_date": plan.get("project_start_date")}
        deadline = plan.get("start_deadline_day")
    start = p.get("start_date")
    project = Project(
        sector=p.get("client_sector"), country=p.get("country"), city=p.get("city"),
        country_required=bool(p.get("country_required")),
        work_mode=MODALITY.get(str(p.get("modality") or "").lower()),
        earliest_start=start,
        latest_start=(date.fromisoformat(start) + timedelta(days=int(deadline))).isoformat() if start and deadline is not None else None,
    )
    roles = []
    titles = unique_titles([r["title"] for r in plan["roles"]])
    for r, title in zip(plan["roles"], titles):
        sectors = r.get("sector_experience") or ([project.sector] if project.sector else [])
        roles.append(RoleRequirements(
            role=title, count=max(1, int(r.get("count") or 1)), roles=r.get("matching_roles") or [],
            seniority=r.get("seniority_min"), min_years=r.get("min_years_experience"),
            mandatory=[(s["name"], s.get("min_level") or DEFAULT_MIN_LEVEL) for s in r.get("mandatory_skills") or []],
            desirable=[s["name"] for s in r.get("desirable_skills") or []],
            languages=[(x["name"], x.get("level")) for x in r.get("languages") or []],
            certifications=r.get("certifications") or [], certification_options=r.get("certification_options") or [],
            sectors=sectors, sector_required=bool(r.get("sector_required")), planned_hours=r.get("planned_hours"),
        ))
    return project, roles


def candidates_from_rpc(rpc: list[dict], profiles: list[dict]) -> dict[str, list[dict]]:
    """Une la salida de `candidatos_proyecto` ([{role_index, title, count, n_filtrados, candidates:[{employee_id, rrf,
    pos_texto, pos_vector}]}]) con los perfiles completos. Devuelve {title: [perfil + "retrieval"]} para run_matching()."""
    by_id = {p["employee_id"]: p for p in profiles}
    rpc = sorted(rpc, key=lambda r: r.get("role_index", 0))
    return {title: [{**by_id[c["employee_id"]], "retrieval": {k: c.get(k) for k in ("rrf", "pos_texto", "pos_vector")}}
                    for c in r["candidates"] if c["employee_id"] in by_id]
            for r, title in zip(rpc, unique_titles([r["title"] for r in rpc]))}


def unique_titles(titles: list[str]) -> list[str]:
    """Plazas con el mismo título («Backend», «Backend») -> «Backend», «Backend (2)». Mismo criterio en requisitos y RPC."""
    seen: dict[str, int] = {}
    out = []
    for t in titles:
        seen[t] = seen.get(t, 0) + 1
        out.append(t if seen[t] == 1 else f"{t} ({seen[t]})")
    return out


def normalize_profile(p: dict) -> dict:
    """Acepta un perfil de la RPC perfil() o del Parquet / data/sample y completa los campos derivados
    que calcula load_profiles.py (demostrada, n_proyectos, ultimo_anio, sectores_proyectos).
    Campos opcionales que no vienen en el dataset: available_on (YYYY-MM-DD) y cost_per_hour (€/h)."""
    proyectos = p.get("proyectos") or []
    exp_tec = {t for e in p.get("experiencia") or [] for t in e.get("tecnologias", [])}
    skills = []
    for s in p.get("skills") or []:
        if "demostrada" not in s:
            usados = [x for x in proyectos if s["skill"] in x["tecnologias"]]
            s = {**s, "demostrada": bool(usados) or s["skill"] in exp_tec, "n_proyectos": len(usados),
                 "ultimo_anio": max((x["anio"] for x in usados), default=None)}
        skills.append(s)
    return {**p, "skills": skills, "proyectos": proyectos,
            "certificaciones": p.get("certificaciones") or [], "idiomas": p.get("idiomas") or [],
            "sectores_proyectos": p.get("sectores_proyectos") or sorted({x["cliente_sector"] for x in proyectos})}

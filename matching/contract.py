"""Contratos de entrada de los pasos 7-10.

PROVISIONAL: `LlmPlan` (dict) es la forma supuesta de la salida del LLM del paso 2 (interpretar plan.pdf).
Cuando el formato sea definitivo, solo cambia `from_llm_plan()`; el resto usa `Project` y `RoleRequirements`.

Forma de LlmPlan:
{
  "project": {"name", "client_sector", "country", "city", "country_required": bool,
              "work_mode": "Remoto"|"Híbrido"|"Presencial"|null, "earliest_start": "YYYY-MM-DD", "latest_start": "YYYY-MM-DD"},
  "roles": [{"title", "count", "dataset_roles": [...], "seniority_min", "min_years",
             "mandatory_skills": [{"name", "min_level"}], "desirable_skills": [{"name"}],
             "languages": [{"name", "level"}], "certifications_required": [...],
             "sector_experience": [...], "sector_required": bool, "planned_hours": int}]
}
"""
from __future__ import annotations

from dataclasses import dataclass, field

DEFAULT_MIN_LEVEL = 3


@dataclass
class Project:
    sector: str | None = None
    country: str | None = None
    city: str | None = None
    country_required: bool = False
    work_mode: str | None = None          # Remoto | Híbrido | Presencial
    earliest_start: str | None = None     # ISO YYYY-MM-DD
    latest_start: str | None = None


@dataclass
class RoleRequirements:
    role: str
    count: int = 1
    roles: list[str] = field(default_factory=list)              # roles del dataset (de los 87)
    seniority: str | None = None
    min_years: int | None = None
    mandatory: list[tuple[str, int]] = field(default_factory=list)  # (skill, nivel mínimo)
    desirable: list[str] = field(default_factory=list)
    languages: list[tuple[str, str]] = field(default_factory=list)  # (idioma, nivel mínimo)
    certifications: list[str] = field(default_factory=list)
    sectors: list[str] = field(default_factory=list)
    sector_required: bool = False                               # True = gap si falta; False = riesgo
    planned_hours: float | None = None


def from_llm_plan(plan: dict) -> tuple[Project, list[RoleRequirements]]:
    p = plan.get("project") or {}
    project = Project(
        sector=p.get("client_sector"), country=p.get("country"), city=p.get("city"),
        country_required=bool(p.get("country_required")), work_mode=p.get("work_mode"),
        earliest_start=p.get("earliest_start"), latest_start=p.get("latest_start"),
    )
    roles = []
    for r in plan["roles"]:
        sectors = r.get("sector_experience") or ([project.sector] if project.sector else [])
        roles.append(RoleRequirements(
            role=r["title"], count=max(1, int(r.get("count") or 1)), roles=r.get("dataset_roles") or [],
            seniority=r.get("seniority_min"), min_years=r.get("min_years"),
            mandatory=[(s["name"], s.get("min_level") or DEFAULT_MIN_LEVEL) for s in r.get("mandatory_skills") or []],
            desirable=[s["name"] for s in r.get("desirable_skills") or []],
            languages=[(x["name"], x["level"]) for x in r.get("languages") or []],
            certifications=r.get("certifications_required") or [],
            sectors=sectors, sector_required=bool(r.get("sector_required")), planned_hours=r.get("planned_hours"),
        ))
    return project, roles


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

"""Pasos 7-8 · Score determinista candidato × rol (sin LLM), filtros duros en código y ranking por rol.

Salida por candidato (dict, listo para JSON): score 0-100 desglosado, gaps (obligatorios incumplidos, nunca
escondidos en la media), riesgos y evidencia trazable (proyectos concretos).
"""
from __future__ import annotations

from .contract import Project, RoleRequirements

WEIGHTS = {"mandatory": 35, "evidence": 20, "sectorRole": 15, "seniority": 10, "desirable": 10, "langCert": 5, "recency": 5}
SENIORITY = ["Trainee", "Junior", "Mid", "Senior", "Lead", "Principal"]
LANG = ["A1", "A2", "B1", "B2", "C1", "C2", "Nativo"]


def _mean(xs, empty=1.0):
    xs = list(xs)
    return sum(xs) / len(xs) if xs else empty


def _idx(seq, x):
    return seq.index(x) if x in seq else -1


def incoherent(s: dict) -> bool:
    """Nivel y años que no cuadran (lo avisa el caso): riesgo y penalización, nunca descarte."""
    return (s["anios"] >= 3 and s["nivel"] == 1) or (s["nivel"] >= 4 and s["anios"] < 1)


def confidence(s: dict) -> float:
    """Demostrada en ≥2 proyectos 1 · demostrada 0,85 · solo declarada 0,6; ×0,7 si nivel y años no cuadran."""
    base = (1.0 if s["n_proyectos"] >= 2 else 0.85) if s["demostrada"] else 0.6
    return base * 0.7 if incoherent(s) else base


def _has_lang(p: dict, name: str, level: str) -> bool:
    return any(i["idioma"] == name and _idx(LANG, i["nivel"]) >= max(0, _idx(LANG, level)) for i in p["idiomas"])


HARD_FILTERS = ("disponibilidad", "min_years", "seniority", "languages", "certifications", "country")
# Por defecto solo excluye lo inequívoco: estar Asignado. El resto (años, seniority, idioma, certificación, país)
# no excluye: sale como gap y resta en el score. Un caso concreto puede endurecerlo pasando `strict`.
DEFAULT_STRICT = ("disponibilidad",)


def hard_filter_reasons(p: dict, req: RoleRequirements, prj: Project, strict=DEFAULT_STRICT) -> list[str]:
    """Motivos de exclusión según los filtros activos en `strict`. [] = pasa. Las skills nunca excluyen."""
    out = []
    if "disponibilidad" in strict and p.get("disponibilidad") == "Asignado":
        out.append("Asignado (no disponible)")
    if "min_years" in strict and req.min_years is not None and p["anios_experiencia"] < req.min_years:
        out.append(f"{p['anios_experiencia']} años < {req.min_years}")
    if "seniority" in strict and req.seniority and _idx(SENIORITY, p["nivel_seniority"]) < _idx(SENIORITY, req.seniority):
        out.append(f"Seniority {p['nivel_seniority']} < {req.seniority}")
    if "languages" in strict:
        out += [f"{n} < {lv}" for n, lv in req.languages if not _has_lang(p, n, lv)]
    if "certifications" in strict:
        out += [f"Sin certificación {c}" for c in req.certifications if not any(x["nombre"] == c for x in p["certificaciones"])]
    if "country" in strict and prj.country_required and prj.country and p.get("pais") != prj.country:
        out.append(f"Fuera de {prj.country}")
    return out


def eligibility_reasons(scored: dict, min_score: float = 0) -> list[str]:
    """Elegible = score > min_score y al menos una skill pedida (obligatoria o deseable). Si el rol no pide skills, basta el score.
    Sin ninguna skill pedida el perfil no aporta nada al rol aunque sume puntos por idioma o seniority."""
    out = []
    if scored["skills"] and not any(s["nivel"] is not None for s in scored["skills"]):
        out.append("Ninguna skill pedida")
    if scored["score"] <= min_score:
        out.append(f"Score {scored['score']} ≤ {min_score}")
    return out


def _location(p: dict, prj: Project, gaps: list, risks: list) -> None:
    """Riesgos de ubicación y modalidad: no puntúan (los pesos acordados no tienen componente de ubicación)."""
    other_country = bool(prj.country) and p.get("pais") != prj.country
    if other_country and prj.country_required:
        gaps.append(f"Fuera del país exigido ({prj.country})")
    if prj.work_mode == "Remoto":
        if p.get("modalidad_trabajo") == "Presencial":
            risks.append("Prefiere presencial (proyecto remoto)")
        if other_country and not prj.country_required:
            risks.append(f"Reside en {p.get('pais')} (proyecto en {prj.country})")
    elif prj.work_mode in ("Híbrido", "Presencial"):
        if p.get("modalidad_trabajo") == "Remoto":
            risks.append(f"Prefiere remoto (proyecto {prj.work_mode.lower()})")
        away = p.get("ciudad") != prj.city if prj.work_mode == "Presencial" and prj.city else other_country
        if away:
            mov = p.get("movilidad_internacional")
            (risks if mov or not other_country else gaps).append(
                f"Ubicado en {p.get('ciudad')} ({p.get('pais')})" + (", con movilidad internacional" if mov else ""))


def score_candidate(p: dict, req: RoleRequirements, prj: Project, ref_year: int = 2026, weights: dict = WEIGHTS) -> dict:
    by_skill = {s["skill"]: s for s in p["skills"]}
    gaps, risks = [], []

    def mand(name, min_level):
        s = by_skill.get(name)
        if not s:
            gaps.append(f"Falta obligatoria: {name}")
            return 0.0
        if s["nivel"] < min_level:
            gaps.append(f"{name}: nivel {s['nivel']} < {min_level}")
        if not s["demostrada"]:
            risks.append(f"{name} solo declarada (sin proyecto ni puesto)")
        return min(1.0, s["nivel"] / min_level) * confidence(s)

    mandatory = _mean(mand(n, lv) for n, lv in req.mandatory)
    # Evidencia: 0,5 si aparece en un puesto, +0,25 por proyecto (máx. 1). Sin obligatorias, sobre las deseables.
    ev_base = [n for n, _ in req.mandatory] or req.desirable
    evidence = _mean(min(1.0, 0.5 + 0.25 * s["n_proyectos"]) if (s := by_skill.get(n)) and s["demostrada"] else 0.0
                     for n in ev_base)

    sector_ok = any(x == p["sector_principal"] or x in p["sectores_proyectos"] for x in req.sectors)
    if req.sectors and not sector_ok:
        (gaps if req.sector_required else risks).append(f"Sin experiencia en {' / '.join(req.sectors)}")
    sector_role = _mean(([1.0 if sector_ok else 0.0] if req.sectors else [])
                        + ([1.0 if p["rol"] in req.roles else 0.0] if req.roles else []))

    sen_diff = _idx(SENIORITY, p["nivel_seniority"]) - _idx(SENIORITY, req.seniority) if req.seniority else 0
    if sen_diff < 0:
        gaps.append(f"Seniority {p['nivel_seniority']} < {req.seniority}")
    if req.min_years and p["anios_experiencia"] < req.min_years:
        gaps.append(f"{p['anios_experiencia']} años < {req.min_years}")
    seniority = _mean(([1.0 if sen_diff >= 0 else 0.5 if sen_diff == -1 else 0.0] if req.seniority else [])
                      + ([max(0.0, min(1.0, p["anios_experiencia"] / req.min_years))] if req.min_years else []))

    desirable = _mean(confidence(by_skill[n]) if n in by_skill else 0.0 for n in req.desirable)

    lang_ok = [_has_lang(p, n, lv) for n, lv in req.languages]
    gaps += [f"{n} por debajo de {lv}" for (n, lv), ok in zip(req.languages, lang_ok) if not ok]
    cert_ok = [any(x["nombre"] == c for x in p["certificaciones"]) for c in req.certifications]
    gaps += [f"Falta certificación: {c}" for c, ok in zip(req.certifications, cert_ok) if not ok]
    lang_cert = _mean(float(x) for x in lang_ok + cert_ok)

    asked = [n for n, _ in req.mandatory] + req.desirable
    used = [by_skill[n] for n in asked if n in by_skill]
    last = max((s["ultimo_anio"] or 0 for s in used), default=0)
    recency = max(0.0, min(1.0, 1 - (ref_year - last) * 0.2)) if last else 0.0
    if last and ref_year - last > 3:
        risks.append(f"Último uso de las skills pedidas en {last}")
    risks += [f"{s['skill']}: nivel {s['nivel']} con {s['anios']} años (no cuadra)" for s in used if incoherent(s)]
    if p.get("disponibilidad") != "En banca":
        risks.append(p.get("disponibilidad"))
    _location(p, prj, gaps, risks)

    values = {"mandatory": mandatory, "evidence": evidence, "sectorRole": sector_role, "seniority": seniority,
              "desirable": desirable, "langCert": lang_cert, "recency": recency}
    # Normalizado a 0-100 aunque la UI cambie los pesos y no sumen 100.
    total = 100 * sum(values[k] * w for k, w in weights.items()) / (sum(weights.values()) or 1)
    wanted = set(asked)
    return {
        "employee_id": p["employee_id"], "nombre_completo": p.get("nombre_completo"), "puesto_actual": p.get("puesto_actual"),
        "role": req.role, "nivel_seniority": p["nivel_seniority"], "disponibilidad": p.get("disponibilidad"),
        "pais": p.get("pais"), "modalidad_trabajo": p.get("modalidad_trabajo"),
        "available_on": p.get("available_on"), "cost_per_hour": p.get("cost_per_hour"),
        "score": round(total, 1),
        "breakdown": {k: {"value": round(values[k], 2), "weight": w, "points": round(values[k] * w, 1)} for k, w in weights.items()},
        "gaps": gaps, "risks": risks,
        "evidence": sorted(({"proyecto": x["nombre"], "anio": x["anio"], "sector": x["cliente_sector"],
                             "skills": [t for t in x["tecnologias"] if t in wanted]}
                            for x in p["proyectos"] if wanted & set(x["tecnologias"])), key=lambda e: -e["anio"]),
        "skills": [{"name": n, "tipo": "obligatoria" if i < len(req.mandatory) else "deseable",
                    "nivel": by_skill[n]["nivel"] if n in by_skill else None, "anios": by_skill[n]["anios"] if n in by_skill else None,
                    "demostrada": bool(by_skill.get(n, {}).get("demostrada")),
                    "confianza": round(confidence(by_skill[n]), 2) if n in by_skill else 0.0} for i, n in enumerate(asked)],
    }


def rank_role(scored: list[dict], top: int = 5, min_score: float = 0, only_without_gaps: bool = False) -> dict:
    """Paso 8 · Orden por score (empate → ID), encaje mínimo y Top N. `cumplen` = cuántos pasan el mínimo."""
    ok = sorted((s for s in scored if s["score"] >= min_score and (not only_without_gaps or not s["gaps"])),
                key=lambda s: (-s["score"], s["employee_id"]))
    return {"cumplen": len(ok), "total": len(scored), "items": ok[:top]}

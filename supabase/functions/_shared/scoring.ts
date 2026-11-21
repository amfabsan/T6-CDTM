// Pasos 7-8 · Score determinista candidato × rol (sin LLM) y ranking por rol.
// Salida por candidato: score 0-100 desglosado, gaps (obligatorios incumplidos, nunca escondidos en la media),
// riesgos y evidencia trazable (proyectos concretos).
import type { Profile, Project, RoleRequirements, SkillRow } from "./contract.ts";

export const WEIGHTS = { mandatory: 35, evidence: 20, sectorRole: 15, seniority: 10, desirable: 10, langCert: 5, recency: 5 };
export type Weights = typeof WEIGHTS;
const SENIORITY = ["Trainee", "Junior", "Mid", "Senior", "Lead", "Principal"];
const LANG = ["A1", "A2", "B1", "B2", "C1", "C2", "Nativo"];
const mean = (xs: number[], empty = 1) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : empty);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const round1 = (x: number) => Math.round(x * 10) / 10;

/** Nivel y años que no cuadran (lo avisa el caso): riesgo y penalización, nunca descarte. */
export const incoherent = (s: SkillRow) => (s.anios >= 3 && s.nivel === 1) || (s.nivel >= 4 && s.anios < 1);

/** Confianza 0-1: demostrada en ≥2 proyectos 1 · demostrada 0,85 · solo declarada 0,6; ×0,7 si incoherente. */
export function confidence(s: SkillRow): number {
  const base = s.demostrada ? (s.n_proyectos >= 2 ? 1 : 0.85) : 0.6;
  return incoherent(s) ? base * 0.7 : base;
}

export interface ScoredCandidate {
  employee_id: string; nombre_completo: string; puesto_actual?: string; role: string;
  nivel_seniority: string; disponibilidad: string; pais: string; modalidad_trabajo: string;
  available_on: string | null; cost_per_hour: number | null;
  score: number;                                       // 0-100 = «encaje (%)»
  breakdown: Record<keyof Weights, { value: number; weight: number; points: number }>;
  gaps: string[]; risks: string[];
  evidence: { proyecto: string; anio: number; sector: string; skills: string[] }[];
  skills: { name: string; tipo: "obligatoria" | "deseable"; nivel: number | null; anios: number | null; demostrada: boolean; confianza: number }[];
}

/** Riesgos de ubicación y modalidad (no puntúan: los pesos acordados no tienen componente de ubicación). */
function locationRisks(p: Profile, prj: Project, gaps: string[], risks: string[]) {
  const otherCountry = !!prj.country && p.pais !== prj.country;
  if (otherCountry && prj.countryRequired) gaps.push(`Fuera del país exigido (${prj.country})`);
  if (prj.workMode === "Remoto") {
    if (p.modalidad_trabajo === "Presencial") risks.push("Prefiere presencial (proyecto remoto)");
    if (otherCountry && !prj.countryRequired) risks.push(`Reside en ${p.pais} (proyecto en ${prj.country})`);
  } else if (prj.workMode === "Híbrido" || prj.workMode === "Presencial") {
    if (p.modalidad_trabajo === "Remoto") risks.push(`Prefiere remoto (proyecto ${prj.workMode.toLowerCase()})`);
    const away = prj.workMode === "Presencial" && prj.city ? p.ciudad !== prj.city : otherCountry;
    if (away) (p.movilidad_internacional || !otherCountry ? risks : gaps)
      .push(`Ubicado en ${p.ciudad} (${p.pais})${p.movilidad_internacional ? ", con movilidad internacional" : ""}`);
  }
}

export function scoreCandidate(p: Profile, req: RoleRequirements, prj: Project, refYear = 2026, weights: Weights = WEIGHTS): ScoredCandidate {
  const bySkill = new Map(p.skills.map((s) => [s.skill, s]));
  const gaps: string[] = [], risks: string[] = [];

  const mandatory = mean(req.mandatory.map(({ name, minLevel }) => {
    const s = bySkill.get(name);
    if (!s) { gaps.push(`Falta obligatoria: ${name}`); return 0; }
    if (s.nivel < minLevel) gaps.push(`${name}: nivel ${s.nivel} < ${minLevel}`);
    if (!s.demostrada) risks.push(`${name} solo declarada (sin proyecto ni puesto)`);
    return Math.min(1, s.nivel / minLevel) * confidence(s);
  }));
  // Evidencia: 0,5 si aparece en un puesto, +0,25 por proyecto (máx. 1). Sin obligatorias, sobre las deseables.
  const evidenceBase = req.mandatory.length ? req.mandatory.map((m) => m.name) : req.desirable;
  const evidence = mean(evidenceBase.map((name) => {
    const s = bySkill.get(name);
    return s?.demostrada ? Math.min(1, 0.5 + 0.25 * s.n_proyectos) : 0;
  }));

  const sectorOk = req.sectors.some((x) => x === p.sector_principal || p.sectores_proyectos.includes(x));
  if (req.sectors.length && !sectorOk) (req.sectorRequired ? gaps : risks).push(`Sin experiencia en ${req.sectors.join(" / ")}`);
  const sectorRole = mean([
    ...(req.sectors.length ? [sectorOk ? 1 : 0] : []),
    ...(req.roles.length ? [req.roles.includes(p.rol) ? 1 : 0] : []),
  ]);

  const senDiff = req.seniority ? SENIORITY.indexOf(p.nivel_seniority) - SENIORITY.indexOf(req.seniority) : 0;
  if (senDiff < 0) gaps.push(`Seniority ${p.nivel_seniority} < ${req.seniority}`);
  if (req.minYears && p.anios_experiencia < req.minYears) gaps.push(`${p.anios_experiencia} años < ${req.minYears}`);
  const seniority = mean([
    ...(req.seniority ? [senDiff >= 0 ? 1 : senDiff === -1 ? 0.5 : 0] : []),
    ...(req.minYears ? [clamp01(p.anios_experiencia / req.minYears)] : []),
  ]);

  const desirable = mean(req.desirable.map((name) => { const s = bySkill.get(name); return s ? confidence(s) : 0; }));

  const langOk = req.languages.map(({ name, level }) =>
    p.idiomas.some((i) => i.idioma === name && LANG.indexOf(i.nivel) >= Math.max(0, LANG.indexOf(level))));
  req.languages.forEach(({ name, level }, k) => { if (!langOk[k]) gaps.push(`${name} por debajo de ${level}`); });
  const certOk = req.certifications.map((c) => p.certificaciones.some((x) => x.nombre === c));
  req.certifications.forEach((c, k) => { if (!certOk[k]) gaps.push(`Falta certificación: ${c}`); });
  const langCert = mean([...langOk, ...certOk].map(Number));

  const asked = [...req.mandatory.map((m) => m.name), ...req.desirable];
  const used = asked.map((n) => bySkill.get(n)).filter((s): s is SkillRow => !!s);
  const last = Math.max(0, ...used.map((s) => s.ultimo_anio ?? 0));
  const recency = last ? clamp01(1 - (refYear - last) * 0.2) : 0;
  if (last && refYear - last > 3) risks.push(`Último uso de las skills pedidas en ${last}`);
  for (const s of used) if (incoherent(s)) risks.push(`${s.skill}: nivel ${s.nivel} con ${s.anios} años (no cuadra)`);
  if (p.disponibilidad !== "En banca") risks.push(p.disponibilidad);
  locationRisks(p, prj, gaps, risks);

  const values = { mandatory, evidence, sectorRole, seniority, desirable, langCert, recency };
  const breakdown = Object.fromEntries((Object.keys(weights) as (keyof Weights)[]).map((k) =>
    [k, { value: round1(values[k] * 100) / 100, weight: weights[k], points: round1(values[k] * weights[k]) }])) as ScoredCandidate["breakdown"];
  const keys = Object.keys(weights) as (keyof Weights)[];
  // Normalizado a 0-100 aunque la UI cambie los pesos y no sumen 100.
  const total = (100 * keys.reduce((a, k) => a + values[k] * weights[k], 0)) / (keys.reduce((a, k) => a + weights[k], 0) || 1);
  const wanted = new Set(asked);

  return {
    employee_id: p.employee_id, nombre_completo: p.nombre_completo, puesto_actual: p.puesto_actual,
    role: req.role, nivel_seniority: p.nivel_seniority, disponibilidad: p.disponibilidad, pais: p.pais, modalidad_trabajo: p.modalidad_trabajo,
    available_on: p.available_on ?? null, cost_per_hour: p.cost_per_hour ?? null,
    score: round1(total), breakdown, gaps, risks,
    evidence: p.proyectos
      .map((x) => ({ proyecto: x.nombre, anio: x.anio, sector: x.cliente_sector, skills: x.tecnologias.filter((t) => wanted.has(t)) }))
      .filter((x) => x.skills.length).sort((a, b) => b.anio - a.anio),
    skills: asked.map((name, i) => {
      const s = bySkill.get(name);
      return { name, tipo: i < req.mandatory.length ? "obligatoria" : "deseable", nivel: s?.nivel ?? null, anios: s?.anios ?? null,
               demostrada: !!s?.demostrada, confianza: s ? round1(confidence(s) * 100) / 100 : 0 };
    }),
  };
}

/**
 * Filtros duros (espejo en código del paso 5 en SQL, para pruebas y datos que no vienen de la BD).
 * Devuelve los motivos de exclusión; [] = elegible. Las skills nunca excluyen.
 */
export function hardFilterReasons(p: Profile, req: RoleRequirements, prj: Project): string[] {
  const out: string[] = [];
  if (p.disponibilidad === "Asignado") out.push("Asignado (no disponible)");
  if (req.minYears != null && p.anios_experiencia < req.minYears) out.push(`${p.anios_experiencia} años < ${req.minYears}`);
  if (req.seniority && SENIORITY.indexOf(p.nivel_seniority) < SENIORITY.indexOf(req.seniority)) out.push(`Seniority ${p.nivel_seniority} < ${req.seniority}`);
  for (const { name, level } of req.languages)
    if (!p.idiomas.some((i) => i.idioma === name && LANG.indexOf(i.nivel) >= Math.max(0, LANG.indexOf(level)))) out.push(`${name} < ${level}`);
  for (const c of req.certifications) if (!p.certificaciones.some((x) => x.nombre === c)) out.push(`Sin certificación ${c}`);
  if (prj.countryRequired && prj.country && p.pais !== prj.country) out.push(`Fuera de ${prj.country}`);
  return out;
}

/** Paso 8 · Ranking por rol: orden por score (empate → ID), encaje mínimo y Top N. `cumplen` = cuántos pasan el mínimo. */
export function rankRole(scored: ScoredCandidate[], opts: { top?: number; minScore?: number; onlyWithoutGaps?: boolean } = {}) {
  const { top = 5, minScore = 0, onlyWithoutGaps = false } = opts;
  const ok = scored
    .filter((s) => s.score >= minScore && (!onlyWithoutGaps || s.gaps.length === 0))
    .sort((a, b) => b.score - a.score || a.employee_id.localeCompare(b.employee_id));
  return { cumplen: ok.length, total: scored.length, items: ok.slice(0, top) };
}

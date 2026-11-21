// node --test supabase/functions/_shared/matching.test.ts   (Node ≥ 23 quita los tipos solo; también corre con deno test)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fromLlmPlan, type LlmPlan, normalizeProfile, type Profile } from "./contract.ts";
import { confidence, hardFilterReasons, rankRole, type ScoredCandidate, scoreCandidate } from "./scoring.ts";
import { buildTeams, scoreTeams, type Team, topTeams } from "./teams.ts";
import { runMatching } from "./pipeline.ts";

const plan: LlmPlan = JSON.parse(readFileSync(new URL("./fixtures/plan_banco_pagos.json", import.meta.url), "utf8"));
const { project, roles } = fromLlmPlan(plan);
const backend = roles[1];

const base: Profile = {
  employee_id: "NTT1", nombre_completo: "A", rol: "Backend Developer Java", nivel_seniority: "Senior", anios_experiencia: 8,
  sector_principal: "Seguros", disponibilidad: "En banca", pais: "España", ciudad: "Madrid", modalidad_trabajo: "Remoto",
  movilidad_internacional: false, sectores_proyectos: ["Banca y Finanzas"],
  skills: [
    { skill: "REST APIs", nivel: 4, anios: 6, demostrada: true, n_proyectos: 2, ultimo_anio: 2026 },
    { skill: "Microservicios", nivel: 3, anios: 4, demostrada: true, n_proyectos: 2, ultimo_anio: 2025 },
    { skill: "Kubernetes", nivel: 1, anios: 5, demostrada: false, n_proyectos: 0, ultimo_anio: null },
  ],
  proyectos: [{ nombre: "Pasarela de pagos", cliente_sector: "Banca y Finanzas", anio: 2026, rol: "Dev", tecnologias: ["REST APIs", "Microservicios"] }],
  certificaciones: [], idiomas: [{ idioma: "Inglés", nivel: "C1" }],
};

test("contrato: el sector del proyecto se hereda en cada rol y el nivel mínimo por defecto es 3", () => {
  assert.deepEqual(backend.sectors, ["Banca y Finanzas"]);
  assert.equal(fromLlmPlan({ project: {}, roles: [{ title: "x", count: 1, mandatory_skills: [{ name: "SQL" }] }] }).roles[0].mandatory[0].minLevel, 3);
});

test("paso 7: perfil que cumple puntúa alto, con evidencia y riesgo por incoherencia nivel/años", () => {
  const s = scoreCandidate(base, backend, project);
  assert.equal(s.breakdown.mandatory.value, 1);
  assert.deepEqual(s.gaps, []);
  assert.ok(s.risks.some((r) => r.startsWith("Kubernetes: nivel 1")));
  assert.equal(s.evidence[0].proyecto, "Pasarela de pagos");
  assert.ok(s.score > 80 && s.score < 100, String(s.score));
  assert.equal(Object.values(s.breakdown).reduce((a, b) => a + b.weight, 0), 100);
});

test("paso 7: obligatoria ausente = gap visible y score bajo; nunca descarta", () => {
  const s = scoreCandidate({ ...base, skills: base.skills.slice(2) }, backend, project);
  assert.equal(s.breakdown.mandatory.value, 0);
  assert.ok(s.gaps.includes("Falta obligatoria: REST APIs"));
  assert.ok(s.score < 60);
});

test("paso 7: modalidad y ubicación en proyecto remoto son riesgos, no gaps (salvo país exigido)", () => {
  const p = { ...base, modalidad_trabajo: "Presencial", pais: "México" };
  const s = scoreCandidate(p, backend, project);
  assert.ok(s.risks.includes("Prefiere presencial (proyecto remoto)"));
  assert.ok(s.risks.some((r) => r.startsWith("Reside en México")));
  const strict = scoreCandidate(p, backend, { ...project, countryRequired: true });
  assert.ok(strict.gaps.includes("Fuera del país exigido (España)"));
});

test("confianza: demostrada > solo declarada; incoherente penaliza", () => {
  assert.equal(confidence(base.skills[0]), 1);
  assert.ok(Math.abs(confidence(base.skills[2]) - 0.42) < 1e-9);
});

test("paso 8: ranking con encaje mínimo y Top N", () => {
  const mk = (id: string, score: number) => ({ employee_id: id, score, gaps: [] } as unknown as ScoredCandidate);
  const r = rankRole([mk("a", 70), mk("b", 90), mk("c", 85), mk("d", 79)], { top: 2, minScore: 80 });
  assert.equal(r.cumplen, 2);
  assert.deepEqual(r.items.map((x) => x.employee_id), ["b", "c"]);
});

test("paso 9: sin persona repetida en un equipo, sin permutaciones; beam si no cabe el exhaustivo", () => {
  const mk = (id: string, role: string, score: number) =>
    ({ employee_id: id, role, score, gaps: [], disponibilidad: "En banca", nivel_seniority: "Senior" } as unknown as ScoredCandidate);
  const pools = { Arq: [mk("x", "Arq", 90), mk("y", "Arq", 80)], Back: [mk("x", "Back", 95), mk("b1", "Back", 70), mk("b2", "Back", 60), mk("b3", "Back", 50)] };
  const slots = [{ role: "Arq", count: 1 }, { role: "Back", count: 2 }];
  const all = buildTeams(slots, pools);
  assert.equal(all.length, 9);                                 // 2×C(4,2)=12 menos 3 con «x» en dos plazas
  for (const t of all) assert.equal(new Set(t.map((m) => m.employee_id)).size, 3);
  const keys = all.map((t) => t.map((m) => m.employee_id).sort().join());
  assert.equal(new Set(keys).size, keys.length);
  const beam = buildTeams(slots, pools, { maxExhaustive: 1, beam: 2 });
  assert.deepEqual(beam[0].map((m) => m.employee_id), ["y", "x", "b1"]);
  assert.equal(beam.length, 2);
});

test("e2e con los 42 perfiles reales de data/sample", () => {
  const sample = JSON.parse(readFileSync(new URL("../../../data/sample/profiles_sample.json", import.meta.url), "utf8"));
  const out = runMatching(plan, Object.fromEntries(roles.map((r) => [r.role, sample])));
  assert.ok(Object.values(out.excluded).every((xs) => xs.some((x) => x.reasons.includes("Asignado (no disponible)"))));
  assert.ok(out.teams.length > 0);
  for (const t of out.teams) assert.equal(new Set(t.members.map((m) => m.employee_id)).size, 4);
  assert.ok(out.top_teams.items.length <= 5);
  assert.ok(normalizeProfile(sample[0]).skills.every((s) => typeof s.demostrada === "boolean"));
});

// ───────────── Caso de demo del pitch (docs/ORBIT_AI_Caso_Demo_Pitch.md §5) ─────────────
// fixture_match sustituye al score del paso 7, como pide el caso, para obtener salidas reproducibles.
const caso = JSON.parse(readFileSync(new URL("./fixtures/caso_demo_core_bancario.json", import.meta.url), "utf8"));
const planDemo = fromLlmPlan(JSON.parse(readFileSync(new URL("./fixtures/plan_core_bancario_azure.json", import.meta.url), "utf8")));
function demo(overrides: Record<string, string> = {}) {
  const eligible: Record<string, ScoredCandidate[]> = {}, excluded: string[] = [];
  for (const r of planDemo.roles) {
    eligible[r.role] = [];
    for (const x of caso.profiles.filter((p: { candidate_role: string }) => p.candidate_role === r.role)) {
      const prof = { employee_id: x.id, nombre_completo: x.name, rol: "", nivel_seniority: "Senior", anios_experiencia: x.total_years,
        disponibilidad: x.availability === "asignado" ? "Asignado" : "En banca", pais: "España", idiomas: [], certificaciones: [] } as unknown as Profile;
      if (hardFilterReasons(prof, r, planDemo.project).length) { excluded.push(x.id); continue; }
      eligible[r.role].push({ employee_id: x.id, nombre_completo: x.name, role: r.role, score: x.fixture_match, gaps: [],
        disponibilidad: prof.disponibilidad, nivel_seniority: "Senior", available_on: overrides[x.id] ?? x.available_on,
        cost_per_hour: x.cost_per_hour } as unknown as ScoredCandidate);
    }
  }
  const slots = planDemo.roles.map((r) => ({ role: r.role, count: r.count, hours: r.plannedHours }));
  const teams = scoreTeams(buildTeams(slots, eligible), slots, eligible, planDemo.project);
  return { eligible, excluded, teams };
}
const ids = (r: { items: Team[] }) => r.items.map((t) => t.id);

test("demo: X1 (asignado) y X2 (2 años) excluidos; 9 elegibles y 27 equipos", () => {
  const d = demo();
  assert.deepEqual(d.excluded.sort(), ["X1", "X2"]);
  assert.equal(Object.values(d.eligible).flat().length, 9);
  assert.equal(d.teams.length, 27);
});

test("demo: ranking Backend Top 3 con mínimo 90 % → B1 (96) y B2 (91), sin rellenar la tercera", () => {
  const r = rankRole(demo().eligible.BACK, { top: 3, minScore: 90 });
  assert.deepEqual(r.items.map((x) => [x.employee_id, x.score]), [["B1", 96], ["B2", 91]]);
});

test("demo: Top 5 exacto por cada uno de los cuatro órdenes", () => {
  const { teams } = demo();
  assert.deepEqual(ids(topTeams(teams, { sortBy: "fit" })), ["A1+B1+S1", "A1+B2+S1", "A2+B1+S1", "A1+B1+S2", "A2+B2+S1"]);
  assert.deepEqual(ids(topTeams(teams, { sortBy: "cost" })), ["A3+B3+S3", "A3+B2+S3", "A3+B1+S3", "A3+B3+S2", "A3+B2+S2"]);
  assert.deepEqual(ids(topTeams(teams, { sortBy: "start" })), ["A1+B1+S2", "A1+B3+S2", "A1+B1+S1", "A1+B2+S1", "A1+B3+S1"]);
  assert.deepEqual(ids(topTeams(teams, { sortBy: "risk" })), ["A2+B1+S1", "A2+B2+S1", "A3+B1+S1", "A1+B1+S3", "A2+B1+S2"]);
});

test("demo: métricas de la tabla (encaje, coste, inicio, peor cobertura)", () => {
  const t = Object.fromEntries(demo().teams.map((x) => [x.id, x]));
  const row = (id: string) => [t[id].fit.toFixed(2), t[id].cost.value, t[id].start.date, `${t[id].continuity.covered}/${t[id].continuity.total}`];
  assert.deepEqual(row("A1+B1+S1"), ["98.33", 11800, "2026-11-24", "2/3"]);
  assert.deepEqual(row("A3+B3+S3"), ["86.00", 7800, "2026-11-26", "3/3"]);
  assert.deepEqual(row("A1+B1+S2"), ["95.33", 10800, "2026-11-23", "2/3"]);
  assert.deepEqual(row("A2+B1+S1"), ["96.67", 11000, "2026-11-25", "3/3"]);
});

test("demo: filtro encaje ≥ 96 y coste ≤ 11.000 (inclusivos) → solo A2+B1+S1", () => {
  assert.deepEqual(ids(topTeams(demo().teams, { filters: { minFit: 96, maxCost: 11000 } })), ["A2+B1+S1"]);
});

test("demo: baja de A1 en el equipo de mayor encaje → falta Arquitectura el 24/11, A2 sustituto tardío el 25/11", () => {
  const w = demo().teams.find((x) => x.id === "A1+B1+S1")!.continuity.worst!;
  assert.deepEqual([w.employee_id, w.role, w.substitute, w.late_substitute], ["A1", "ARQ", null, { employee_id: "A2", available_on: "2026-11-25" }]);
});

test("demo: adelantar A2 al 24/11 → A1+B1+S1 pasa a 3/3 y queda primero por menor riesgo", () => {
  const { teams } = demo({ A2: "2026-11-24" });
  assert.equal(teams.find((x) => x.id === "A1+B1+S1")!.continuity.covered, 3);
  assert.equal(topTeams(teams, { sortBy: "risk" }).items[0].id, "A1+B1+S1");
});

test("demo: la misma persona ofrecida para dos roles nunca ocupa dos plazas", () => {
  const d = demo();
  const dup = { ...d.eligible.ARQ[0], role: "SEG" } as ScoredCandidate;    // A1 también como candidata de Seguridad
  const eligible = { ...d.eligible, SEG: [...d.eligible.SEG, dup] };
  const slots = planDemo.roles.map((r) => ({ role: r.role, count: r.count, hours: r.plannedHours }));
  const teams = scoreTeams(buildTeams(slots, eligible), slots, eligible, planDemo.project);
  for (const t of teams) assert.equal(new Set(t.members.map((m) => m.employee_id)).size, 3);
  for (const t of teams) { const s = t.continuity.worst?.substitute; if (s) assert.ok(!t.members.some((m) => m.employee_id === s)); }
});

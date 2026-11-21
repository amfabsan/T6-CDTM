// node --test supabase/functions/_shared/matching.test.ts   (Node ≥ 23 quita los tipos solo; también corre con deno test)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fromLlmPlan, type LlmPlan, normalizeProfile, type Profile } from "./contract.ts";
import { confidence, rankRole, type ScoredCandidate, scoreCandidate } from "./scoring.ts";
import { buildTeams, scoreTeams } from "./teams.ts";
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

test("pasos 9-10: beam search sin repetir persona en un equipo, sin permutaciones; continuidad", () => {
  const mk = (id: string, role: string, score: number) =>
    ({ employee_id: id, role, score, gaps: [], disponibilidad: "En banca", nivel_seniority: "Senior" } as unknown as ScoredCandidate);
  const pools = { Arq: [mk("x", "Arq", 90), mk("y", "Arq", 80)], Back: [mk("x", "Back", 95), mk("b1", "Back", 70), mk("b2", "Back", 60), mk("b3", "Back", 50)] };
  const slots = [{ role: "Arq", count: 1 }, { role: "Back", count: 2 }];
  const combos = buildTeams(slots, pools);
  for (const t of combos) assert.equal(new Set(t.map((m) => m.employee_id)).size, 3);
  const keys = combos.map((t) => t.map((m) => m.employee_id).sort().join());
  assert.equal(new Set(keys).size, keys.length);
  const teams = scoreTeams(combos, slots, pools, { ratePerHour: 50, hoursPerPerson: 160, startDaysEnBanca: 5 });
  assert.deepEqual(teams[0].members.map((m) => m.employee_id), ["y", "x", "b1"]);
  assert.equal(teams[0].fit, 81.7);
  assert.equal(teams[0].continuity.pct, 50);                  // si se va «y», no queda arquitecto: 1 de 2 roles
  assert.equal(teams[0].continuity.worst?.role, "Arq");
  assert.deepEqual([teams[0].cost.value, teams[0].start.day], [24000, 5]);
  assert.equal(scoreTeams(combos, slots, pools)[0].cost.status, "por estimar");
});

test("e2e con los 42 perfiles reales de data/sample (sin SQL: filtro de disponibilidad hecho aquí)", () => {
  const sample = JSON.parse(readFileSync(new URL("../../../data/sample/profiles_sample.json", import.meta.url), "utf8"));
  const disponibles = sample.filter((p: { disponibilidad: string }) => p.disponibilidad !== "Asignado");
  const out = runMatching(plan, Object.fromEntries(roles.map((r) => [r.role, disponibles])));
  assert.equal(Object.keys(out.ranking).length, 3);
  assert.ok(out.teams.length > 0 && out.teams.length <= 15);
  for (const t of out.teams) {
    assert.equal(t.members.length, 4);
    assert.equal(new Set(t.members.map((m) => m.employee_id)).size, 4);
  }
  assert.ok(out.teams.every((t, i) => i === 0 || out.teams[i - 1].fit >= t.fit));
  assert.ok(normalizeProfile(disponibles[0]).skills.every((s) => typeof s.demostrada === "boolean"));
});

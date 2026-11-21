// Ejecutar: node --experimental-strip-types --test supabase/functions/_shared/explain.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { explainWithGemini, validate, type ExplainInput } from "./explain.ts";

const input: ExplainInput = {
  project_summary: "Migración de core bancario a cloud: 1 Cloud Architect (Azure, Kubernetes obligatorias).",
  candidates: [
    {
      employee_id: "NTT0000001",
      nombre: "Krystyna Kurcz",
      role: "Cloud Architect",
      fit: 87,
      disponibilidad: "En banca",
      breakdown: { obligatorias: 30, evidencia: 18 },
      gaps: ["Terraform (obligatoria)"],
      risks: [],
      evidence: [
        { id: "P1", type: "project", ref: "Migración a la nube de core bancario (2024)", detail: "Azure, SQL Server" },
        { id: "S1", type: "skill", ref: "Azure", detail: "nivel 4, 3 años" },
      ],
    },
    {
      employee_id: "NTT0000002",
      nombre: "Hugo Pérez",
      role: "Security Engineer",
      fit: 74,
      disponibilidad: "Roll-off próximo (<3 meses)",
      breakdown: { obligatorias: 25 },
      gaps: [],
      risks: ["Roll-off: inicio por confirmar"],
      evidence: [{ id: "C1", type: "certification", ref: "CISSP (2022)" }],
    },
  ],
  teams: [
    {
      team_id: "A",
      fit: 80,
      continuity: 50,
      cost_eur: null,
      start: { day: null, status: "por_confirmar" },
      members: [
        { role: "Cloud Architect", employee_id: "NTT0000001" },
        { role: "Security Engineer", employee_id: "NTT0000002" },
      ],
    },
  ],
};

test("mantiene las frases respaldadas por evidencia real", () => {
  const out = validate(
    {
      candidates: [
        {
          employee_id: "NTT0000001",
          summary: "Encaja al 87 % y ya migró un core bancario a la nube.",
          strengths: [{ text: "Lideró «Migración a la nube de core bancario» con Azure.", evidence_ids: ["P1"] }],
        },
      ],
      teams: [
        {
          team_id: "A",
          summary: "Cloud y seguridad se complementan.",
          reasons: [{ text: "Hugo aporta la certificación CISSP.", evidence_ids: ["NTT0000002:C1"] }],
        },
      ],
    },
    input,
  );
  assert.equal(out.candidates[0].source, "llm");
  assert.equal(out.candidates[0].strengths.length, 1);
  assert.equal(out.teams[0].source, "llm");
});

test("descarta un proyecto inventado", () => {
  const out = validate(
    {
      candidates: [
        {
          employee_id: "NTT0000001",
          summary: "Buen perfil.",
          strengths: [
            { text: "Trabajó en «Plataforma de pagos de Santander».", evidence_ids: ["P1"] },
            { text: "Domina Azure.", evidence_ids: ["S1"] },
          ],
        },
      ],
      teams: [],
    },
    input,
  );
  assert.deepEqual(out.candidates[0].strengths.map((s) => s.text), ["Domina Azure."]);
  assert.equal(out.candidates[0].dropped, 1);
});

test("descarta una cifra que no está en los datos", () => {
  const out = validate(
    {
      candidates: [
        {
          employee_id: "NTT0000001",
          summary: "Tiene 12 años de Azure.",
          strengths: [
            { text: "Azure a nivel 4 durante 3 años.", evidence_ids: ["S1"] },
            { text: "Ha llevado 9 proyectos de banca.", evidence_ids: ["P1"] },
          ],
        },
      ],
      teams: [],
    },
    input,
  );
  const c = out.candidates[0];
  assert.deepEqual(c.strengths.map((s) => s.text), ["Azure a nivel 4 durante 3 años."]);
  assert.equal(c.summary, "Krystyna Kurcz encaja al 87 % como Cloud Architect."); // resumen inventado → plantilla
});

test("descarta ids de evidencia inexistentes o de otra persona", () => {
  const out = validate(
    {
      candidates: [
        {
          employee_id: "NTT0000001",
          summary: "Encaja.",
          strengths: [
            { text: "Tiene CISSP.", evidence_ids: ["C1"] }, // C1 es de Hugo, no de Krystyna
            { text: "Sin evidencia.", evidence_ids: [] },
          ],
        },
      ],
      teams: [],
    },
    input,
  );
  assert.equal(out.candidates[0].source, "fallback");
  assert.equal(out.candidates[0].dropped, 2);
});

test("un candidato que el LLM omite recibe la plantilla", () => {
  const out = validate({ candidates: [], teams: [] }, input);
  assert.ok(out.candidates.every((c) => c.source === "fallback" && c.strengths.length > 0));
  assert.ok(out.teams.every((t) => t.source === "fallback" && t.reasons.length === 2));
});

test("si Gemini falla, devuelve la plantilla con el error", async () => {
  const fetchFn = (async () => new Response("quota exceeded", { status: 429 })) as typeof fetch;
  const out = await explainWithGemini(input, { apiKey: "x", model: "m", fetchFn });
  assert.match(out.error ?? "", /429/);
  assert.equal(out.candidates.length, 2);
});

test("lee la respuesta de Gemini y la valida", async () => {
  const llm = {
    candidates: [{ employee_id: "NTT0000001", summary: "Encaja al 87 %.", strengths: [{ text: "Azure a nivel 4.", evidence_ids: ["S1"] }] }],
    teams: [],
  };
  let sent: { generationConfig?: { responseMimeType?: string } } = {};
  const fetchFn = (async (_url: string, init: RequestInit) => {
    sent = JSON.parse(init.body as string);
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(llm) }] } }] });
  }) as unknown as typeof fetch;
  const out = await explainWithGemini(input, { apiKey: "x", model: "m", fetchFn });
  assert.equal(sent.generationConfig?.responseMimeType, "application/json");
  assert.equal(out.candidates[0].source, "llm");
  assert.equal(out.candidates[1].source, "fallback");
});

test("si un modelo está retirado (404) o saturado (503), prueba el siguiente", async () => {
  const llm = { candidates: [], teams: [] };
  const tried: string[] = [];
  const fetchFn = (async (url: string) => {
    const model = url.split("/models/")[1].split(":")[0];
    tried.push(model);
    if (model === "viejo") return new Response("no longer available", { status: 404 });
    if (model === "lleno") return new Response("high demand", { status: 503 });
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(llm) }] } }] });
  }) as unknown as typeof fetch;
  const out = await explainWithGemini(input, { apiKey: "x", model: "viejo", fallbackModels: ["lleno", "bueno"], fetchFn });
  assert.deepEqual(tried, ["viejo", "lleno", "bueno"]);
  assert.equal(out.model, "bueno");
  assert.equal(out.error, undefined);
});

test("un 400 (petición mal formada) no prueba más modelos", async () => {
  const tried: string[] = [];
  const fetchFn = (async (url: string) => {
    tried.push(url);
    return new Response("bad schema", { status: 400 });
  }) as unknown as typeof fetch;
  const out = await explainWithGemini(input, { apiKey: "x", model: "a", fallbackModels: ["b"], fetchFn });
  assert.equal(tried.length, 1);
  assert.match(out.error ?? "", /400/);
});

test("adapta la salida real de los pasos 7-10 (run_matching sobre data/sample)", async () => {
  const { readFileSync } = await import("node:fs");
  const { fromMatching, isMatchingResult } = await import("./from_matching.ts");
  const raw = JSON.parse(readFileSync(new URL("./fixtures/matching_banco_pagos.json", import.meta.url), "utf8"));
  assert.ok(isMatchingResult(raw));
  const inp = fromMatching(raw);
  assert.equal(inp.teams.length, 5);
  assert.match(inp.project_summary, /Arquitecto cloud/);
  const ids = new Set(inp.candidates.map((c) => c.employee_id));
  for (const t of inp.teams) for (const m of t.members) assert.ok(ids.has(m.employee_id), `falta ${m.employee_id}`);
  assert.ok(inp.candidates.every((c) => Number.isInteger(c.fit)));
  assert.ok(inp.candidates.some((c) => c.evidence.some((e) => e.type === "project")));
  // Sin LLM, la plantilla explica todos los equipos con evidencia real.
  const out = validate({}, inp);
  assert.ok(out.teams.every((t) => t.source === "fallback" && t.reasons.length > 0));
});

// Formato tal como lo documenta el equipo (salida de run_matching sin members_detail ni plan).
const PASTED = {
  weights: { mandatory: 35, evidence: 20, sectorRole: 15, seniority: 10, desirable: 10, langCert: 5, recency: 5 },
  ranking: {
    Backend: {
      cumplen: 268, total: 268,
      items: [{
        employee_id: "NTT0011735", nombre_completo: "Krystyna Kurcz", puesto_actual: "Backend Developer .NET",
        role: "Backend", nivel_seniority: "Mid", disponibilidad: "En banca", pais: "España", modalidad_trabajo: "Híbrido",
        available_on: null, cost_per_hour: null, score: 87.5,
        breakdown: { mandatory: { value: 1.0, weight: 35, points: 35.0 } },
        gaps: ["2 años < 3"], risks: ["Roll-off próximo (<3 meses)", "Prefiere presencial (proyecto remoto)"],
        evidence: [{ proyecto: "Migración a la nube de core bancario", anio: 2025, sector: "Banca y Finanzas", skills: ["C#", ".NET", "SQL Server"] }],
        skills: [{ name: "C#", tipo: "obligatoria", nivel: 4, anios: 5, demostrada: true, confianza: 1.0 }],
      }],
    },
  },
  excluded: { Backend: [{ employee_id: "X1", score: 92.0, reasons: ["Asignado (no disponible)"] }] },
  teams_total: 27,
  top_teams: {
    cumplen: 27,
    items: [{
      id: "A1+NTT0011735",
      members: [
        { role: "ARQ", employee_id: "A1", nombre_completo: "Alicia", score: 99, disponibilidad: "En banca", available_on: "2026-11-23", cost: 4200 },
        { role: "Backend", employee_id: "NTT0011735", nombre_completo: "Krystyna Kurcz", score: 87.5, disponibilidad: "En banca", available_on: null, cost: 7600 },
      ],
      fit: 93.25,
      cost: { value: 11800, status: "estimado", is_illustrative: true },
      start: { date: "2026-11-24", status: "estimado" },
      continuity: { covered: 2, total: 3, pct: 67, worst: { employee_id: "A1", role: "ARQ", substitute: null, late_substitute: null } },
      gaps: 1,
    }],
    pending: [],
  },
  teams: [],
};

test("acepta el formato documentado sin members_detail ni plan", async () => {
  const { fromMatching, isMatchingResult } = await import("./from_matching.ts");
  assert.ok(isMatchingResult(PASTED));
  const inp = fromMatching(PASTED);
  assert.equal(inp.project_summary, "Roles: Backend.");
  assert.deepEqual(inp.candidates.map((c) => c.employee_id), ["A1", "NTT0011735"]);
  const k = inp.candidates.find((c) => c.employee_id === "NTT0011735")!;
  assert.deepEqual(k.evidence.map((e) => e.id), ["P1", "S1"]);
  assert.equal(k.fit, 88);
  assert.equal(inp.candidates[0].evidence.length, 0); // Alicia no está en el ranking: sin evidencia
  assert.equal(inp.teams[0].fit, 93);
  assert.equal(inp.teams[0].start.date, "2026-11-24");
  const out = validate({}, inp);
  assert.equal(out.teams[0].reasons.length, 1); // solo Krystyna tiene evidencia que citar
});

test("acepta cifras en formato español (11.800 €, 2,5) y rechaza las que no están", async () => {
  const { fromMatching } = await import("./from_matching.ts");
  const inp = fromMatching(PASTED);
  const out = validate({
    candidates: [],
    teams: [{
      team_id: "A1+NTT0011735",
      summary: "Coste estimado de 11.800 € con inicio el 24 de noviembre.",
      reasons: [
        { text: "Krystyna aporta C# a nivel 4 tras 5 años en «Migración a la nube de core bancario».", evidence_ids: ["NTT0011735:P1", "NTT0011735:S1"] },
        { text: "El equipo cuesta 11.900 €.", evidence_ids: ["NTT0011735:P1"] },
      ],
    }],
  }, inp);
  const t = out.teams[0];
  assert.equal(t.source, "llm");
  assert.match(t.summary, /11\.800/);
  assert.equal(t.reasons.length, 1);
  assert.equal(t.dropped, 1);
});

test("euros: rechaza otras monedas y la plantilla escribe el coste en €", async () => {
  const { fromMatching } = await import("./from_matching.ts");
  const { formatEur } = await import("./explain.ts");
  assert.equal(formatEur(11800), "11.800 €");
  assert.equal(formatEur(4200), "4.200 €");
  const inp = fromMatching(PASTED);
  assert.equal(inp.teams[0].cost_eur, 11800);
  const out = validate({
    candidates: [],
    teams: [{ team_id: "A1+NTT0011735", summary: "Cuesta $11800.", reasons: [
      { text: "Krystyna aporta C# a nivel 4.", evidence_ids: ["NTT0011735:S1"] },
      { text: "Son 11800 USD.", evidence_ids: ["NTT0011735:S1"] },
    ] }],
  }, inp);
  assert.equal(out.teams[0].reasons.length, 1);
  assert.match(out.teams[0].summary, /Coste estimado: 11\.800 € \(supuesto\)/); // resumen en $ → plantilla
});

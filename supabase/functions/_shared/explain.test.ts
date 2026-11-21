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
      cost: null,
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

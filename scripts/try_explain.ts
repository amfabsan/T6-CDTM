// Prueba real del paso 11 contra Gemini, sin Supabase.
// Con la clave en .env (GEMINI_API_KEY_EXPLAIN=...): node --env-file=.env --experimental-strip-types scripts/try_explain.ts
// Linux/macOS: GEMINI_API_KEY=... node --experimental-strip-types scripts/try_explain.ts
// PowerShell:  $env:GEMINI_API_KEY="..."; node --experimental-strip-types scripts/try_explain.ts
import { DEFAULT_FALLBACKS, DEFAULT_MODEL, explainWithGemini, type ExplainInput } from "../supabase/functions/_shared/explain.ts";

const input: ExplainInput = {
  project_summary:
    "Migración de core bancario a cloud para un banco español. Roles: 1 Cloud Architect (Azure y Kubernetes obligatorias, experiencia en banca implícita) y 1 Security Engineer (CISSP deseable).",
  candidates: [
    {
      employee_id: "NTT0000001", nombre: "Krystyna Kurcz", role: "Cloud Architect", fit: 87,
      disponibilidad: "En banca", breakdown: { obligatorias: 30, evidencia: 18, sector_rol: 12 },
      gaps: ["Kubernetes (obligatoria)"], risks: [],
      evidence: [
        { id: "P1", type: "project", ref: "Migración a la nube de core bancario (2024)", detail: ".NET, SQL Server, Azure" },
        { id: "S1", type: "skill", ref: "Azure", detail: "nivel 4, 3 años, demostrada en 2 proyectos" },
        { id: "X1", type: "experience", ref: "Backend Developer .NET en NTT DATA (área Software Engineering, sector Seguros)" },
      ],
    },
    {
      employee_id: "NTT0000002", nombre: "Hugo Pérez", role: "Security Engineer", fit: 74,
      disponibilidad: "Roll-off próximo (<3 meses)", breakdown: { obligatorias: 25, evidencia: 15 },
      gaps: [], risks: ["Roll-off: inicio por confirmar"],
      evidence: [
        { id: "C1", type: "certification", ref: "CISSP (2022)" },
        { id: "P1", type: "project", ref: "Bastionado de la plataforma de banca online (2023)", detail: "SIEM, IAM" },
      ],
    },
  ],
  teams: [{
    team_id: "A", fit: 80, continuity: 50, cost: null, start: { day: null, status: "por_confirmar" },
    members: [{ role: "Cloud Architect", employee_id: "NTT0000001" }, { role: "Security Engineer", employee_id: "NTT0000002" }],
  }],
};

// Con argumento, usa la salida real de los pasos 7-10:
//   node --env-file=.env --experimental-strip-types scripts/try_explain.ts supabase/functions/_shared/fixtures/matching_banco_pagos.json
import { readFileSync } from "node:fs";
import { fromMatching } from "../supabase/functions/_shared/from_matching.ts";
const file = process.argv[2];
const realInput: ExplainInput = file ? fromMatching(JSON.parse(readFileSync(file, "utf8"))) : input;

const apiKey = process.env.GEMINI_API_KEY_EXPLAIN || process.env.GEMINI_API_KEY;
if (!apiKey) { console.error("Falta GEMINI_API_KEY_EXPLAIN en .env"); process.exit(1); }
const t0 = Date.now();
const out = await explainWithGemini(realInput, {
  apiKey,
  model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
  fallbackModels: (process.env.GEMINI_FALLBACK_MODELS || DEFAULT_FALLBACKS.join(",")).split(",").map((m) => m.trim()).filter(Boolean),
  timeoutMs: 15_000,
});
console.error(`Tiempo: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
console.log(JSON.stringify(out, null, 2));

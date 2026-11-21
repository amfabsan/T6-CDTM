// Edge function del paso 11: explica candidatos y equipos con Gemini.
// In:  la salida de run_matching (pasos 7-10) con al menos { plan, top_teams, members_detail },
//      o directamente un ExplainInput (ver _shared/explain.ts).
// Out: ExplainOutput. Cada explicación trae source "llm" o "fallback" y cuántas frases se descartaron.
// Secretos de Supabase: GEMINI_API_KEY_EXPLAIN (clave propia del paso 11; si no está, usa GEMINI_API_KEY);
// GEMINI_MODEL_EXPLAIN y GEMINI_FALLBACK_MODELS_EXPLAIN opcionales (separados por comas).
import { fromMatching, isMatchingResult } from "../_shared/from_matching.ts";
import { DEFAULT_FALLBACKS, DEFAULT_MODEL, explainWithGemini, fallbackAll, type ExplainInput } from "../_shared/explain.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MAX_CANDIDATES = 40; // regla 3 de AGENTS.md: nunca se manda el universo al LLM

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  let input: ExplainInput;
  try {
    const body = await req.json();
    input = isMatchingResult(body) ? fromMatching(body) : body;
  } catch {
    return json({ error: "El cuerpo debe ser JSON" }, 400);
  }
  if (!Array.isArray(input?.candidates) || !Array.isArray(input?.teams)) {
    return json({ error: "Faltan 'candidates' o 'teams'" }, 400);
  }
  if (input.candidates.length > MAX_CANDIDATES) {
    return json({ error: `Máximo ${MAX_CANDIDATES} candidatos por llamada` }, 400);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY_EXPLAIN") || Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json(fallbackAll(input, "Falta el secreto GEMINI_API_KEY_EXPLAIN"));
  // Modelos comprobados el 21-11-2026 con una clave nueva: los gemini-2.5-* ya no están disponibles
  // para cuentas nuevas (404), y 3.7/3.8-flash tardaban más de 40 s. Se prueban en este orden.
  const model = Deno.env.get("GEMINI_MODEL_EXPLAIN") || DEFAULT_MODEL;
  const fallbackModels = (Deno.env.get("GEMINI_FALLBACK_MODELS_EXPLAIN") || DEFAULT_FALLBACKS.join(","))
    .split(",").map((m) => m.trim()).filter(Boolean);

  return json(await explainWithGemini(input, { apiKey, model, fallbackModels, timeoutMs: 15_000 }));
});

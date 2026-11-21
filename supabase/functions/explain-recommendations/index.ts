// Edge function del paso 11: explica candidatos y equipos con Gemini.
// In:  ExplainInput (ver _shared/explain.ts): project_summary + candidatos con evidence[] + equipos.
// Out: ExplainOutput. Cada explicación trae source "llm" o "fallback" y cuántas frases se descartaron.
// Secretos de Supabase: GEMINI_API_KEY (obligatorio) y GEMINI_MODEL (opcional).
import { explainWithGemini, fallbackAll, type ExplainInput } from "../_shared/explain.ts";

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
    input = await req.json();
  } catch {
    return json({ error: "El cuerpo debe ser JSON" }, 400);
  }
  if (!Array.isArray(input?.candidates) || !Array.isArray(input?.teams)) {
    return json({ error: "Faltan 'candidates' o 'teams'" }, 400);
  }
  if (input.candidates.length > MAX_CANDIDATES) {
    return json({ error: `Máximo ${MAX_CANDIDATES} candidatos por llamada` }, 400);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json(fallbackAll(input, "Falta el secreto GEMINI_API_KEY"));
  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";

  return json(await explainWithGemini(input, { apiKey, model }));
});

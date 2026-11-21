// Edge function: el LLM solo EXTRAE, nunca decide el ranking ni el equipo.
//   mode "requirements": texto de la necesidad/RFP → { musts, nices, minAvailabilityPct }
//   mode "skills":       transcripción de la nota de voz → [{ skill, project, evidence_quote }]
// Usa un endpoint compatible con OpenAI Chat Completions. Por defecto, el AI Gateway de Lovable
// (Lovable genera LOVABLE_API_KEY por proyecto). Si no está disponible, poned AI_GATEWAY_URL y AI_API_KEY de otro proveedor.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const PROMPTS = {
  requirements: `Eres un analista de staffing. A partir de la descripción de un proyecto o de un extracto de RFP, devuelve SOLO un JSON con esta forma:
{"musts": [capacidades obligatorias], "nices": [capacidades deseables], "minAvailabilityPct": número 0-100 o null}
Usa nombres de capacidad cortos y normalizados (p. ej. "Azure", "Java", "Ciberseguridad", "SAP S/4HANA"). No inventes requisitos que no aparezcan.`,
  skills: `A partir de esta transcripción de una nota de voz de un empleado, extrae solo las experiencias profesionales concretas que la persona dice haber tenido. Devuelve SOLO un JSON:
[{"skill": nombre normalizado (p. ej. "Azure", "Liderazgo de equipo"), "project": nombre del proyecto o null, "evidence_quote": fragmento LITERAL de la transcripción}]
No infieras niveles, potencial ni habilidades que no se mencionen explícitamente. Si no hay ninguna, devuelve [].`,
} as const;

function parseJson(text: string): unknown {
  const match = text.match(/[\[{][\s\S]*[\]}]/);
  if (!match) throw new Error("El modelo no devolvió JSON");
  return JSON.parse(match[0]);
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { mode, text } = await req.json();
    if (mode !== "requirements" && mode !== "skills") return json({ error: "mode debe ser 'requirements' o 'skills'" }, 400);
    if (typeof text !== "string" || !text.trim()) return json({ error: "Falta 'text'" }, 400);

    const url = Deno.env.get("AI_GATEWAY_URL") ?? "https://ai.gateway.lovable.dev/v1/chat/completions";
    const key = Deno.env.get("AI_API_KEY") ?? Deno.env.get("LOVABLE_API_KEY");
    // Comprobad el viernes qué modelos ofrece vuestro gateway y ajustad AI_MODEL.
    const model = Deno.env.get("AI_MODEL") ?? "google/gemini-2.5-flash";
    if (!key) return json({ error: "Falta AI_API_KEY o LOVABLE_API_KEY" }, 500);

    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: "system", content: PROMPTS[mode] },
          { role: "user", content: text },
        ],
      }),
    });
    if (!res.ok) return json({ error: `LLM respondió ${res.status}`, detail: await res.text() }, 502);
    const data = await res.json();
    const parsed = parseJson(data.choices?.[0]?.message?.content ?? "");

    if (mode === "skills") {
      // Barrera anti-alucinación: solo pasan las skills cuya cita aparece LITERALMENTE en la transcripción.
      const items = Array.isArray(parsed) ? parsed : [];
      const transcript = norm(text);
      const accepted = items.filter((i) => i?.skill && i?.evidence_quote && transcript.includes(norm(String(i.evidence_quote))));
      return json({ skills: accepted, rejected: items.length - accepted.length });
    }
    return json(parsed);
  } catch (e) {
    return json({ error: "Error en la extracción", detail: String(e) }, 500);
  }
});

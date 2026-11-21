// Edge function: nota de voz → texto con ElevenLabs Speech-to-Text.
// La API key vive como secreto de Supabase (ELEVENLABS_API_KEY) y nunca llega al navegador.
// Petición: multipart/form-data con el campo "audio" (webm/mp3/wav). Respuesta: { text, language_code }.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MAX_BYTES = 10 * 1024 * 1024; // una nota de 15 s ocupa muy poco; esto evita abusos

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Usa POST" }, 405);

  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) return json({ error: "Falta el secreto ELEVENLABS_API_KEY" }, 500);

  try {
    const form = await req.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File)) return json({ error: "Falta el campo 'audio'" }, 400);
    if (audio.size > MAX_BYTES) return json({ error: "Audio demasiado grande" }, 413);

    const body = new FormData();
    body.append("file", audio, audio.name || "nota.webm");
    // Comprobad el viernes el modelo vigente en la doc de ElevenLabs (scribe_v2 / scribe_v1).
    body.append("model_id", Deno.env.get("ELEVENLABS_STT_MODEL") ?? "scribe_v2");
    body.append("language_code", "es");

    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body,
    });
    if (!res.ok) return json({ error: `ElevenLabs respondió ${res.status}`, detail: await res.text() }, 502);

    const data = await res.json();
    return json({ text: data.text ?? "", language_code: data.language_code ?? null });
  } catch (e) {
    return json({ error: "Error transcribiendo", detail: String(e) }, 500);
  }
});

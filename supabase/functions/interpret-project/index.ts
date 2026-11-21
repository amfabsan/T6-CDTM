// Edge function interpret-project · pasos 1-3 del workflow de ORBIT AI.
//   1. Recibe el plan: PDF (multipart, campo "file") o texto ({ "project_text": "..." }). Si el PDF no tiene texto
//      (escaneado), responde 422 "pdf_sin_texto" para que la UI pida pegarlo a mano.
//   2. Gemini interpreta el plan con el vocabulario cerrado del dataset (RPC vocabulario_orbit).
//   3. El código valida la salida: elimina lo que no existe en el vocabulario y lo apunta en `review`.
// El paso 4 (revisión humana y guardado en project_requirements) lo hace la UI con `row_template`.
// Secretos: GEMINI_API_KEY (obligatorio) y GEMINI_MODEL (opcional). SUPABASE_URL y SUPABASE_ANON_KEY los pone Supabase.
import { createClient } from "npm:@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "npm:unpdf@0.12.1";
import { corsHeaders, json } from "../_shared/cors.ts";
import { callGemini, toProjectRequirementsRow, validateInterpretation, type Vocabulario } from "../_shared/interpret.ts";

const MIN_CHARS = 80;          // menos texto que esto en un PDF = probablemente escaneado
const MAX_PDF_BYTES = 15 * 1024 * 1024;

let vocabCache: Vocabulario | null = null;

async function getVocab(): Promise<Vocabulario> {
  if (vocabCache) return vocabCache;
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data, error } = await supabase.rpc("vocabulario_orbit");
  if (error || !data) throw new Error(`No se pudo leer el vocabulario: ${error?.message ?? "vacío"}`);
  vocabCache = data as Vocabulario;
  return vocabCache;
}

async function pdfToText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return (Array.isArray(text) ? text.join("\n") : text).replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Usa POST" }, 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json({ error: "Falta el secreto GEMINI_API_KEY" }, 500);

  try {
    // ── 1. texto del plan
    let text = "";
    let source: "pdf" | "texto" = "texto";
    const ctype = req.headers.get("content-type") ?? "";
    if (ctype.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      const pasted = form.get("project_text");
      if (file instanceof File) {
        if (file.size > MAX_PDF_BYTES) return json({ error: "PDF demasiado grande (máx. 15 MB)" }, 413);
        source = "pdf";
        text = await pdfToText(new Uint8Array(await file.arrayBuffer()));
        if (text.length < MIN_CHARS) {
          return json({
            error: "pdf_sin_texto",
            message: "El PDF no tiene texto seleccionable (parece escaneado). Pega el contenido del plan a mano.",
          }, 422);
        }
      } else if (typeof pasted === "string") {
        text = pasted.trim();
      }
    } else {
      const body = await req.json().catch(() => ({}));
      text = String(body.project_text ?? body.project_description ?? "").trim();
    }
    if (text.length < 20) return json({ error: "Falta el plan: sube un PDF o pega el texto (mín. 20 caracteres)." }, 400);

    // ── 2. interpretación (LLM) con el vocabulario del dataset
    const vocab = await getVocab();
    const raw = await callGemini(text, vocab, { apiKey, model: Deno.env.get("GEMINI_MODEL") ?? undefined });

    // ── 3. validación (código)
    const { requirements, review } = validateInterpretation(raw, vocab);

    return json({
      source,
      source_text: text,
      interpretation_raw: raw,         // se guarda tal cual en project_requirements.interpretation_raw
      requirements,                    // lo que la UI muestra y deja editar (paso 4)
      review,                          // lo eliminado/corregido/para revisar, visible para el manager
      row_template: toProjectRequirementsRow(requirements, {
        description: text.slice(0, 2000), source_text: text, interpretation_raw: raw, review,
      }),
    });
  } catch (e) {
    return json({ error: "Error interpretando el plan", detail: String(e instanceof Error ? e.message : e) }, 500);
  }
});

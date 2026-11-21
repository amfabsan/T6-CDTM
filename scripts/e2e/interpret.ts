// Paso 2 real (callGemini + validateInterpretation) sobre los briefs, sin Supabase.
// node --env-file=.env --experimental-strip-types scripts/e2e/interpret.ts <vocab.json> <outdir>
import { readFileSync, writeFileSync } from "node:fs";
import { callGemini, validateInterpretation } from "../../supabase/functions/_shared/interpret.ts";
const [vocabPath, outDir] = process.argv.slice(2);
const vocab = JSON.parse(readFileSync(vocabPath, "utf8"));
const briefs = JSON.parse(readFileSync(new URL("./briefs.json", import.meta.url), "utf8"));
const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_EXPLAIN;
import { existsSync } from "node:fs";
for (const b of briefs) {
  if (existsSync(`${outDir}/plan_${b.id}.json`)) { console.log(`${b.id}: ya interpretado`); continue; }
  const t0 = Date.now();
  const raw = await callGemini(b.texto, vocab, { apiKey, model: process.env.GEMINI_MODEL || undefined });
  const { requirements, review } = validateInterpretation(raw, vocab);
  writeFileSync(`${outDir}/plan_${b.id}.json`, JSON.stringify({ requirements, review, interpretation_raw: raw }, null, 1));
  console.log(`${b.id}: ${((Date.now() - t0) / 1000).toFixed(1)} s · ${requirements.roles.length} roles · review ${review.length}`);
}

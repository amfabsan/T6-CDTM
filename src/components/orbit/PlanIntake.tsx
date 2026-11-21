import { useEffect, useRef, useState } from "react";
import { ArrowUp, Paperclip, ScanText } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_SOURCE_TEXT } from "@/lib/mock-data";

const PROMPTS = [
  { label: "Pagos instantáneos para un banco", text: MOCK_SOURCE_TEXT },
  { label: "App móvil para una aseguradora", text: "Necesito un equipo para una app móvil de una aseguradora en Barcelona, modalidad remota: dos desarrolladores React Native con 4 años de experiencia y un QA con automatización. Se valora experiencia en seguros. Inglés B2." },
  { label: "Migración SAP en sector público", text: "Proyecto de migración a SAP S/4HANA para un organismo público en Madrid, presencial: un arquitecto SAP senior (10 años) y dos consultores FI/CO. Se exige residencia en España." },
];

/** Conversational hero: talk to ORBIT or drop the PDF plan. */
export function PlanIntake({ onFile, onText, scannedError }: { onFile: (f: File) => void; onText: (t: string) => void; scannedError?: boolean }) {
  const [drag, setDrag] = useState(false);
  const [text, setText] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (scannedError) textRef.current?.focus(); }, [scannedError]);
  const send = () => text.trim() && onText(text);
  return (
    <div className="mx-auto max-w-3xl py-6">
      <h2 className="text-center text-4xl font-bold leading-tight md:text-5xl">
        El mejor candidato ya trabaja aquí.<br /><span className="text-blue">ORBIT lo encuentra.</span>
      </h2>
      {scannedError && (
        <div role="alert" className="mt-8 flex items-start gap-3 border border-gold bg-warn-soft p-4 text-sm">
          <ScanText className="mt-0.5 size-5 text-warn-ink" aria-hidden />
          <p className="text-warn-ink"><b>Este PDF no tiene texto (parece escaneado).</b> Pega el contenido en el cuadro de texto.</p>
        </div>
      )}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
        className={cn("card relative mt-10 p-3 transition-all duration-200 focus-within:glow-ai", drag ? "border-blue bg-blue/5" : "")}
      >
        <label htmlFor="plan-text" className="sr-only">Cuéntale a ORBIT qué proyecto tienes</label>
        <textarea ref={textRef} id="plan-text" value={text} onChange={(e) => setText(e.target.value)} rows={4}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }}
          placeholder="Cuéntale a ORBIT qué proyecto tienes o suelta el plan en PDF"
          className="w-full resize-none bg-transparent p-3 text-lg outline-none placeholder:text-muted-foreground" />
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => input.current?.click()} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground">
            <Paperclip className="size-4" aria-hidden />Adjuntar PDF
          </button>
          <button type="button" onClick={send} disabled={!text.trim()} aria-label="Enviar a ORBIT"
            className="grid size-11 place-items-center rounded-full bg-ai text-on-accent transition-all hover:glow-ai disabled:opacity-40">
            <ArrowUp className="size-5" />
          </button>
        </div>
        {drag && <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-2xl text-lg font-semibold text-ai">Suelta el plan aquí</div>}
        <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {PROMPTS.map((p) => (
          <button key={p.label} onClick={() => setText(p.text)} className="rounded-full border border-line bg-surface px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-blue hover:text-blue">
            {p.label}
          </button>
        ))}
      </div>
          </div>
  );
}

export function ScanningDoc() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-12" role="status" aria-live="polite">
      <div className="card relative h-80 w-64 overflow-hidden p-6">
        {Array.from({ length: 14 }, (_, i) => (
          <div key={i} className="mb-3 h-2 rounded-full bg-surface-2" style={{ width: `${55 + ((i * 37) % 45)}%` }} />
        ))}
        <div className="absolute inset-x-0 h-14 -translate-y-1/2 animate-scan bg-gradient-to-b from-transparent via-ai/30 to-transparent">
          <div className="absolute inset-x-0 top-1/2 h-px bg-ai" />
        </div>
      </div>
      <p className="mt-6 text-xl font-semibold text-blue">Leyendo el plan…</p>
      <p className="mt-1 text-sm text-muted-foreground">Detectando roles, plazas y requisitos</p>
    </div>
  );
}

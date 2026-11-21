import { useLayoutEffect, useRef, useState } from "react";
import { MissionWorld } from "./MissionVisuals";
import { OrbitButton } from "./primitives";
import { useElapsed } from "@/hooks/use-elapsed";
import { MOCK_SOURCE_TEXT } from "@/lib/mock-data";

const PROMPTS = [
  { label: "Pagos instantáneos para un banco", text: MOCK_SOURCE_TEXT },
  { label: "App móvil para una aseguradora", text: "Necesito un equipo para una app móvil de una aseguradora en Barcelona, modalidad remota: dos desarrolladores React Native con 4 años de experiencia y un QA con automatización. Se valora experiencia en seguros. Inglés B2." },
  { label: "Migración SAP en sector público", text: "Proyecto de migración a SAP S/4HANA para un organismo público en Madrid, presencial: un arquitecto SAP senior (10 años) y dos consultores FI/CO. Se exige residencia en España." },
];

/** Helper chips: each inserts a hint at the cursor so the manager remembers what ORBIT needs. */
const HINTS = [
  { label: "+ Roles y plazas", text: "Roles y plazas: " },
  { label: "+ Obligatorio / deseable", text: "Obligatorio: … Deseable: " },
  { label: "+ Años mínimos", text: "Años mínimos de experiencia: " },
  { label: "+ Idiomas", text: "Idiomas: " },
  { label: "+ Ubicación", text: "Ubicación o modalidad: " },
  { label: "+ Fecha de inicio", text: "Fecha de inicio: " },
];

const MIN_ROWS = 4;
const MAX_ROWS = 8;

/** Chat-like prompt box: the request is always typed (no PDF). */
export function PlanIntake({ onText, initialText = "" }: { onText: (t: string) => void; initialText?: string }) {
  const [text, setText] = useState(initialText);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const send = () => { if (text.trim()) onText(text.trim()); };

  // Auto-grow between MIN_ROWS and MAX_ROWS.
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    const line = parseFloat(cs.lineHeight) || 28;
    const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const max = line * MAX_ROWS + pad;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, line * MIN_ROWS + pad), max)}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, [text]);

  function insertHint(hint: string) {
    const el = textRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const before = text.slice(0, start);
    const prefix = before && !before.endsWith("\n") ? "\n" : "";
    const cursor = before.length + prefix.length + hint.length;
    setText(before + prefix + hint + text.slice(end));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(cursor, cursor); });
  }

  return (
    <div className="pb-4">
      <section className="mission-hero">
        <MissionWorld />
        <p className="mission-kicker relative z-10 mb-6">01 / Requisitos</p>
        <h1>El talento que necesitas<br /><em>ya está en la organización.</em></h1>
      </section>
      <h2 className="mx-auto mb-3 max-w-[820px] text-center text-2xl font-semibold">¿Qué equipo necesitas?</h2>
      <div className="card mission-input mx-auto mt-2 transition-all duration-200 focus-within:glow-ai">
        <label htmlFor="plan-text" className="sr-only">¿Qué equipo necesitas?</label>
        <textarea ref={textRef} id="plan-text" value={text} onChange={(e) => setText(e.target.value)} rows={MIN_ROWS}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
          placeholder="Describe el proyecto o la vacante: qué roles y cuántas personas, skills obligatorias y deseables, años de experiencia, idiomas, ubicación o modalidad y cuándo empieza"
          className="w-full resize-none bg-transparent p-3 text-lg outline-none placeholder:text-muted-foreground" />
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5" aria-label="Añadir pistas">
            {HINTS.map((h) => (
              <button key={h.label} type="button" onClick={() => insertHint(h.text)}
                className="rounded-full border border-line px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-blue hover:text-blue">
                {h.label}
              </button>
            ))}
          </div>
          <OrbitButton type="button" onClick={send} disabled={!text.trim()} aria-label="Interpretar requisitos" title="Enviar (Ctrl/Cmd + Enter)"
            className="shrink-0 px-4 py-2 text-xs">
            <span>Interpretar requisitos</span>
          </OrbitButton>
        </div>
      </div>
      <div className="mx-auto mt-4 flex max-w-3xl flex-wrap justify-center gap-2">
        {PROMPTS.map((p) => (
          <OrbitButton variant="ghost" key={p.label} onClick={() => setText(p.text)} className="rounded-full border border-line bg-surface px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-blue hover:text-blue">
            {p.label}
          </OrbitButton>
        ))}
      </div>
    </div>
  );
}

/** Loader while interpret-project runs (up to ~90 s), with elapsed seconds and Cancel. */
export function ReadingRequest({ onCancel }: { onCancel: () => void }) {
  const seconds = useElapsed();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-12" role="status" aria-live="polite">
      <div className="card relative h-56 w-48 overflow-hidden p-5">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="mb-3 h-2 rounded-full bg-surface-2" style={{ width: `${55 + ((i * 37) % 45)}%` }} />
        ))}
        <div className="absolute inset-x-0 h-14 -translate-y-1/2 animate-scan bg-gradient-to-b from-transparent via-ai/30 to-transparent">
          <div className="absolute inset-x-0 top-1/2 h-px bg-ai" />
        </div>
      </div>
      <p className="mt-6 text-xl font-semibold text-blue">ORBIT está leyendo la petición… <span className="tnum">{seconds}</span> s</p>
      <p className="mt-1 text-sm text-muted-foreground">Identificando roles, posiciones y requisitos. Puede tardar hasta ~90 s.</p>
      <OrbitButton variant="ghost" type="button" onClick={onCancel} className="mt-5">Cancelar</OrbitButton>
    </div>
  );
}

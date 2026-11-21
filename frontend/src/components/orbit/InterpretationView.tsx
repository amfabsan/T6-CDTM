import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import type { InterpretResult, Modality, Requirements, ReviewItem, SkillReq } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Chip, OrbitButton, Panel, SectionLabel } from "./primitives";

type Mapping = { key: string; phrase: string };

function buildSegments(text: string, maps: Mapping[]) {
  const found: { start: number; end: number; key: string }[] = [];
  const lower = text.toLowerCase();
  for (const m of maps) {
    const i = lower.indexOf(m.phrase.toLowerCase());
    if (i >= 0 && !found.some((f) => i < f.end && i + m.phrase.length > f.start)) found.push({ start: i, end: i + m.phrase.length, key: m.key });
  }
  found.sort((a, b) => a.start - b.start);
  const out: { text: string; key?: string }[] = [];
  let p = 0;
  for (const f of found) {
    if (f.start > p) out.push({ text: text.slice(p, f.start) });
    out.push({ text: text.slice(f.start, f.end), key: f.key });
    p = f.end;
  }
  out.push({ text: text.slice(p) });
  return out;
}

const reviewMeta = {
  eliminado: { icon: Trash2, tone: "text-gap", label: "Eliminado" },
  corregido: { icon: Wand2, tone: "text-ai", label: "Corregido" },
  revisar: { icon: AlertTriangle, tone: "text-rolloff", label: "Revisar" },
} as const;

export function ReviewPanel({ items }: { items: ReviewItem[] }) {
  return (
    <Panel className="border-ai/30">
      <div className="flex items-center gap-2"><Sparkles className="size-4 text-ai" aria-hidden /><h3 className="text-base font-semibold">Revisión</h3>
        <span className="ml-auto text-xs text-muted-foreground">Lo que ORBIT cambió y por qué</span></div>
      <ul className="mt-4 space-y-3">
        {items.map((r, i) => {
          const m = reviewMeta[r.type];
          return (
            <li key={i} className="flex gap-3 rounded-lg bg-surface-2/60 p-3">
              <m.icon className={cn("mt-0.5 size-4 shrink-0", m.tone)} aria-hidden />
              <div className="text-sm">
                <p><b className={m.tone}>{m.label}</b> · {r.item}</p>
                <p className="mt-0.5 text-muted-foreground">{r.reason}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function OrbitSummary({ result, req }: { result: InterpretResult; req: Requirements }) {
  const seats = req.roles.reduce((s, r) => s + r.seats, 0);
  const tr = req.roles.flatMap((r) => r.must).find((s) => s.source_phrase && s.source_phrase.toLowerCase() !== s.name.toLowerCase());
  const nRev = result.review.filter((r) => r.type === "revisar").length;
  return (
    <div className="flex max-w-2xl items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ai/15 text-ai"><Sparkles className="size-5" aria-hidden /></span>
      <div className="rounded-2xl rounded-tl-sm border border-ai/30 bg-surface px-5 py-4">
        <p className="text-xs font-medium text-ai">ORBIT</p>
        <p className="mt-1 text-lg leading-snug">
          He entendido <b className="font-display tnum">{req.roles.length} roles</b> y <b className="font-display tnum">{seats} plazas</b>.
          {tr && <> He traducido «{tr.source_phrase}» a <b className="text-ai">{tr.name}</b>.</>}
          {nRev > 0 && <> Revisa <b className="text-rolloff">{nRev} {nRev === 1 ? "punto" : "puntos"}</b>.</>}
        </p>
      </div>
    </div>
  );
}

export function InterpretationView({ result, onConfirm, busy }: { result: InterpretResult; onConfirm: (r: Requirements) => void; busy?: boolean }) {
  const [req, setReq] = useState<Requirements>(() => structuredClone(result.requirements));
  const [active, setActive] = useState<string | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const maps = useMemo<Mapping[]>(() => req.roles.flatMap((r) => [...r.must, ...r.nice].filter((s) => s.source_phrase).map((s) => ({ key: `${r.role_index}:${s.name}`, phrase: s.source_phrase! }))), [req]);
  const segments = useMemo(() => buildSegments(result.source_text, maps), [result.source_text, maps]);
  const keysInText = new Set(segments.filter((s) => s.key).map((s) => s.key));

  const draw = useCallback(() => {
    const root = box.current;
    if (!root || !active) return setLine(null);
    const a = root.querySelector(`[data-ph="${CSS.escape(active)}"]`);
    const b = root.querySelector(`[data-chip="${CSS.escape(active)}"]`);
    if (!a || !b) return setLine(null);
    const R = root.getBoundingClientRect(), ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const x1 = ra.right - R.left, y1 = ra.top + ra.height / 2 - R.top, x2 = rb.left - R.left, y2 = rb.top + rb.height / 2 - R.top;
    const dx = Math.max(40, (x2 - x1) / 2);
    setLine(`M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`);
  }, [active]);
  useLayoutEffect(() => {
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [draw, req]);

  const updRole = (i: number, patch: Partial<Requirements["roles"][number]>) =>
    setReq((r) => ({ ...r, roles: r.roles.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const setProj = (patch: Partial<Requirements["project"]>) => setReq((r) => ({ ...r, project: { ...r.project, ...patch } }));
  const inputCls = "rounded-md border border-transparent bg-transparent px-1 hover:border-line focus:border-ai outline-none";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <OrbitSummary result={result} req={req} />
        <div className="flex flex-wrap items-center gap-2">
          <Chip><span className="text-muted-foreground">Sector</span><input aria-label="Sector del cliente" className={cn(inputCls, "w-20")} value={req.project.client_sector} onChange={(e) => setProj({ client_sector: e.target.value })} /></Chip>
          <Chip><span className="text-muted-foreground">País</span><input aria-label="País" className={cn(inputCls, "w-20")} value={req.project.country} onChange={(e) => setProj({ country: e.target.value })} /></Chip>
          <Chip>
            <span className="text-muted-foreground">Modalidad</span>
            <select aria-label="Modalidad" className="bg-surface-2 outline-none" value={req.project.modality} onChange={(e) => setProj({ modality: e.target.value as Modality })}>
              <option value="remoto">remoto</option><option value="híbrido">híbrido</option><option value="presencial">presencial</option>
            </select>
          </Chip>
          <button onClick={() => setProj({ country_required: !req.project.country_required })} aria-pressed={req.project.country_required}>
            <Chip tone={req.project.country_required ? "ai" : "neutral"} icon={req.project.country_required ? <CheckCircle2 className="size-3.5" /> : undefined}>
              país exigido{req.project.country_required ? "" : ": no"}
            </Chip>
          </button>
        </div>
      </div>

      <div ref={box} className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <svg className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full overflow-visible lg:block" aria-hidden>
          {line && <><path d={line} fill="none" stroke="var(--ai)" strokeWidth="1.25" /><circle r="3" fill="var(--ai)"><animateMotion dur="1.2s" repeatCount="indefinite" path={line} /></circle></>}
        </svg>
        <Panel className="h-fit lg:sticky lg:top-24">
          <SectionLabel>Plan del proyecto</SectionLabel>
          <p className="mt-1 text-xs text-muted-foreground">Pasa el ratón por una frase resaltada para ver en qué requisito se convirtió.</p>
          <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-foreground/90">
            {segments.map((s, i) => s.key ? (
              <mark key={i} data-ph={s.key} tabIndex={0} onMouseEnter={() => setActive(s.key!)} onFocus={() => setActive(s.key!)} onMouseLeave={() => setActive(null)}
                className={cn("rounded px-0.5 text-foreground transition-colors", active === s.key ? "bg-ai/35 ring-1 ring-ai" : "bg-ai/15")}>{s.text}</mark>
            ) : <span key={i}>{s.text}</span>)}
          </div>
        </Panel>

        <div className="space-y-4">
          {req.roles.map((r, i) => (
            <Panel key={r.role_index} className="lift">
              <div className="flex flex-wrap items-baseline gap-2">
                <input aria-label="Título del rol" className={cn(inputCls, "min-w-0 flex-1 font-display text-xl font-semibold")} value={r.title} onChange={(e) => updRole(i, { title: e.target.value })} />
                <span className="font-display text-xl font-bold text-ai tnum">×<input aria-label="Plazas" type="number" min={1} className={cn(inputCls, "w-10")} value={r.seats} onChange={(e) => updRole(i, { seats: Math.max(1, +e.target.value) })} /></span>
                <span className="text-sm text-muted-foreground">plazas</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                <Chip><input aria-label="Seniority" className={cn(inputCls, "w-24")} value={r.seniority} onChange={(e) => updRole(i, { seniority: e.target.value })} /></Chip>
                <Chip>≥<input aria-label="Años mínimos" type="number" min={0} className={cn(inputCls, "w-12")} value={r.min_years} onChange={(e) => updRole(i, { min_years: +e.target.value })} />años</Chip>
              </div>
              <SkillGroup title="MUST-HAVE" note="filtran" tone="must" role={r.role_index} skills={r.must} active={active} keysInText={keysInText} setActive={setActive}
                onChange={(must) => updRole(i, { must })} />
              <SkillGroup title="NICE-TO-HAVE" note="suman, nunca excluyen" tone="nice" role={r.role_index} skills={r.nice} active={active} keysInText={keysInText} setActive={setActive}
                onChange={(nice) => updRole(i, { nice })} />
            </Panel>
          ))}
        </div>
      </div>

      <ReviewPanel items={result.review} />

      <div className="flex justify-end">
        <OrbitButton disabled={busy} onClick={() => onConfirm(req)} className="px-7 py-3 text-base">
          Confirmar y buscar talento <ArrowRight className="size-4" />
        </OrbitButton>
      </div>
    </div>
  );
}

function SkillGroup({ title, note, tone, role, skills, onChange, active, setActive, keysInText }: {
  title: string; note: string; tone: "must" | "nice"; role: number; skills: SkillReq[]; onChange: (s: SkillReq[]) => void;
  active: string | null; setActive: (k: string | null) => void; keysInText: Set<string | undefined>;
}) {
  const [adding, setAdding] = useState("");
  return (
    <div className="mt-4">
      <p className="mb-2 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground">{title} <span className="font-normal normal-case tracking-normal">· {note}</span></p>
      <div className="flex flex-wrap items-center gap-2">
        {skills.map((s) => {
          const key = `${role}:${s.name}`;
          return (
            <Chip key={s.name} data-chip={key} tone={tone} onMouseEnter={() => keysInText.has(key) && setActive(key)} onMouseLeave={() => setActive(null)}
              className={cn(active === key && "ring-2 ring-ai ring-offset-2 ring-offset-surface")}
              onRemove={() => onChange(skills.filter((x) => x !== s))}>
              {s.name}{tone === "must" && s.min_level != null && <span className="tnum opacity-75">≥ nivel {s.min_level}</span>}
            </Chip>
          );
        })}
        <form onSubmit={(e) => { e.preventDefault(); if (adding.trim()) { onChange([...skills, tone === "must" ? { name: adding.trim(), min_level: 3 } : { name: adding.trim() }]); setAdding(""); } }}
          className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5">
          <Plus className="size-3 text-muted-foreground" aria-hidden />
          <input aria-label={`Añadir ${title}`} value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="Añadir" className="w-16 bg-transparent text-xs outline-none" />
        </form>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getSkillCatalog } from "@/lib/api";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, Plus, Sparkles, Trash2, UsersRound, Wand2 } from "lucide-react";
import { jargonMappings } from "@/lib/mock-data";
import type { InterpretResult, Modality, Requirements, ReviewItem, RoleReq } from "@/lib/types";
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
  eliminado: { icon: Trash2, tone: "text-danger", label: "Removed" },
  corregido: { icon: Wand2, tone: "text-blue", label: "Corrected" },
  revisar: { icon: AlertTriangle, tone: "text-warn-ink", label: "Review" },
} as const;

const showValue = (v: unknown) => (v == null ? "—" : typeof v === "object" ? Object.values(v as object).filter(Boolean).join(" ") : String(v));

export function ReviewPanel({ items }: { items: ReviewItem[] }) {
  return (
    <section className="rounded-2xl border border-amber/30 bg-warn-soft p-4">
      <div className="flex items-center gap-2"><ClipboardCheck className="size-4 text-amber" aria-hidden /><h3 className="text-sm">Reviewed by the system</h3></div>
      <ul className="mt-3 flex flex-wrap gap-2">{items.map((r, i) => { const m = reviewMeta[r.action]; return <li key={i}><Chip tone="rolloff" title={`${showValue(r.value)} · ${r.path} · ${r.reason}`} icon={<m.icon className="size-3.5" />}>{m.label} · {showValue(r.value)}</Chip></li>; })}</ul>
    </section>
  );
}

export function OrbitSummary({ result, req }: { result: InterpretResult; req: Requirements }) {
  const seats = req.roles.reduce((s, r) => s + r.count, 0);
  const tr = jargonMappings(req.roles, result.review, result.source_text).find((m) => m.translated);
  const nRev = result.review.filter((r) => r.action === "revisar").length;
  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="grid size-12 place-items-center rounded-full border border-blue-400/40 bg-blue-400/10"><Sparkles className="size-5 text-blue-200" aria-hidden /></span>
      <h1 className="text-2xl">Requirements identified: {req.roles.length} roles · {seats} positions</h1>
      {tr && <Chip title={`Requirement identified: “${tr.phrase}” → ${tr.skill}`}>{tr.skill}</Chip>}
      {nRev > 0 && <Chip tone="rolloff" icon={<AlertTriangle className="size-3" />}>{nRev} to review</Chip>}
    </div>
  );
}

export function InterpretationView({ result, onConfirm, busy, error }: { result: InterpretResult; onConfirm: (r: Requirements, reviewedBy: string) => void; busy?: boolean; error?: string | null }) {
  const [req, setReq] = useState<Requirements>(() => structuredClone(result.requirements));
  const [reviewer, setReviewer] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const maps = useMemo(() => jargonMappings(req.roles, result.review, result.source_text), [req, result]);
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

  const updRole = (i: number, patch: Partial<RoleReq>) => setReq((r) => ({ ...r, roles: r.roles.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const setProj = (patch: Partial<Requirements["project"]>) => setReq((r) => ({ ...r, project: { ...r.project, ...patch } }));
  const [catalog, setCatalog] = useState<string[]>([]);
  useEffect(() => { getSkillCatalog().then(setCatalog).catch(() => {}); }, []);
  const inputCls = "border border-transparent bg-transparent px-1 hover:border-line focus:border-blue outline-none";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <OrbitSummary result={result} req={req} />
        <div className="flex flex-wrap items-center gap-2">
          <Chip><span className="text-muted-foreground">Sector</span><input aria-label="Client sector" className={cn(inputCls, "w-20")} value={req.project.client_sector} onChange={(e) => setProj({ client_sector: e.target.value })} /></Chip>
          <Chip><span className="text-muted-foreground">Country</span><input aria-label="Country" className={cn(inputCls, "w-20")} value={req.project.country} onChange={(e) => setProj({ country: e.target.value })} /></Chip>
          <Chip><span className="text-muted-foreground">City</span><input aria-label="City" className={cn(inputCls, "w-20")} value={req.project.city ?? ""} onChange={(e) => setProj({ city: e.target.value || null })} /></Chip>
          <Chip>
            <span className="text-muted-foreground">Work mode</span>
            <select aria-label="Work mode" className="bg-transparent outline-none" value={req.project.modality ?? ""} onChange={(e) => setProj({ modality: (e.target.value || null) as Modality | null })}>
              <option value="">To be confirmed</option><option value="remoto">remote</option><option value="hibrido">hybrid</option><option value="presencial">on-site</option>
            </select>
          </Chip>
          <Chip tone={req.project.start_date ? "neutral" : "rolloff"}>
            <span>Start</span>
            <input type="date" aria-label="Start date" className={cn(inputCls)} value={req.project.start_date ?? ""} onChange={(e) => setProj({ start_date: e.target.value || null })} />
            {!req.project.start_date && <span>To be confirmed</span>}
          </Chip>
          <OrbitButton variant="ghost" className="border-0 p-0" onClick={() => setProj({ country_required: !req.project.country_required })} aria-pressed={req.project.country_required}>
            <Chip tone={req.project.country_required ? "ai" : "neutral"} icon={req.project.country_required ? <CheckCircle2 className="size-3.5" /> : undefined}>
              Country required: {req.project.country_required ? "yes" : "no"}
            </Chip>
          </OrbitButton>
        </div>
      </div>

      <div ref={box} className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <svg className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full overflow-visible lg:block" aria-hidden>
          {line && <><path d={line} fill="none" stroke="var(--blue)" strokeWidth="2" /><circle r="2.5" fill="var(--blue)"><animateMotion dur="1.2s" repeatCount="indefinite" path={line} /></circle></>}
        </svg>
        <Panel className="h-fit lg:sticky lg:top-32">
          <SectionLabel>Project plan</SectionLabel>
          
          <div className="mt-4 whitespace-pre-wrap text-sm leading-7">
            {segments.map((s, i) => s.key ? (
              <mark key={i} data-ph={s.key} tabIndex={0} onMouseEnter={() => setActive(s.key ?? null)} onFocus={() => setActive(s.key ?? null)} onMouseLeave={() => setActive(null)}
                className={cn("px-0.5 text-navy transition-colors", active === s.key ? "bg-blue/20 ring-1 ring-blue" : "bg-blue/8")}>{s.text}</mark>
            ) : <span key={i}>{s.text}</span>)}
          </div>
        </Panel>

        <div className="space-y-4">
          {req.roles.map((r, i) => (
            <Panel key={i} className="mission-badge p-5">
              <div className="flex flex-wrap items-baseline gap-2"><UsersRound className="size-5 text-blue-200" aria-hidden />
                <input aria-label="Role title" className={cn(inputCls, "min-w-0 flex-1 text-xl font-bold text-navy")} value={r.title} onChange={(e) => updRole(i, { title: e.target.value })} />
                <span className="text-xl font-bold text-blue tnum">×<input aria-label="Positions" type="number" min={1} className={cn(inputCls, "w-10")} value={r.count} onChange={(e) => updRole(i, { count: Math.max(1, +e.target.value) })} /></span>
                <span className="text-sm text-muted-foreground">positions</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                <Chip><input aria-label="Minimum seniority" className={cn(inputCls, "w-24")} value={r.seniority_min} onChange={(e) => updRole(i, { seniority_min: e.target.value })} /></Chip>
                <Chip>≥<input aria-label="Minimum years" type="number" min={0} className={cn(inputCls, "w-12")} value={r.min_years_experience} onChange={(e) => updRole(i, { min_years_experience: +e.target.value })} />years</Chip>
                {r.languages.map((l, j) => <Chip key={l.name} onRemove={() => updRole(i, { languages: r.languages.filter((_, k) => k !== j) })}>{l.name}{l.level ? ` ≥ ${l.level}` : ""}</Chip>)}
                {r.certifications.map((c) => <Chip key={c} tone="ai" onRemove={() => updRole(i, { certifications: r.certifications.filter((x) => x !== c) })}>Required cert.: {c}</Chip>)}
                {r.certification_options.length > 0 && <Chip tone="ai" onRemove={() => updRole(i, { certification_options: [] })}>One of: {r.certification_options.join(" / ")}</Chip>}
              </div>
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold tracking-[0.1em] text-navy">EQUIVALENT ROLES</p>
                <div className="flex flex-wrap gap-2">
                  {r.matching_roles.map((m) => <Chip key={m} tone="role" onRemove={() => updRole(i, { matching_roles: r.matching_roles.filter((x) => x !== m) })}>{m}</Chip>)}
                  {r.matching_roles.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                </div>
              </div>
              <SkillGroup title="MANDATORY" note="scored; if missing, shown as a gap" tone="must" role={i} skills={r.mandatory_skills} active={active} keysInText={keysInText} setActive={setActive} catalog={catalog}
                onChange={(s) => updRole(i, { mandatory_skills: s.map((x) => ({ name: x.name, min_level: x.min_level ?? null })) })} />
              <SkillGroup title="DESIRABLE" note="add points, never exclude" tone="nice" role={i} skills={r.desirable_skills} active={active} keysInText={keysInText} setActive={setActive} catalog={catalog}
                onChange={(s) => updRole(i, { desirable_skills: s.map((x) => ({ name: x.name })) })} />
            </Panel>
          ))}
          <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">View details · Criteria</summary><p className="mt-2">
            Only people who are “Assigned” are excluded and, if the country is required, those outside it. Everything else (skills, years, seniority, languages, certifications) never excludes: it is scored and shown as a gap or risk.
          </p></details>
        </div>
      </div>

      <ReviewPanel items={result.review} />

      <div className="flex flex-col items-end gap-2">
        <div className="flex flex-wrap items-end justify-end gap-3">
          <label className="text-xs text-muted-foreground">Reviewed by <span aria-hidden className="text-gap">*</span>
            <input required aria-required value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="Name or email"
              className="mt-1 block w-60 border border-line bg-surface px-3 py-2 text-sm text-text outline-none focus:border-blue" />
          </label>
          <OrbitButton disabled={busy || !reviewer.trim()} onClick={() => onConfirm(req, reviewer.trim())} className="px-8 py-3 text-base">
            {busy ? "Confirming…" : "Confirm requirements"}
          </OrbitButton>
        </div>
        {error && <p role="alert" className="text-sm text-gap">Could not confirm the requirements: {error}</p>}
      </div>
    </div>
  );
}

type AnySkill = { name: string; min_level?: number | null };

function SkillGroup({ title, note, tone, role, skills, onChange, active, setActive, keysInText, catalog }: {
  catalog: string[];
  title: string; note: string; tone: "must" | "nice"; role: number; skills: AnySkill[]; onChange: (s: AnySkill[]) => void;
  active: string | null; setActive: (k: string | null) => void; keysInText: Set<string | undefined>;
}) {
  const [adding, setAdding] = useState("");
  return (
    <div className="mt-5">
      <p className="mb-2 text-xs font-semibold tracking-[0.1em] text-navy"><span title={note}>{title}</span></p>
      <div className="flex flex-wrap items-center gap-2">
        {skills.map((s) => {
          const key = `${role}:${s.name}`;
          return (
            <Chip key={s.name} data-chip={key} tone={tone} onMouseEnter={() => keysInText.has(key) && setActive(key)} onMouseLeave={() => setActive(null)}
              className={cn(active === key && "ring-2 ring-blue ring-offset-2 ring-offset-surface")}
              onRemove={() => onChange(skills.filter((x) => x !== s))}>
              {s.name}{tone === "must" && s.min_level != null && <span className="tnum opacity-80">≥ level {s.min_level}</span>}
            </Chip>
          );
        })}
        <form onSubmit={(e) => { e.preventDefault(); if (adding.trim()) { onChange([...skills, { name: adding.trim(), min_level: tone === "must" ? 3 : null }]); setAdding(""); } }}
          className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5">
          <Plus className="size-3 text-muted-foreground" aria-hidden />
          <input aria-label={`Add ${title}`} list={`cat-${role}-${tone}`} value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="Add" className="w-24 bg-transparent text-xs outline-none" />
          <datalist id={`cat-${role}-${tone}`}>{catalog.map((c) => <option key={c} value={c} />)}</datalist>
        </form>
      </div>
    </div>
  );
}

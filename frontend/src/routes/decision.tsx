import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Copy, FileDown, SlidersHorizontal, Sparkles, Trophy, X } from "lucide-react";
import { AppShell } from "@/components/orbit/AppShell";
import { DataTag, formatEs, OrbitButton, Panel, SectionLabel, SimPill } from "@/components/orbit/primitives";
import { useProject } from "@/lib/project-store";
import { buildTeams } from "@/lib/teams";
import { useCandidates } from "@/lib/use-candidates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/decision")({
  head: () => ({
    meta: [
      { title: "Decisión · ORBIT AI" },
      { name: "description", content: "Interno, externo o híbrido: decide y genera la propuesta de equipo." },
      { property: "og:title", content: "Decisión · ORBIT AI" },
      { property: "og:description", content: "Interno, externo o híbrido: decide y genera la propuesta de equipo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StepDecision,
});

function StepDecision() {
  const { data, req } = useCandidates();
  const { teamIndex } = useProject();
  const team = useMemo(() => (data ? buildTeams(req, data)[teamIndex] : undefined), [data, req, teamIndex]);
  const [months, setMonths] = useState(9);
  const [extRate, setExtRate] = useState(720);
  const [ramp, setRamp] = useState(15);
  const [panel, setPanel] = useState(false);
  const [proposal, setProposal] = useState(false);
  const days = months * 21;
  const seats = req.roles.reduce((s, r) => s + r.seats, 0);
  const internal = (team?.costPerDay ?? 0) * days;
  const external = extRate * seats * days * (1 + ramp / 100);
  const hybrid = internal * 0.6 + external * 0.4;
  const scen = [
    { k: "Interno", cost: internal, fit: team?.fit ?? 0, fitTag: "calculado" as const, start: team?.start ?? "Por confirmar" },
    { k: "Externo", cost: external, fit: null, fitTag: "supuesto" as const, start: "Por confirmar" },
    { k: "Híbrido", cost: hybrid, fit: team ? Math.round(team.fit * 0.9) : 0, fitTag: "calculado" as const, start: "Por confirmar" },
  ];
  const winner = scen.reduce((b, s) => (s.cost < b.cost ? s : b));
  const saving = Math.round(((Math.max(...scen.map((s) => s.cost)) - winner.cost) / Math.max(...scen.map((s) => s.cost))) * 100);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <p className="text-sm text-muted-foreground">Paso 4 · Decisión</p>
        <div className="mt-1 flex flex-wrap items-center gap-3"><h2 className="text-4xl font-bold">La decisión</h2><SimPill />
          <button onClick={() => setPanel(true)} className="ml-auto inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-muted-foreground hover:text-foreground"><SlidersHorizontal className="size-4" />Supuestos</button>
        </div>
        <p className="mt-3 text-lg">Con {months} meses de proyecto, <span className="text-ai"><b>{winner.k}</b> gana: ahorra un <b className="font-display tnum">{saving}%</b> frente a la opción más cara.</span></p>

        <div className="mt-8 grid items-end gap-4 md:grid-cols-3">
          {scen.map((s) => {
            const win = s === winner;
            return (
              <Panel key={s.k} className={cn("flex flex-col rounded-2xl transition-all", win ? "glow-ai min-h-[22rem] border-ai md:-translate-y-3" : "min-h-[19rem]")}>
                <div className="flex items-center justify-between"><h3 className="text-2xl font-bold">{s.k}</h3>{win && <Trophy className="size-5 text-ai" aria-label="Ganador" />}</div>
                <dl className="mt-6 space-y-4">
                  <div><dt className="flex items-center gap-2 text-xs text-muted-foreground">Coste total <DataTag kind="supuesto" /></dt><dd className="font-display text-3xl font-bold tnum">{formatEs(s.cost)} €</dd></div>
                  <div><dt className="flex items-center gap-2 text-xs text-muted-foreground">Encaje <DataTag kind={s.fitTag} /></dt><dd className="font-display text-2xl font-semibold tnum">{s.fit != null ? `${s.fit}%` : <span className="text-rolloff">Por estimar</span>}</dd></div>
                  <div><dt className="flex items-center gap-2 text-xs text-muted-foreground">Inicio <DataTag kind="dato" /></dt><dd className={cn("text-lg font-semibold", s.start === "Día 0" ? "text-bench" : "text-rolloff")}>{s.start}</dd></div>
                </dl>
                {win && <p className="mt-auto pt-6 text-sm"><b className="text-ai">Por qué gana:</b> el talento ya está en casa, con evidencia demostrada y sin coste de incorporación.</p>}
              </Panel>
            );
          })}
        </div>

        {!proposal && (
          <div className="mt-10 flex justify-center">
            <OrbitButton onClick={() => setProposal(true)} className="px-8 py-4 text-lg" disabled={!team}><Sparkles className="size-5" />Generar propuesta de equipo</OrbitButton>
          </div>
        )}
        {proposal && team && <Proposal team={team} projectName={req.project.name} req={req} />}
      </div>

      {panel && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal aria-label="Supuestos">
          <button className="absolute inset-0 bg-background/50" aria-label="Cerrar" onClick={() => setPanel(false)} />
          <aside className="glass absolute right-0 top-0 h-full w-full max-w-sm animate-in slide-in-from-right border-l border-line p-6">
            <div className="flex items-center justify-between"><h3 className="text-xl font-bold">Supuestos</h3><button autoFocus onClick={() => setPanel(false)} aria-label="Cerrar"><X className="size-5" /></button></div>
            {[
              { l: "Duración (meses)", v: months, set: setMonths, min: 3, max: 24, step: 1 },
              { l: "Tarifa externa (€/día)", v: extRate, set: setExtRate, min: 400, max: 1200, step: 20 },
              { l: "Sobrecoste incorporación externa (%)", v: ramp, set: setRamp, min: 0, max: 40, step: 5 },
            ].map((x) => (
              <label key={x.l} className="mt-6 block text-sm">
                <span className="flex justify-between"><span>{x.l} <DataTag kind="supuesto" /></span><b className="tnum">{formatEs(x.v)}</b></span>
                <input type="range" min={x.min} max={x.max} step={x.step} value={x.v} onChange={(e) => x.set(+e.target.value)} className="mt-2 w-full accent-[var(--ai)]" />
              </label>
            ))}
          </aside>
        </div>
      )}
    </AppShell>
  );
}

function Proposal({ team, projectName, req }: { team: NonNullable<ReturnType<typeof buildTeams>[number]>; projectName: string; req: ReturnType<typeof useCandidates>["req"] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (k: string, t: string) => { await navigator.clipboard.writeText(t); setCopied(k); setTimeout(() => setCopied(null), 1800); };
  return (
    <section className="mt-10 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-2xl font-bold">Propuesta lista para revisar</h3><SimPill />
        <p className="w-full text-sm text-muted-foreground">Todo es editable. Nada se envía automáticamente: tú decides.</p>
      </div>
      <Panel className="rounded-2xl">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <SectionLabel>Sección de la propuesta / RFP</SectionLabel>
          <div className="ml-auto flex gap-2">
            <OrbitButton variant="ghost" onClick={() => copy("p", ref.current?.innerText ?? "")}><Copy className="size-4" />{copied === "p" ? "Copiado" : "Copiar"}</OrbitButton>
            <OrbitButton variant="ghost" onClick={() => window.print()}><FileDown className="size-4" />Descargar PDF</OrbitButton>
          </div>
        </div>
        <div ref={ref} contentEditable suppressContentEditableWarning className="print-area rounded-xl border border-line bg-background/40 p-6 outline-none focus:border-ai">
          <h2 className="text-2xl font-bold">Equipo propuesto</h2>
          <p className="mt-1 text-sm text-muted-foreground">{projectName}</p>
          {team.members.map((m) => {
            const role = req.roles.find((r) => r.role_index === m.roleIndex);
            const covered = (role?.must.length ?? 0) - m.c.gaps.length;
            return (
              <div key={m.c.employee_id} className="mt-5 border-t border-line pt-4">
                <h3 className="text-lg font-semibold">{m.roleTitle} — {m.c.name}</h3>
                <p className="mt-1 text-sm">Perfil de {m.c.area} con experiencia directa en {m.c.evidence.filter((e) => e.kind === "skill").slice(0, 2).map((e) => e.label.split(" · ")[0]).join(" y ") || "el ámbito del rol"}.</p>
                <ul className="mt-2 list-disc pl-5 text-sm">{m.c.evidence.map((e) => <li key={e.ref}>{e.label}</li>)}</ul>
                <p className="mt-2 text-sm"><b>Cobertura de requisitos:</b> {covered} de {role?.must.length ?? 0} obligatorios{m.c.gaps.length ? ` (pendiente: ${m.c.gaps.join(", ")})` : ""}.</p>
              </div>
            );
          })}
        </div>
      </Panel>
      <div>
        <SectionLabel>Solicitudes a sus responsables actuales</SectionLabel>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {team.members.map((m) => (
            <RequestCard key={m.c.employee_id} name={m.c.name} role={m.roleTitle} project={projectName} copied={copied === m.c.employee_id} onCopy={(t) => copy(m.c.employee_id, t)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RequestCard({ name, role, project, copied, onCopy }: { name: string; role: string; project: string; copied: boolean; onCopy: (t: string) => void }) {
  const [text, setText] = useState(`Hola,\n\nEstamos formando el equipo de «${project}» y ${name} encaja muy bien como ${role}. ¿Podríamos hablar de su disponibilidad para incorporarse?\n\nGracias.`);
  return (
    <Panel>
      <label className="text-sm font-semibold" htmlFor={`m-${name}`}>Mensaje para el responsable de {name}</label>
      <textarea id={`m-${name}`} value={text} onChange={(e) => setText(e.target.value)} rows={6} className="mt-2 w-full rounded-lg border border-line bg-background/40 p-3 text-sm outline-none focus:border-ai" />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{copied ? "Copiado. Envíalo tú cuando quieras." : "No se envía solo."}</span>
        <OrbitButton variant="ghost" onClick={() => onCopy(text)}><Copy className="size-4" />Solicitar a {name.split(" ")[0]}</OrbitButton>
      </div>
    </Panel>
  );
}

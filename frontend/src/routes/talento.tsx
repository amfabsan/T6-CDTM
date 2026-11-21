import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Check, ChevronDown, X } from "lucide-react";
import { AppShell } from "@/components/orbit/AppShell";
import { CandidateCard } from "@/components/orbit/CandidateCard";
import { Funnel } from "@/components/orbit/Funnel";
import { OrbitLegend, OrbitMap } from "@/components/orbit/OrbitMap";
import { AvailabilityBadge, Chip, formatEs, OrbitButton, Panel, primaryLinkCls, SectionLabel, SimPill } from "@/components/orbit/primitives";
import { MOCK_INTERPRET } from "@/lib/mock-data";
import { selectTop, TOTAL_AVAILABLE, useExplanations, useMatching } from "@/lib/matching";
import { useProject } from "@/lib/project-store";
import type { MatchCandidate, RoleReq } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/talento")({
  head: () => ({
    meta: [
      { title: "Talento · ORBIT AI" },
      { name: "description", content: "Embudo y ranking de candidatos por rol, con gaps, riesgos y evidencia." },
      { property: "og:title", content: "Talento · ORBIT AI" },
      { property: "og:description", content: "Embudo y ranking de candidatos por rol, con gaps, riesgos y evidencia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StepTalent,
});

function StepTalent() {
  const { requirements } = useProject();
  const req = requirements ?? MOCK_INTERPRET.requirements;
  const { data: match, isLoading, isError } = useMatching();
  const roleTitles = match ? Object.keys(match.data.ranking) : [];
  const { data: explain } = useExplanations(false);
  const [tab, setTab] = useState(0);
  const [top, setTop] = useState(5);
  const [minFit, setMinFit] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const title = roleTitles[tab] ?? "";
  const roleReq = req.roles.find((r) => r.title === title);
  const rk = match?.data.ranking[title];
  const nFiltered = match?.data.n_filtrados[title] ?? 0;
  const excluded = match?.data.excluded[title] ?? [];
  const shown = useMemo(() => selectTop(rk?.items ?? [], minFit, top), [rk, minFit, top]);
  const compared = (rk?.items ?? []).filter((c) => compare.includes(c.employee_id));

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Paso 2 · Talento</p>
          <div className="mt-1 flex items-center gap-3"><h1 className="text-4xl">¿Quién encaja en este proyecto?</h1>{match?.simulated && <SimPill />}</div>
        </div>
        {!requirements && <Link to="/" className="text-sm text-blue hover:underline">Viendo el proyecto de ejemplo · Cargar un plan →</Link>}
      </div>

      {isLoading || !match ? (
        <p className="mt-16 text-center text-muted-foreground" role="status">{isError ? "No se ha podido calcular el encaje." : "Calculando encaje…"}</p>
      ) : (
        <>
          <div role="tablist" aria-label="Roles" className="mt-6 flex flex-wrap gap-2">
            {roleTitles.map((t, i) => {
              const plazas = req.roles.find((r) => r.title === t)?.count ?? 1;
              return (
                <button key={t} role="tab" aria-selected={tab === i} onClick={() => { setTab(i); setCompare([]); }}
                  className={cn("rounded-[40px] border px-4 py-2 text-sm font-medium transition-colors", tab === i ? "border-blue bg-blue text-on-accent" : "border-line bg-surface text-text hover:border-blue")}>
                  {t} · {plazas} {plazas === 1 ? "plaza" : "plazas"}
                </button>
              );
            })}
          </div>

          <p className="mt-6 text-lg">
            De <b className="text-navy tnum">{formatEs(TOTAL_AVAILABLE)}</b> personas disponibles, <b className="text-navy tnum">{formatEs(nFiltered)}</b> pasan el filtro; <b className="text-blue">estas {shown.length} encajan mejor.</b>
          </p>
          <section className="mt-4" aria-label="Embudo">
            <Funnel key={title} stages={[
              { value: TOTAL_AVAILABLE, label: "disponibles" },
              { value: nFiltered, label: "pasan el filtro", rules: ["no «Asignado»", ...(req.project.country_required ? [`en ${req.project.country}`] : [])] },
              { value: rk?.total ?? 0, label: "puntuados", rules: ["skills", "años", "seniority", "idiomas", "certificaciones"] },
              { value: shown.length, label: `Top ${top}`, rules: [`encaje ≥ ${minFit}%`] },
            ]} />
          </section>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div className="card flex items-center gap-1 rounded-full p-1" role="group" aria-label="Mostrar">
              <span className="px-2 text-xs text-muted-foreground">Mostrar:</span>
              {[3, 5, 10].map((n) => (
                <button key={n} aria-pressed={top === n} onClick={() => setTop(n)} className={cn("rounded-full px-3 py-1 text-xs font-medium", top === n ? "bg-blue text-on-accent" : "text-muted-foreground hover:text-navy")}>Top {n}</button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Encaje mínimo (%)
              <input type="range" min={0} max={95} step={5} value={minFit} onChange={(e) => setMinFit(+e.target.value)} className="accent-[var(--blue)]" />
              <b className="w-8 text-navy tnum">{minFit}</b>
            </label>
            <button onClick={() => setShowMap((v) => !v)} aria-pressed={showMap}
              className={cn("rounded-[40px] border px-4 py-1.5 text-xs font-medium", showMap ? "border-blue bg-blue/8 text-blue" : "border-navy text-navy")}>Vista mapa</button>
          </div>
          {shown.length < top && <p className="mt-3 text-sm font-medium text-warn-ink">Cumplen {shown.length} de los {top} pedidos.</p>}

          <section className={cn("mt-6 grid gap-6", showMap && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]")}>
            {showMap && (
              <Panel className="h-fit lg:sticky lg:top-32">
                <SectionLabel>Vista mapa · {title}</SectionLabel>
                <OrbitMap center={title} candidates={shown} activeId={activeId} onActive={setActiveId} />
                <OrbitLegend />
              </Panel>
            )}
            <ol className={cn("grid gap-4", !showMap && "xl:grid-cols-2")}>
              {shown.map((c, i) => (
                <li key={c.employee_id}>
                  <CandidateCard c={c} rank={i + 1} why={explain?.candidates.find((x) => x.employee_id === c.employee_id)} active={activeId === c.employee_id} onHover={(h) => setActiveId(h ? c.employee_id : null)}
                    compared={compare.includes(c.employee_id)} compareDisabled={compare.length >= 4}
                    onCompare={() => setCompare((s) => (s.includes(c.employee_id) ? s.filter((x) => x !== c.employee_id) : [...s, c.employee_id]))} />
                </li>
              ))}
            </ol>
          </section>

          <details className="card mt-8 p-5">
            <summary className="flex cursor-pointer items-center gap-2 font-semibold text-navy"><ChevronDown className="size-4" aria-hidden />Excluidos ({excluded.length})</summary>
            <p className="mt-2 text-sm text-muted-foreground">Nadie desaparece sin un motivo.</p>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1 font-medium">Persona</th><th className="font-medium">Encaje</th><th className="font-medium">Motivos</th></tr></thead>
              <tbody>
                {excluded.map((e) => (
                  <tr key={e.employee_id} className="border-t border-line">
                    <td className="py-2"><Link to="/persona/$id" params={{ id: e.employee_id }} className="text-blue hover:underline">{e.employee_id}</Link></td>
                    <td className="tnum">{Math.round(e.score)}%</td>
                    <td><span className="flex flex-wrap gap-1">{e.reasons.map((r) => <Chip key={r} tone="gap">{r}</Chip>)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>

          <div className="mt-8 flex justify-end">
            <Link to="/equipos" className={primaryLinkCls}>Ver equipos <ArrowRight className="size-4" /></Link>
          </div>
        </>
      )}

      {compare.length > 0 && !showCompare && (
        <div className="card fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-[40px] px-4 py-2 shadow-xl">
          <span className="text-sm"><b className="tnum">{compare.length}</b>/4 seleccionados</span>
          <OrbitButton variant="ghost" onClick={() => setShowCompare(true)} disabled={compare.length < 2}>Comparar</OrbitButton>
        </div>
      )}
      {showCompare && <CompareDrawer list={compared} role={roleReq} onClose={() => setShowCompare(false)} />}
    </AppShell>
  );
}

function CompareDrawer({ list, role, onClose }: { list: MatchCandidate[]; role?: RoleReq | undefined; onClose: () => void }) {
  const must = role?.mandatory_skills.map((s) => s.name) ?? [...new Set(list.flatMap((c) => c.skills.filter((s) => s.tipo === "obligatoria").map((s) => s.name)))];
  const has = (c: MatchCandidate, n: string) => c.skills.some((s) => s.name.toLowerCase() === n.toLowerCase());
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal aria-label="Comparar candidatos" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <button className="absolute inset-0 bg-navy/40" aria-label="Cerrar" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-4xl overflow-auto border-l border-line bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between"><h2 className="text-2xl">Comparar</h2><button onClick={onClose} autoFocus aria-label="Cerrar" className="rounded-full p-2 hover:bg-surface-2"><X className="size-5" /></button></div>
        <table className="mt-6 w-full text-sm">
          <thead><tr><th className="w-40" />{list.map((c) => <th key={c.employee_id} className="p-2 text-left text-navy">{c.nombre_completo}</th>)}</tr></thead>
          <tbody>
            <tr className="border-t border-line"><td className="p-2 text-muted-foreground">Encaje</td>{list.map((c) => <td key={c.employee_id} className="p-2 text-2xl font-bold text-navy tnum">{Math.round(c.score)}%</td>)}</tr>
            <tr className="border-t border-line"><td className="p-2 text-muted-foreground">Disponibilidad</td>{list.map((c) => <td key={c.employee_id} className="p-2"><AvailabilityBadge value={c.disponibilidad} /></td>)}</tr>
            {must.map((m) => (
              <tr key={m} className="border-t border-line"><td className="p-2 text-muted-foreground">{m}</td>
                {list.map((c) => <td key={c.employee_id} className="p-2">{has(c, m) ? <span className="inline-flex items-center gap-1 text-success-ink"><Check className="size-4" aria-hidden />Sí</span> : <span className="inline-flex items-center gap-1 text-danger"><X className="size-4" aria-hidden />No</span>}</td>)}
              </tr>
            ))}
            <tr className="border-t border-line"><td className="p-2 align-top text-muted-foreground">Gaps</td>{list.map((c) => <td key={c.employee_id} className="p-2 align-top"><span className="flex flex-wrap gap-1">{c.gaps.length ? c.gaps.map((g) => <Chip key={g} tone="gap">{g}</Chip>) : "Ninguno"}</span></td>)}</tr>
            <tr className="border-t border-line"><td className="p-2 align-top text-muted-foreground">Riesgos</td>{list.map((c) => <td key={c.employee_id} className="p-2 align-top"><span className="flex flex-wrap gap-1">{c.risks.length ? c.risks.map((r) => <Chip key={r} tone="rolloff">{r}</Chip>) : "Ninguno"}</span></td>)}</tr>
          </tbody>
        </table>
      </aside>
    </div>
  );
}

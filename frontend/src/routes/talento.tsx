import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Check, ChevronDown, X } from "lucide-react";
import { AppShell } from "@/components/orbit/AppShell";
import { CandidateCard } from "@/components/orbit/CandidateCard";
import { MatchingStatus } from "@/components/orbit/MatchingStatus";
import { Funnel } from "@/components/orbit/Funnel";
import { OrbitLegend, OrbitMap } from "@/components/orbit/OrbitMap";
import { AvailabilityBadge, Chip, OrbitButton, Panel, primaryLinkCls, SectionLabel, SimPill } from "@/components/orbit/primitives";
import { Crystal, FitGauge } from "@/components/orbit/MissionVisuals";
import { MOCK_INTERPRET } from "@/lib/mock-data";
import { selectTop, TOTAL_AVAILABLE, useExplanations, useMatching } from "@/lib/matching";
import { useProject } from "@/lib/project-store";
import type { MatchCandidate, RoleReq } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/talento")({
  head: () => ({
    meta: [
      { title: "Talent · ORBIT AI" },
      { name: "description", content: "Funnel and candidate ranking by role, with gaps, risks and evidence." },
      { property: "og:title", content: "Talent · ORBIT AI" },
      { property: "og:description", content: "Funnel and candidate ranking by role, with gaps, risks and evidence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StepTalent,
});

function StepTalent() {
  const { requirements } = useProject();
  const req = requirements ?? MOCK_INTERPRET.requirements;
  const { data: match, isLoading, error } = useMatching();
  const roleTitles = match ? Object.keys(match.data.ranking) : [];
  const { data: explain } = useExplanations(false);
  const [tab, setTab] = useState(0);
  const [top, setTop] = useState(5);
  const [minFit, setMinFit] = useState(0);
  const [showMap, setShowMap] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
          <p className="mission-kicker">02 / Candidates</p>
          <div className="mt-1 flex items-center gap-3"><h1 className="mission-title">Candidates by role</h1>{match?.simulated && <SimPill />}</div>
        </div>
        {!requirements && <Link to="/" className="text-sm text-blue hover:underline">Viewing the sample project · Write a request →</Link>}
      </div>

      {isLoading || !match ? (
        <MatchingStatus error={error} />
      ) : (
        <>
          <div role="tablist" aria-label="Roles" className="mt-6 flex flex-wrap gap-2">
            {roleTitles.map((t, i) => {
              const plazas = req.roles.find((r) => r.title === t)?.count ?? 1;
              return (
                <OrbitButton variant="ghost" key={t} role="tab" aria-selected={tab === i} onClick={() => { setTab(i); setCompare([]); }}
                  className={cn("rounded-[40px] border px-4 py-2 text-sm font-medium transition-colors", tab === i ? "border-blue bg-blue text-on-accent" : "border-line bg-surface text-text hover:border-blue")}>
                  {t} · {plazas} {plazas === 1 ? "position" : "positions"}
                </OrbitButton>
              );
            })}
          </div>

          <section className="mt-4" aria-label="Funnel">
            <Funnel key={title} stages={[
              { value: TOTAL_AVAILABLE, label: "Available" },
              { value: nFiltered, label: "Meet mandatory requirements", rules: ["not “Assigned”", ...(req.project.country_required ? [`in ${req.project.country}`] : [])] },
              { value: rk?.total ?? 0, label: "Shortlisted", rules: ["skills", "years", "seniority", "languages", "certifications"] },
              { value: shown.length, label: `Top ${top}`, rules: [`fit ≥ ${minFit}%`] },
            ]} />
          </section>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div className="card flex items-center gap-1 rounded-full p-1" role="group" aria-label="Show">
              <span className="px-2 text-xs text-muted-foreground">Show:</span>
              {[3, 5, 10].map((n) => (
                <OrbitButton variant="ghost" key={n} aria-pressed={top === n} onClick={() => setTop(n)} className={cn("rounded-full px-3 py-1 text-xs font-medium", top === n ? "bg-blue text-on-accent" : "text-muted-foreground hover:text-navy")}>Top {n}</OrbitButton>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Minimum fit (%)
              <input type="range" min={0} max={95} step={5} value={minFit} onChange={(e) => setMinFit(+e.target.value)} className="accent-[var(--blue)]" />
              <b className="w-8 text-navy tnum">{minFit}</b>
            </label>
            <OrbitButton variant="ghost" onClick={() => setShowMap((v) => !v)} aria-pressed={showMap}
              className={cn("rounded-[40px] border px-4 py-1.5 text-xs font-medium", showMap ? "border-blue bg-blue/8 text-blue" : "border-navy text-navy")}>Map view</OrbitButton>
          </div>
          {shown.length < top && <p className="mt-3 text-sm font-medium text-warn-ink">Only {shown.length} of the {top} requested meet the criteria.</p>}

          <section className={cn("mt-6 grid gap-8", showMap && "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]")}>
            {showMap && <div className="radar-surface"><h2 className="text-sm font-semibold text-blue-200">Fit map</h2><OrbitMap center={title} candidates={shown} activeId={activeId} onActive={setActiveId} onSelect={setSelectedId} /><OrbitLegend /></div>}
            <ol className="radar-list">{shown.map((c, i) => <li key={c.employee_id} className="candidate-rank" onMouseEnter={() => setActiveId(c.employee_id)} onMouseLeave={() => setActiveId(null)}>
              <span className="w-4 text-xs text-blue-200 tnum">{i + 1}</span>
              <OrbitButton variant="ghost" className="rank-select min-w-0 flex-1 justify-start border-0 px-0 py-0" onClick={() => setSelectedId(c.employee_id)}>
                <div className="avatar-crystal"><Crystal tone={c.disponibilidad === "En banca" ? "green" : "amber"} /><span>{c.nombre_completo.split(' ').slice(0, 2).map(n => n[0]).join('')}</span></div>
                <div className="min-w-0 text-left"><b className="block text-sm">{c.nombre_completo}</b><span className="mt-1 block text-xs text-blue-200">{c.puesto_actual}</span><span className="mt-2 block"><AvailabilityBadge value={c.disponibilidad} /></span></div>
              </OrbitButton>
              <FitGauge value={c.score} size={54} />
              <label className="text-[10px] text-blue-200"><input type="checkbox" aria-label={`Compare ${c.nombre_completo}`} checked={compare.includes(c.employee_id)} disabled={!compare.includes(c.employee_id) && compare.length >= 4} onChange={() => setCompare(s => s.includes(c.employee_id) ? s.filter(x => x !== c.employee_id) : [...s, c.employee_id])} /><span className="mt-1 block">Compare</span></label>
            </li>)}</ol>
          </section>
          {selectedId && (() => { const c = shown.find(x => x.employee_id === selectedId); return c ? <div onKeyDown={e => e.key === 'Escape' && setSelectedId(null)}><OrbitButton className="mission-backdrop rounded-none" variant="ghost" aria-label="Close candidate" onClick={() => setSelectedId(null)} /><aside className="mission-drawer" role="dialog" aria-modal aria-label="Candidate profile"><OrbitButton variant="ghost" autoFocus aria-label="Close candidate" onClick={() => setSelectedId(null)} className="mb-4 ml-auto flex size-9 p-0"><X className="size-4" /></OrbitButton><CandidateCard c={c} why={explain?.candidates.find(x => x.employee_id === c.employee_id)} compared={compare.includes(c.employee_id)} compareDisabled={compare.length >= 4} onCompare={() => setCompare(s => s.includes(c.employee_id) ? s.filter(x => x !== c.employee_id) : [...s, c.employee_id])} /></aside></div> : null; })()}

          <details className="card mt-8 p-5">
            <summary className="flex cursor-pointer items-center gap-2 font-semibold text-navy"><ChevronDown className="size-4" aria-hidden />Excluded ({excluded.length})</summary>
            <p className="mt-2 text-sm text-muted-foreground">Nobody disappears without a reason.</p>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1 font-medium">Person</th><th className="font-medium">Fit</th><th className="font-medium">Reasons</th></tr></thead>
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
            <Link to="/equipos" className={primaryLinkCls}>View team proposals <ArrowRight className="size-4" /></Link>
          </div>
        </>
      )}

      {compare.length > 0 && !showCompare && (
        <div className="card fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-[40px] px-4 py-2 shadow-xl">
          <span className="text-sm"><b className="tnum">{compare.length}</b>/4 selected</span>
          <OrbitButton variant="ghost" onClick={() => setShowCompare(true)} disabled={compare.length < 2}>Compare</OrbitButton>
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
    <div className="fixed inset-0 z-50" role="dialog" aria-modal aria-label="Compare candidates" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <OrbitButton variant="ghost" className="absolute inset-0 rounded-none border-0 bg-ink-900/70" aria-label="Close" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-4xl overflow-auto border-l border-line bg-ink-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between"><h2 className="text-2xl">Compare</h2><OrbitButton variant="ghost" onClick={onClose} autoFocus aria-label="Close" className="rounded-full p-2 hover:bg-surface-2"><X className="size-5" /></OrbitButton></div>
        <table className="mt-6 w-full text-sm">
          <thead><tr><th className="w-40" />{list.map((c) => <th key={c.employee_id} className="p-2 text-left text-navy">{c.nombre_completo}</th>)}</tr></thead>
          <tbody>
            <tr className="border-t border-line"><td className="p-2 text-muted-foreground">Fit</td>{list.map((c) => <td key={c.employee_id} className="p-2 text-2xl font-bold text-navy tnum">{Math.round(c.score)}%</td>)}</tr>
            <tr className="border-t border-line"><td className="p-2 text-muted-foreground">Availability</td>{list.map((c) => <td key={c.employee_id} className="p-2"><AvailabilityBadge value={c.disponibilidad} /></td>)}</tr>
            {must.map((m) => (
              <tr key={m} className="border-t border-line"><td className="p-2 text-muted-foreground">{m}</td>
                {list.map((c) => <td key={c.employee_id} className="p-2">{has(c, m) ? <span className="inline-flex items-center gap-1 text-success-ink"><Check className="size-4" aria-hidden />Yes</span> : <span className="inline-flex items-center gap-1 text-danger"><X className="size-4" aria-hidden />No</span>}</td>)}
              </tr>
            ))}
            <tr className="border-t border-line"><td className="p-2 align-top text-muted-foreground">Gaps</td>{list.map((c) => <td key={c.employee_id} className="p-2 align-top"><span className="flex flex-wrap gap-1">{c.gaps.length ? c.gaps.map((g) => <Chip key={g} tone="gap">{g}</Chip>) : "None"}</span></td>)}</tr>
            <tr className="border-t border-line"><td className="p-2 align-top text-muted-foreground">Risks</td>{list.map((c) => <td key={c.employee_id} className="p-2 align-top"><span className="flex flex-wrap gap-1">{c.risks.length ? c.risks.map((r) => <Chip key={r} tone="rolloff">{r}</Chip>) : "None"}</span></td>)}</tr>
          </tbody>
        </table>
      </aside>
    </div>
  );
}

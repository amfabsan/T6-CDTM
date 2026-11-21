import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { AppShell } from "@/components/orbit/AppShell";
import { CandidateCard } from "@/components/orbit/CandidateCard";
import { Funnel } from "@/components/orbit/Funnel";
import { OrbitLegend, OrbitMap } from "@/components/orbit/OrbitMap";
import { AvailabilityBadge, OrbitButton, Panel, SectionLabel, SimPill } from "@/components/orbit/primitives";
import { ScoreBar } from "@/components/orbit/ScoreBar";
import { ArrowRight } from "lucide-react";
import { MOCK_FUNNEL_AVAILABLE } from "@/lib/mock-data";
import { useCandidates } from "@/lib/use-candidates";
import { ProfileDrawer } from "@/components/orbit/ProfileDrawer";
import { formatEs } from "@/components/orbit/primitives";
import { useProject } from "@/lib/project-store";
import { cn } from "@/lib/utils";
import type { EnrichedCandidate } from "@/lib/types";

export const Route = createFileRoute("/talento")({
  head: () => ({
    meta: [
      { title: "Talento · ORBIT AI" },
      { name: "description", content: "Embudo, mapa orbital y ranking de candidatos por rol." },
      { property: "og:title", content: "Talento · ORBIT AI" },
      { property: "og:description", content: "Embudo, mapa orbital y ranking de candidatos por rol." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StepTalent,
});

function StepTalent() {
  const { requirements } = useProject();
  const { data, isLoading, req } = useCandidates();
  const [drawer, setDrawer] = useState<{ c: EnrichedCandidate; focus: string | null } | null>(null);
  const [tab, setTab] = useState(0);
  const [top, setTop] = useState(5);
  const [minFit, setMinFit] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const roleData = data?.[tab];
  const role = req.roles[tab];
  const shown = useMemo(() => (roleData?.enriched ?? []).filter((c) => c.fit >= minFit).slice(0, top), [roleData, minFit, top]);
  const mustRules = ["disponibilidad", `≥ ${role?.min_years ?? 0} años`, "idioma ≥ B2", "certificación", `ubicación (${req.project.modality})`];
  const compared = (roleData?.enriched ?? []).filter((c) => compare.includes(c.employee_id));

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Paso 2 · Talento</p>
            <h2 className="mt-1 text-4xl font-bold">¿Quién orbita este proyecto?</h2>
          </div>
          {!requirements && <Link to="/" className="text-xs text-muted-foreground hover:text-ai">Viendo el proyecto de ejemplo · Cargar un plan →</Link>}
        </div>

        <div role="tablist" aria-label="Roles" className="mt-6 flex flex-wrap gap-2">
          {req.roles.map((r, i) => (
            <button key={r.role_index} role="tab" aria-selected={tab === i} onClick={() => { setTab(i); setCompare([]); }}
              className={cn("rounded-full border px-4 py-2 text-sm font-medium transition-colors", tab === i ? "border-ai bg-ai/15 text-ai" : "border-line bg-surface text-muted-foreground hover:text-foreground")}>
              {r.title} <span className="tnum opacity-70">×{r.seats}</span>
            </button>
          ))}
        </div>

        {isLoading || !roleData ? (
          <p className="mt-16 text-center text-muted-foreground" role="status">Calculando órbitas…</p>
        ) : (
          <>
            <p className="mt-6 text-lg">
              De <b className="font-display tnum">{formatEs(MOCK_FUNNEL_AVAILABLE)}</b> personas disponibles, <b className="font-display tnum">{formatEs(roleData.n_filtrados)}</b> cumplen lo obligatorio; <span className="text-ai">estas {shown.length} encajan mejor.</span>
            </p>
            <section className="mt-4" aria-label="Embudo">
              <Funnel key={tab} stages={[
                { value: MOCK_FUNNEL_AVAILABLE, label: "disponibles" },
                { value: roleData.n_filtrados, label: "pasan los requisitos obligatorios", rules: mustRules },
                { value: Math.min(200, roleData.n_filtrados), label: "más parecidos", rules: ["búsqueda por texto", "búsqueda por significado"] },
                { value: shown.length, label: `Top ${top}`, rules: ["encaje ponderado"] },
              ]} />
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Panel className="h-fit lg:sticky lg:top-24">
                <div className="flex items-center justify-between">
                  <SectionLabel>Mapa orbital · {role?.title}</SectionLabel>
                  <SimPill />
                </div>
                <OrbitMap center={role?.title ?? ""} candidates={shown} activeId={activeId} onActive={setActiveId}
                  onSelect={(id) => document.getElementById(`c-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} />
                <OrbitLegend />
              </Panel>

              <div>
                <div className="mb-4 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1" role="group" aria-label="Mostrar">
                    <span className="px-2 text-xs text-muted-foreground">Mostrar:</span>
                    {[3, 5, 10].map((n) => (
                      <button key={n} aria-pressed={top === n} onClick={() => setTop(n)}
                        className={cn("rounded-full px-3 py-1 text-xs font-medium", top === n ? "bg-ai text-on-accent" : "text-muted-foreground hover:text-foreground")}>Top {n}</button>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    Encaje mínimo (%)
                    <input type="range" min={0} max={90} step={5} value={minFit} onChange={(e) => setMinFit(+e.target.value)} className="accent-[var(--ai)]" />
                    <b className="w-8 text-foreground tnum">{minFit}</b>
                  </label>
                </div>
                <ol className="space-y-3">
                  {shown.map((c, i) => (
                    <li key={c.employee_id} id={`c-${c.employee_id}`}>
                      <CandidateCard c={c} rank={i + 1} active={activeId === c.employee_id}
                        onHover={(h) => setActiveId(h ? c.employee_id : null)}
                        onOpenProfile={(focus) => setDrawer({ c, focus })}
                        compared={compare.includes(c.employee_id)} compareDisabled={compare.length >= 4}
                        onCompare={() => setCompare((s) => (s.includes(c.employee_id) ? s.filter((x) => x !== c.employee_id) : [...s, c.employee_id]))} />
                    </li>
                  ))}
                  {shown.length === 0 && <p className="text-sm text-muted-foreground">Nadie supera ese encaje mínimo. Bájalo para ver más personas.</p>}
                </ol>
                <div className="mt-6 flex justify-end">
                  <Link to="/equipos" className="inline-flex items-center gap-2 rounded-full bg-ai px-7 py-3 text-base font-semibold text-on-accent transition-all hover:glow-ai">
                    Ver equipos posibles <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      {compare.length > 0 && !showCompare && (
        <div className="glass fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full border border-line px-4 py-2 shadow-xl">
          <span className="text-sm"><b className="tnum">{compare.length}</b>/4 seleccionados</span>
          <OrbitButton variant="ghost" onClick={() => setShowCompare(true)} disabled={compare.length < 2}>Comparar</OrbitButton>
        </div>
      )}
      {drawer && <ProfileDrawer c={drawer.c} focus={drawer.focus} onClose={() => setDrawer(null)} />}
      {showCompare && <CompareOverlay list={compared} onClose={() => setShowCompare(false)} />}
    </AppShell>
  );
}

function CompareOverlay({ list, onClose }: { list: EnrichedCandidate[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/60 p-6 backdrop-blur-sm" role="dialog" aria-modal aria-label="Comparar candidatos" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className="glass max-h-[90vh] w-full max-w-6xl overflow-auto rounded-2xl border border-line p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold">Comparar</h3>
          <button onClick={onClose} aria-label="Cerrar" autoFocus className="rounded-full p-2 hover:bg-surface-2"><X className="size-5" /></button>
        </div>
        <div className="mt-6 grid gap-4" style={{ gridTemplateColumns: `repeat(${list.length}, minmax(0,1fr))` }}>
          {list.map((c) => (
            <div key={c.employee_id} className="rounded-xl border border-line bg-surface p-4">
              <p className="font-semibold">{c.name}</p>
              <p className="font-display text-5xl font-bold tnum">{c.fit}%</p>
              <div className="mt-2"><AvailabilityBadge value={c.availability} /></div>
              <div className="mt-4"><ScoreBar parts={c.breakdown} /></div>
              <SectionLabel><span className="mt-4 block">Evidencias</span></SectionLabel>
              <ul className="mt-1 space-y-1 text-xs">{c.evidence.map((e) => <li key={e.ref} className={e.demonstrated ? "text-bench" : e.demonstrated === false ? "text-rolloff" : ""}>{e.demonstrated ? "✓" : "○"} {e.label}</li>)}</ul>
              <SectionLabel><span className="mt-4 block">Huecos</span></SectionLabel>
              <p className="mt-1 text-xs">{c.gaps.length ? <span className="text-gap">⚠ {c.gaps.join(", ")}</span> : <span className="text-muted-foreground">Ninguno</span>}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

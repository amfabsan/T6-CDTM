import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CandidateCard } from "@/components/orbit/CandidateCard";
import { Funnel } from "@/components/orbit/Funnel";
import { OrbitLegend, OrbitMap } from "@/components/orbit/OrbitMap";
import { OrbitLogo, VoiceOrb } from "@/components/orbit/AppShell";
import { ReviewPanel } from "@/components/orbit/InterpretationView";
import {
  AnimatedNumber, AvailabilityBadge, Chip, DataTag, GapChip, HiddenTalentBadge, MeaningBadge, OrbitButton, Panel, PendingChip, SectionLabel, SimPill,
} from "@/components/orbit/primitives";
import { RingGauge } from "@/components/orbit/RingGauge";
import { ScoreBar } from "@/components/orbit/ScoreBar";
import { enrich, MOCK_INTERPRET, mockCandidates } from "@/lib/mock-data";

export const Route = createFileRoute("/design")({
  head: () => ({
    meta: [
      { title: "Sistema de diseño · ORBIT AI" },
      { name: "description", content: "Tokens, chips, badges, tarjetas, embudo, gauge y mapa orbital de ORBIT AI." },
      { property: "og:title", content: "Sistema de diseño · ORBIT AI" },
      { property: "og:description", content: "Tokens, chips, badges, tarjetas, embudo, gauge y mapa orbital de ORBIT AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DesignPage,
});

const role = MOCK_INTERPRET.requirements.roles[0]!;
const cands = (mockCandidates()[0]?.candidates ?? []).slice(0, 10).map((c, i) => enrich(c, role, i)).sort((a, b) => b.fit - a.fit);

const colors = [
  ["background", "#0B1020", "Fondo espacio"], ["surface", "#121A33", "Superficie"], ["surface-2", "#1A2447", "Superficie elevada"], ["border", "#2A3766", "Borde 1px"],
  ["ai", "#22D3EE", "IA · ORBIT lo encontró"], ["bench", "#A3E635", "En banca · evidencia demostrada"], ["rolloff", "#FBBF24", "Roll-off · solo declarada · pendiente"],
  ["gap", "#FB7185", "Huecos · MUST-HAVE ausente · riesgo"], ["hidden", "#A78BFA", "Talento oculto"],
] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-4"><h2 className="text-2xl font-bold">{title}</h2>{children}</section>;
}

function DesignPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-14 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <OrbitLogo />
          <h1 className="mt-4 text-5xl font-bold">Sistema de diseño</h1>
          <p className="mt-2 text-muted-foreground">El proyecto es el centro de gravedad. Cuanto más cerca orbita alguien, mejor encaja.</p>
        </div>
        <Link to="/" className="text-sm text-ai hover:underline">Ir a la app →</Link>
      </header>

      <Section title="Color con significado">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {colors.map(([t, hex, use]) => (
            <div key={t} className="overflow-hidden rounded-xl border border-line">
              <div className="h-16" style={{ background: `var(--${t === "surface-2" ? "surface-2" : t})` }} />
              <div className="bg-surface p-3 text-sm"><b>{t}</b> <span className="text-muted-foreground tnum">{hex}</span><p className="text-xs text-muted-foreground">{use}</p></div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tipografía">
        <Panel className="space-y-2">
          <p className="font-display text-6xl font-bold tnum">34.003</p>
          <p className="font-display text-3xl font-semibold">Space Grotesk · titulares y cifras</p>
          <p>Inter · texto de interfaz, números tabulares 0123456789</p>
        </Panel>
      </Section>

      <Section title="Chips y badges">
        <Panel className="space-y-4">
          <div className="flex flex-wrap gap-2"><Chip tone="must">Kubernetes <span className="opacity-75">≥ nivel 4</span></Chip><Chip tone="nice">CI/CD</Chip><Chip tone="ai">ORBIT lo encontró</Chip><Chip>Neutral</Chip></div>
          <div className="flex flex-wrap gap-2"><AvailabilityBadge value="En banca" /><AvailabilityBadge value="Roll-off próximo (<3 meses)" /><HiddenTalentBadge /><MeaningBadge /><GapChip skill="PCI-DSS" /><PendingChip>Por confirmar</PendingChip><PendingChip>Por estimar</PendingChip><Chip>Sin certificaciones</Chip></div>
          <div className="flex flex-wrap items-center gap-3"><SimPill /><DataTag kind="dato" /><DataTag kind="supuesto" /><DataTag kind="calculado" /></div>
          <div className="flex flex-wrap gap-3"><OrbitButton>Confirmar y buscar talento</OrbitButton><OrbitButton variant="ghost">Secundario</OrbitButton></div>
        </Panel>
      </Section>

      <Section title="Embudo"><Funnel stages={[{ value: 34003, label: "disponibles" }, { value: 1284, label: "pasan los requisitos obligatorios", rules: ["disponibilidad", "≥ 10 años", "idioma ≥ B2"] }, { value: 200, label: "más parecidos" }, { value: 5, label: "Top 5" }]} /></Section>

      <Section title="Contadores, barra de encaje y gauge">
        <div className="grid gap-4 md:grid-cols-3">
          <Panel><p className="font-display text-5xl font-bold text-ai"><AnimatedNumber value={87} suffix="%" /></p><p className="text-sm text-muted-foreground">Contador animado</p></Panel>
          <Panel><ScoreBar parts={cands[0]!.breakdown} /></Panel>
          <Panel className="flex items-center gap-4">
            <RingGauge value={2} total={3} label="Continuidad tras una baja" />
            <p className="text-sm text-muted-foreground">Si se va Lucía García, quedan 2 de 3 roles · sustituto: ninguno</p>
          </Panel>
        </div>
      </Section>

      <Section title="Mapa orbital + lista">
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel><OrbitMap center={role.title} candidates={cands} /><OrbitLegend /></Panel>
          <div className="space-y-3">{cands.slice(0, 2).map((c, i) => <CandidateCard key={c.employee_id} c={c} rank={i + 1} />)}</div>
        </div>
      </Section>

      <Section title="Revisión (confianza)"><ReviewPanel items={MOCK_INTERPRET.review} /></Section>

      <Section title="Superficie glass (solo overlays)">
        <div className="relative h-40 overflow-hidden rounded-xl border border-line bg-surface-2">
          <div className="absolute left-8 top-6 size-24 rounded-full bg-ai/40" /><div className="absolute right-16 bottom-4 size-20 rounded-full bg-hidden/40" />
          <div className="glass absolute inset-8 grid place-items-center rounded-xl border border-line"><SectionLabel>Overlay con blur</SectionLabel></div>
        </div>
      </Section>
      <VoiceOrb />
    </div>
  );
}

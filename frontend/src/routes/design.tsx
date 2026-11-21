import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CandidateCard } from "@/components/orbit/CandidateCard";
import { Funnel } from "@/components/orbit/Funnel";
import { OrbitLegend, OrbitMap } from "@/components/orbit/OrbitMap";
import { OrbitLogo } from "@/components/orbit/AppShell";
import { ReviewPanel } from "@/components/orbit/InterpretationView";
import {
  AnimatedNumber, AvailabilityBadge, Chip, DataTag, eur, GapChip, HiddenTalentBadge, IdealBadge, OrbitButton, Panel, PendingChip, SimPill,
} from "@/components/orbit/primitives";
import { RingGauge } from "@/components/orbit/RingGauge";
import { ScoreBar } from "@/components/orbit/ScoreBar";
import { MOCK_INTERPRET } from "@/lib/mock-data";
import mock from "@/mocks/matching.json";
import type { MatchResponse } from "@/lib/types";

export const Route = createFileRoute("/design")({
  head: () => ({
    meta: [
      { title: "Sistema de diseño · ORBIT AI" },
      { name: "description", content: "Tokens, chips, badges, tarjetas, embudo, gauge y mapa de ORBIT AI en estilo corporativo." },
      { property: "og:title", content: "Sistema de diseño · ORBIT AI" },
      { property: "og:description", content: "Tokens, chips, badges, tarjetas, embudo, gauge y mapa de ORBIT AI en estilo corporativo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DesignPage,
});

const role = MOCK_INTERPRET.requirements.roles[0]!;
const cands = ((mock as unknown as MatchResponse).ranking[role.title]?.items ?? []).slice(0, 10);

const colors = [
  ["navy", "#070F26", "Cabecera, pie, títulos, texto principal"], ["blue", "#0072BC", "Botones principales, enlaces, selección, barras"],
  ["gold", "#E6B600", "Acento: Equipo ideal, paso activo, cifras clave"], ["bg", "#F6F8FD", "Fondo de la app"], ["card", "#FFFFFF", "Tarjetas"],
  ["border", "#E6E6E6", "Bordes 1px"], ["text", "#3D4852", "Texto"], ["muted", "#8795A1", "Texto secundario"], ["danger", "#CD1517", "Huecos, errores"],
] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-4"><h2 className="text-2xl">{title}</h2>{children}</section>;
}

function DesignPage() {
  return (
    <div>
      <header className="bg-navy"><div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-4"><OrbitLogo /><Link to="/" className="text-sm text-on-accent/80 hover:text-on-accent">Ir a la app →</Link></div></header>
      <div className="mx-auto max-w-[1280px] space-y-14 px-6 py-10">
        <div>
          <h1 className="text-5xl">Sistema de diseño</h1>
          <p className="mt-2 text-lg">Estilo corporativo: claro, sobrio y orientado a la acción.</p>
        </div>
        <Section title="Colores">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {colors.map(([t, hex, use]) => (
              <div key={t} className="card">
                <div className="h-16 border-b border-line" style={{ background: `var(--${t})` }} />
                <div className="p-3 text-sm"><b className="text-navy">--{t}</b> <span className="text-muted-foreground tnum">{hex}</span><p className="text-xs text-muted-foreground">{use}</p></div>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Tipografía · Noto Sans">
          <Panel className="space-y-2">
            <p className="text-6xl font-bold text-navy tnum">34.003</p>
            <p className="text-3xl font-bold text-navy">Titulares 600–700</p>
            <p>Texto 400 con interlineado amplio. Frases cortas y verbos de acción. Importes: {eur(11800)} · {eur(70, "h")}</p>
          </Panel>
        </Section>
        <Section title="Botones, chips y badges">
          <Panel className="space-y-4">
            <div className="flex flex-wrap gap-3"><OrbitButton>Confirmar y buscar talento</OrbitButton><OrbitButton variant="ghost">Secundario</OrbitButton></div>
            <div className="flex flex-wrap gap-2"><Chip tone="must">Kubernetes <span className="opacity-80">≥ nivel 4</span></Chip><Chip tone="nice">CI/CD</Chip><Chip tone="role">Arquitecto Cloud</Chip><Chip tone="ai">ORBIT lo encontró</Chip><Chip>Neutral</Chip></div>
            <div className="flex flex-wrap gap-2"><AvailabilityBadge value="En banca" /><AvailabilityBadge value="Roll-off próximo (<3 meses)" /><HiddenTalentBadge /><GapChip skill="PCI-DSS" /><Chip tone="rolloff">Riesgo: roll-off</Chip><PendingChip>Por confirmar</PendingChip><IdealBadge /><Chip>Sin certificaciones</Chip></div>
            <div className="flex flex-wrap items-center gap-3"><SimPill /><DataTag kind="dato" /><DataTag kind="supuesto" /><DataTag kind="calculado" /></div>
          </Panel>
        </Section>
        <Section title="Embudo"><Funnel stages={[{ value: 34003, label: "disponibles" }, { value: 1284, label: "pasan los requisitos obligatorios", rules: ["disponibilidad", "≥ 10 años", "Inglés ≥ B2"] }, { value: 200, label: "más parecidos" }, { value: 5, label: "Top 5" }]} /></Section>
        <Section title="Contadores, barra de encaje y gauge">
          <div className="grid gap-4 md:grid-cols-3">
            <Panel><p className="text-5xl font-bold text-blue"><AnimatedNumber value={87} suffix="%" /></p><p className="text-sm text-muted-foreground">Contador animado</p></Panel>
            <Panel><ScoreBar breakdown={cands[0]!.breakdown} /></Panel>
            <Panel className="flex items-center gap-4"><RingGauge value={2} total={3} label="Continuidad tras una baja" /><p className="text-sm text-muted-foreground">Si se va Lucía García, quedan 2 de 3 roles · sustituto: ninguno</p></Panel>
          </div>
        </Section>
        <Section title="Lista de candidatos y vista mapa (secundaria)">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">{cands.slice(0, 2).map((c, i) => <CandidateCard key={c.employee_id} c={c} rank={i + 1} />)}</div>
            <Panel><OrbitMap center={role.title} candidates={cands} /><OrbitLegend /></Panel>
          </div>
        </Section>
        <Section title="Revisado por el sistema"><ReviewPanel items={MOCK_INTERPRET.review.slice(0, 4)} /></Section>
      </div>
    </div>
  );
}

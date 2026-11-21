import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/orbit/AppShell';
import { CandidateCard } from '@/components/orbit/CandidateCard';
import { Funnel } from '@/components/orbit/Funnel';
import { OrbitMap, OrbitLegend } from '@/components/orbit/OrbitMap';
import { ReviewPanel } from '@/components/orbit/InterpretationView';
import { CrewOrbit, Crystal, FitGauge, Planet, SkillDots } from '@/components/orbit/MissionVisuals';
import { AvailabilityBadge, Chip, DataTag, eur, HiddenTalentBadge, IdealBadge, OrbitButton, Panel, SimPill } from '@/components/orbit/primitives';
import { RingGauge } from '@/components/orbit/RingGauge';
import { teamNumbers } from '@/lib/team-presentation';
import { ScoreBar } from '@/components/orbit/ScoreBar';
import { MOCK_INTERPRET } from '@/lib/mock-data';
import mock from '@/mocks/matching.json';
import type { MatchResponse } from '@/lib/types';

export const Route = createFileRoute('/design')({
  head: () => ({ meta: [
    { title: 'Design system · ORBIT AI' },
    { name: 'description', content: 'ORBIT AI executive identity: colors, fit maps, indicators and team composition.' },
    { property: 'og:title', content: 'Design system · ORBIT AI' },
    { property: 'og:description', content: 'ORBIT AI executive identity: colors, fit maps, indicators and team composition.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }), component: DesignPage,
});
const data = mock as unknown as MatchResponse;
const role = MOCK_INTERPRET.requirements.roles[0];
const cands = (data.ranking[role?.title ?? '']?.items ?? []).slice(0, 5);
const colors = [
  ['ink-900', '#050E1F', 'bg-ink-900'], ['ink-700', '#0A1F44', 'bg-ink-700'], ['ink-500', '#12346E', 'bg-ink-500'],
  ['blue-400', '#3D8BFF', 'bg-blue-400'], ['blue-200', '#A9C9FF', 'bg-blue-200'], ['green', '#2BD9A0', 'bg-green'],
  ['amber', '#F5B841', 'bg-amber'], ['red', '#FF5C6C', 'bg-red'], ['white', '#FFFFFF', 'bg-foreground'],
];
function DesignPage() {
  const first = cands[0]; const team = data.teams[0]; const numOf = teamNumbers(data.teams);
  return <AppShell><div className="space-y-14">
    <div><p className="mission-kicker mb-4">ORBIT / Visual system</p><h1 className="mission-title">Design system</h1></div>
    <section><h2 className="mb-5 text-2xl">Corporate palette</h2><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{colors.map(([name, hex, cls]) => <div className="card overflow-hidden" key={name}><div className={`h-20 ${cls}`} /><div className="p-4"><b className="text-sm">{name}</b><p className="mt-1 text-xs text-blue-200">{hex}</p></div></div>)}</div></section>
    <section><h2 className="mb-5 text-2xl">Manrope</h2><div className="grid items-center gap-8 md:grid-cols-2"><div><p className="text-4xl font-semibold">Internal talent.<br /><span className="text-blue-200">Informed decisions.</span></p><p className="mt-5 text-5xl text-green tnum">34,003</p></div><Planet className="mx-auto w-full max-w-md" /></div></section>
    <section className="space-y-4"><h2 className="text-2xl">Signals and actions</h2><div className="flex flex-wrap gap-3"><OrbitButton>Interpret requirements</OrbitButton><OrbitButton variant="ghost">View details</OrbitButton></div><div className="flex flex-wrap gap-2"><AvailabilityBadge value="En banca" /><AvailabilityBadge value="Roll-off próximo (<3 meses)" /><HiddenTalentBadge /><Chip tone="gap">Gap: PCI-DSS</Chip><Chip tone="rolloff">To be confirmed</Chip><IdealBadge /><SimPill /></div><div className="flex flex-wrap items-center gap-3"><DataTag kind="dato" /><DataTag kind="supuesto" /><DataTag kind="calculado" /><span>{eur(11800)}</span><DataTag kind="supuesto" /></div></section>
    <section><h2 className="mb-5 text-2xl">Requirements by role</h2><div className="grid gap-6 md:grid-cols-2"><Panel><div className="flex items-center gap-3"><Crystal className="w-10" tone="green" /><h3 className="text-xl">Cloud architecture</h3><Chip tone="ai">×1</Chip></div><div className="my-4 flex gap-2"><Chip>Senior</Chip><Chip>10 years</Chip></div><div className="flex flex-wrap gap-2"><Chip tone="must">Kubernetes ≥4</Chip><Chip tone="must">AWS ≥4</Chip><Chip tone="nice">CI/CD</Chip></div></Panel><div className="flex items-center justify-center gap-7"><FitGauge value={92} size={110} /><RingGauge value={3} total={4} label="Continuity" /><SkillDots level={4} /></div></div></section>
    <section><h2 className="mb-5 text-2xl">Fit map</h2><Funnel stages={[{ value: 34003, label: 'Available' }, { value: 5047, label: 'Meet mandatory requirements' }, { value: 200, label: 'Shortlisted' }, { value: 5, label: 'Top 5' }]} /><div className="mt-4 grid items-start gap-8 lg:grid-cols-2"><div><OrbitMap center={role?.title ?? 'Project'} candidates={cands} /><OrbitLegend /></div>{first && <CandidateCard c={first} rank={1} />}</div></section>
    <section><h2 className="mb-5 text-2xl">Team composition</h2><div className="grid gap-6 md:grid-cols-2">{team && <Panel><div className="flex justify-between"><h3 className="text-xl">Team {numOf(team)}</h3><IdealBadge /></div><CrewOrbit members={team.members} /><div className="flex items-center justify-between"><FitGauge value={team.fit} size={100} /><RingGauge value={team.continuity.covered} total={team.continuity.total} label="Continuity" /></div><div className="mt-5 flex gap-2">{team.cost.value == null ? <Chip tone="rolloff">To be estimated</Chip> : <><b>{eur(team.cost.value)}</b><DataTag kind="supuesto" /></>}</div></Panel>}<div className="space-y-6">{first && <ScoreBar breakdown={first.breakdown} />}<ReviewPanel items={MOCK_INTERPRET.review.slice(0, 4)} /></div></div></section>
  </div></AppShell>;
}

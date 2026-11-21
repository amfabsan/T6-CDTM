import { Link } from '@tanstack/react-router';
import { UsersRound } from 'lucide-react';
import { AvailabilityBadge, eur, OrbitButton } from './primitives';
import { FitGauge } from './MissionVisuals';
import { memberAlternatives, topFourTeams } from '@/lib/team-presentation';
import type { MatchResponse, MatchTeam } from '@/lib/types';
import { setProject } from '@/lib/project-store';

export function TeamAlternatives({ match, team, employeeId, onTeam, numOf }: { match: MatchResponse; team: MatchTeam; employeeId?: string; onTeam?: (id: string) => void; numOf?: (t: MatchTeam) => number }) {
  const alternatives = topFourTeams(match.teams.filter(t => t.id !== team.id), { maxBudget: null, minFit: 0, latestStart: null, minContinuity: 0 }, 'fit').shown;
  return <section className="mt-10 space-y-8 border-t border-line pt-8" aria-label="Alternatives">
    <div><h2 className="text-2xl">Alternative teams</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {alternatives.map((t, i) => { const num = numOf ? numOf(t) : i + 1; return <div key={t.id} className="card p-4"><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">Team {num}</span><FitGauge value={t.fit} size={56} /></div><p className="mt-2 text-xs text-blue-200">{t.members.length} members · continuity {t.continuity.pct}%</p><p className="mt-2 text-sm">{t.cost.value == null ? 'To be estimated' : `${eur(t.cost.value)} · assumption`}</p>
        {onTeam ? <OrbitButton variant="ghost" className="mt-3 w-full" onClick={() => onTeam(t.id)}>View team {num}</OrbitButton> : <Link to="/equipos" onClick={() => setProject({ teamId: t.id })} className="mission-secondary mt-3 inline-flex w-full justify-center rounded-full px-4 py-2 text-sm">View team {num}</Link>}
      </div>; })}
      {alternatives.length === 0 && <p className="text-sm text-muted-foreground">No other proposals available.</p>}
    </div></div>
    <div><h2 className="text-2xl">Alternative members</h2><div className="mt-4 grid gap-6 md:grid-cols-2">
      {memberAlternatives(match, team, employeeId).map(({ role, candidates }) => <div key={role}><h3 className="flex items-center gap-2 text-sm text-blue-200"><UsersRound className="size-4" />{role}</h3><ul className="mt-2 divide-y divide-line">{candidates.map(c => <li key={c.employee_id} className="py-3"><Link to="/persona/$id" params={{ id: c.employee_id }} className="flex items-center justify-between gap-3 hover:text-blue-200"><span className="text-sm font-semibold">{c.nombre_completo}</span><span className="text-blue-200">{Math.round(c.score)}%</span></Link><div className="mt-2"><AvailabilityBadge value={c.disponibilidad} /></div></li>)}</ul>{candidates.length === 0 && <p className="mt-3 text-xs text-muted-foreground">No alternatives for this role.</p>}</div>)}
    </div></div>
  </section>;
}
import { cn } from '@/lib/utils';
import type { MatchTeamMember } from '@/lib/types';
import { Link } from '@tanstack/react-router';
import { setProject } from '@/lib/project-store';
import { availabilityLabel } from '@/lib/labels';

export function Crystal({ className, tone = 'blue-200' }: { className?: string; tone?: 'blue-200' | 'green' | 'amber' }) {
  return <svg viewBox="0 0 80 100" className={cn('crystal', `crystal-${tone}`, className)} aria-hidden="true"><path d="M39 3 69 24 76 66 39 96 5 67 12 25Z" className="crystal-base" /><path d="m39 3-8 36 8 57L5 67l7-42Z" className="crystal-light" /><path d="m39 3 30 21-38 15Z" className="crystal-facet" /><path d="m31 39 45 27-37 30Z" className="crystal-dark" /><path d="M39 3 69 24 76 66 39 96 5 67 12 25Z M12 25l19 14 38-15M31 39l8 57M31 39l45 27" className="crystal-outline" /></svg>;
}

export function Planet({ className }: { className?: string }) {
  return <svg viewBox="0 0 640 520" className={cn('mission-planet', className)} aria-hidden="true">
    <ellipse cx="320" cy="273" rx="280" ry="90" transform="rotate(-23 320 273)" className="planet-orbit" />
    <circle cx="320" cy="254" r="160" className="planet-base" />
    <path d="M249 110c-70 34-107 108-80 190 22 65 99 128 191 110-118-23-112-79-105-119 12-75 93-105-6-181Z" className="planet-shadow" />
    <path d="m365 100 51 80-41 28-6 41 89 40-18 64-74-13-30-68 14-61-51-37 16-82Z" className="planet-terrain" />
    <path d="m202 219 53-18 31 27-25 51-51-16Z M280 351l40-27 33 35-16 43-48-15Z" className="planet-terrain-secondary" />
    <path d="M53 330c100 45 413-47 519-150" className="planet-ring-front" />
    <path d="M68 351c106 45 422-44 517-144" className="planet-ring-fine" />
    <g className="planet-capsule"><path d="m333 184 36 22-11 58-42-14Z" className="capsule-body" /><path d="m333 184 8-17 34 22-6 17Z" className="capsule-top" /><path d="m327 209 23 14-4 19-23-14Z" className="capsule-window" /><path d="m316 250-19 8 18-28M358 264l12 21 0-33" className="capsule-leg" /></g>
    <circle cx="95" cy="319" r="6" className="planet-satellite" /><circle cx="544" cy="204" r="4" className="planet-satellite" />
  </svg>;
}

export function MissionWorld() {
  return <div className="mission-world" aria-hidden="true"><div className="world-orbit world-orbit-one" /><div className="world-orbit world-orbit-two" /><Planet /><Crystal className="world-crystal crystal-one" tone="green" /><Crystal className="world-crystal crystal-two" /><Crystal className="world-crystal crystal-three" /></div>;
}

export function FitGauge({ value, size = 80 }: { value: number; size?: number }) {
  const r = 42, circumference = 2 * Math.PI * r;
  return <svg width={size} height={size} viewBox="0 0 100 100" className="fit-gauge shrink-0" role="img" aria-label={`Fit ${Math.round(value)}%`}><circle cx="50" cy="50" r={r} className="gauge-track" /><circle cx="50" cy="50" r={r} className="gauge-value" strokeDasharray={`${Math.max(0, Math.min(100, value)) / 100 * circumference} ${circumference}`} transform="rotate(-90 50 50)" /><text x="50" y="47" textAnchor="middle" dominantBaseline="central" className="gauge-number">{Math.round(value)}</text><text x="50" y="67" textAnchor="middle" className="gauge-unit">%</text></svg>;
}

export function CrewOrbit({ members, teamId }: { members: MatchTeamMember[]; teamId?: string }) {
  return <div className="crew-orbit" aria-label={`Team composition: ${members.length} members`}><svg viewBox="0 0 280 140" aria-hidden="true"><ellipse cx="140" cy="70" rx="105" ry="44" className="planet-orbit" /><ellipse cx="140" cy="70" rx="65" ry="27" className="planet-ring-fine" /></svg><span className="crew-center">{members.length}<small title="Team composition">POSITIONS</small></span>{members.map((m, i) => { const angle = i / members.length * Math.PI * 2; return <Link to="/persona/$id" params={{ id: m.employee_id }} onClick={() => { if (teamId) setProject({ teamId, teamArrival: false }); }} aria-label={`View profile of ${m.nombre_completo}`} key={`${m.role}-${m.employee_id}`} className="crew-crystal" style={{ left: `${50 + Math.cos(angle) * 37}%`, top: `${50 + Math.sin(angle) * 32}%` }} title={`${m.nombre_completo} · ${Math.round(m.score)}% · ${availabilityLabel(m.disponibilidad)}`}><Crystal tone={m.disponibilidad === 'En banca' ? 'green' : 'amber'} /></Link>; })}</div>;
}

export function SkillDots({ level }: { level: number }) {
  return <span className="inline-flex gap-1" role="img" aria-label={`Level ${level} of 5`}>{Array.from({ length: 5 }, (_, i) => <i key={i} className={cn('size-2 rounded-full', i < level ? 'bg-green' : 'bg-blue-200/20')} />)}</span>;
}

import { useEffect, useState } from 'react';
import type { MatchCandidate } from '@/lib/types';

const SIZE = 620, C = SIZE / 2;
export const fitToRadius = (fit: number) => 78 + (100 - Math.max(0, Math.min(100, fit))) / 100 * 205;
export function OrbitMap({ center, candidates, activeId, onActive, onSelect }: { center: string; candidates: MatchCandidate[]; activeId?: string | null; onActive?: (id: string | null) => void; onSelect?: (id: string) => void }) {
  const [entered, setEntered] = useState(false);
  useEffect(() => { const t = setTimeout(() => setEntered(true), 60); return () => clearTimeout(t); }, [candidates]);
  const pts = candidates.map((c, i) => { const a = i * 2.399963 - Math.PI / 2, r = fitToRadius(c.score); return { c, x: Math.cos(a) * r, y: Math.sin(a) * r }; });
  const active = pts.find(p => p.c.employee_id === activeId);
  return <div className="relative mx-auto aspect-square w-full max-w-[620px]">
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" role="group" aria-label={`Mapa de encaje · ${center}. Más cerca del centro = mayor encaje.`}>
      {[{ r: fitToRadius(85), label: '≥85%' }, { r: fitToRadius(70), label: '70–85%' }, { r: 279, label: '<70%' }].map(({ r, label }) => <g key={label}><circle cx={C} cy={C} r={r} fill="none" stroke="var(--blue-200)" opacity=".25" strokeDasharray={r === 279 ? '3 7' : '0'} /><text x={C + 9} y={C - r - 8} fill="var(--blue-200)" fontSize="10">{label}</text></g>)}
      <path d={`M${C},15V605 M15,${C}H605`} stroke="var(--blue-200)" opacity=".08" />
      <g transform={`translate(${C},${C})`}><circle r="52" fill="var(--ink-700)" stroke="var(--blue-400)" strokeWidth="1.5" /><ellipse rx="76" ry="22" transform="rotate(-24)" fill="none" stroke="var(--blue-200)" strokeWidth="1" opacity=".3" /><path d="M-18-13H18V15H-18Z M-9-13V-20H9V-13 M-18 0H18" fill="none" stroke="var(--blue-200)" strokeWidth="2" /><text y="88" textAnchor="middle" fill="var(--white)" fontSize="11" fontWeight="600">PROYECTO</text></g>
      {pts.map(({ c, x, y }) => { const bench = c.disponibilidad === 'En banca'; const size = 15 + Math.min(c.evidence.length, 5) * 2; const hidden = c.risks.some(r => /talento oculto/i.test(r)); const color = bench ? 'var(--green)' : 'var(--amber)'; return <g key={c.employee_id} transform={`translate(${C + x},${C + y})`} opacity={entered ? 1 : 0} role={onSelect ? 'button' : 'img'} tabIndex={0} aria-label={`${c.nombre_completo}, encaje ${Math.round(c.score)}%, ${c.disponibilidad}`} onMouseEnter={() => onActive?.(c.employee_id)} onMouseLeave={() => onActive?.(null)} onFocus={() => onActive?.(c.employee_id)} onBlur={() => onActive?.(null)} onClick={() => onSelect?.(c.employee_id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(c.employee_id); } }} className="cursor-pointer transition-opacity duration-700">
        {(hidden || activeId === c.employee_id) && <circle r={size + 10} fill="none" stroke={hidden ? 'var(--blue-200)' : color} opacity=".6" />}
        <path d={`M0,-${size} ${size * .7},-${size * .35} ${size * .8},${size * .5} 0,${size} -${size * .8},${size * .5} -${size * .7},-${size * .35}Z`} fill="transparent" stroke={color} strokeWidth="2" />
        <path d={`M0,-${size} -${size * .18},0 0,${size} ${size * .8},${size * .5}Z`} fill="none" stroke={color} strokeWidth="1" opacity=".4" />
        <text y={size + 20} textAnchor="middle" fill="var(--white)" fontSize="10" fontWeight="600">{Math.round(c.score)}%</text>
      </g>; })}
    </svg>
    {active && <div className="card pointer-events-none absolute bottom-0 left-1/2 z-10 w-[min(90%,320px)] -translate-x-1/2 p-4 text-xs"><div className="flex justify-between gap-3"><b>{active.c.nombre_completo}</b><b className="text-blue-200">{Math.round(active.c.score)}%</b></div><p className="mt-1 text-blue-200">{active.c.disponibilidad}</p><div className="mt-2 flex flex-wrap gap-1">{active.c.evidence.slice(0, 3).map(e => <span key={e.proyecto + e.anio} className="rounded-md border border-line px-2 py-1">{e.proyecto} · {e.anio}</span>)}</div></div>}
  </div>;
}
export function OrbitLegend() {
  return <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-[11px] text-blue-200"><li className="w-full text-center">Más cerca del centro = mayor encaje</li><li className="flex items-center gap-1.5"><span className="text-green">◆</span>En banca</li><li className="flex items-center gap-1.5"><span className="text-amber">◆</span>Roll-off próximo (&lt;3 meses)</li><li title="Cuando el servicio identifica talento fuera de su área" className="flex items-center gap-1.5">◉ Talento fuera de su área</li></ul>;
}

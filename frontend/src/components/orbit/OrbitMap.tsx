import { useEffect, useState } from "react";
import type { MatchCandidate } from "@/lib/types";
import { cn } from "@/lib/utils";

const SIZE = 520, C = SIZE / 2, MIN_R = 62, MAX_R = 240;
export const fitToRadius = (fit: number) => MIN_R + ((100 - Math.max(40, Math.min(100, fit))) / 60) * (MAX_R - MIN_R);

export function OrbitMap({ center, candidates, activeId, onActive }: { center: string; candidates: MatchCandidate[]; activeId?: string | null; onActive?: (id: string | null) => void }) {
  const [entered, setEntered] = useState(false);
  useEffect(() => { setEntered(false); const t = setTimeout(() => setEntered(true), 60); return () => clearTimeout(t); }, [candidates]);
  const pts = candidates.map((c, i) => {
    const a = i * 2.399963 - Math.PI / 2, r = fitToRadius(c.score);
    return { c, a, x: Math.cos(a) * r, y: Math.sin(a) * r, i };
  });
  const active = pts.find((p) => p.c.employee_id === activeId);
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px]">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" role="group" aria-label={`Mapa de ${center}. Más cerca = mejor encaje.`}>
        {[90, 75, 60, 45].map((f) => (
          <g key={f}>
            <circle cx={C} cy={C} r={fitToRadius(f)} fill="none" stroke="var(--border)" strokeDasharray={f === 90 ? "0" : "2 6"} />
            <text x={C + 4} y={C - fitToRadius(f) - 4} fill="var(--muted)" fontSize="10">{f}%</text>
          </g>
        ))}
        <circle cx={C} cy={C} r={34} fill="var(--card)" stroke="var(--blue)" />
        <text x={C} y={C} textAnchor="middle" dominantBaseline="central" fill="var(--blue)" fontSize="11" fontWeight="700">ROL</text>
        {pts.map(({ c, a, x, y, i }) => {
          const bench = c.disponibilidad === "En banca";
          const col = bench ? "var(--success)" : "var(--warn)";
          const far = MAX_R + 30;
          return (
            <g key={c.employee_id} tabIndex={0} role="img" aria-label={`${c.nombre_completo}, encaje ${Math.round(c.score)}%, ${c.disponibilidad}`}
              onMouseEnter={() => onActive?.(c.employee_id)} onMouseLeave={() => onActive?.(null)} onFocus={() => onActive?.(c.employee_id)} onBlur={() => onActive?.(null)}
              className="cursor-pointer outline-none"
              style={{ transform: `translate(${C + (entered ? x : Math.cos(a) * far)}px, ${C + (entered ? y : Math.sin(a) * far)}px)`, opacity: entered ? 1 : 0, transition: `transform 900ms cubic-bezier(.2,.8,.2,1) ${i * 45}ms, opacity 600ms ${i * 45}ms` }}>
              {c.employee_id === activeId && <circle r={16} fill="none" stroke="var(--blue)" strokeWidth="1.5" />}
              {bench ? <circle r={7} fill={col} /> : <circle r={5.5} fill="var(--card)" stroke={col} strokeWidth="3" />}
            </g>
          );
        })}
      </svg>
      {active && (
        <div className="card pointer-events-none absolute z-10 w-56 p-3 text-xs shadow-xl"
          style={{ left: `${((C + active.x) / SIZE) * 100}%`, top: `${((C + active.y) / SIZE) * 100}%`, transform: `translate(${active.x > 0 ? "-105%" : "5%"}, -50%)` }}>
          <div className="flex items-baseline justify-between gap-2"><b className="text-sm text-navy">{active.c.nombre_completo}</b><span className="text-lg font-bold text-blue tnum">{Math.round(active.c.score)}%</span></div>
          <p className={cn("mt-0.5", active.c.disponibilidad === "En banca" ? "text-success-ink" : "text-warn-ink")}>{active.c.disponibilidad}</p>
          <p className="mt-1 text-muted-foreground">{active.c.evidence[0] ? `${active.c.evidence[0].proyecto} · ${active.c.evidence[0].anio}` : "Sin evidencias"}</p>
        </div>
      )}
    </div>
  );
}

export function OrbitLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <li className="flex items-center gap-1.5"><svg width="14" height="14"><circle cx="7" cy="7" r="6" fill="var(--success)" /></svg>En banca (punto lleno)</li>
      <li className="flex items-center gap-1.5"><svg width="14" height="14"><circle cx="7" cy="7" r="4.5" fill="none" stroke="var(--warn)" strokeWidth="3" /></svg>Roll-off próximo (anillo)</li>
      <li>Más cerca del centro = mejor encaje</li>
    </ul>
  );
}

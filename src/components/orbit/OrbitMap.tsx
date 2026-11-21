import { useEffect, useState } from "react";
import type { EnrichedCandidate } from "@/lib/types";
import { cn } from "@/lib/utils";

const SIZE = 520, C = SIZE / 2, MIN_R = 62, MAX_R = 240;
export const fitToRadius = (fit: number) => MIN_R + ((100 - Math.max(40, Math.min(100, fit))) / 60) * (MAX_R - MIN_R);

export function OrbitMap({
  center, candidates, activeId, onActive, onSelect,
}: { center: string; candidates: EnrichedCandidate[]; activeId?: string | null; onActive?: (id: string | null) => void; onSelect?: (id: string) => void }) {
  const [entered, setEntered] = useState(false);
  useEffect(() => { const t = setTimeout(() => setEntered(true), 60); return () => clearTimeout(t); }, [candidates]);
  useEffect(() => setEntered(false), [candidates]);
  const pts = candidates.map((c, i) => {
    const a = i * 2.399963 - Math.PI / 2;
    const r = fitToRadius(c.fit);
    return { c, x: Math.cos(a) * r, y: Math.sin(a) * r, i };
  });
  const active = pts.find((p) => p.c.employee_id === activeId);
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px]">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" role="group" aria-label={`Mapa orbital de ${center}. Más cerca = mejor encaje.`}>
        <defs>
          <radialGradient id="core"><stop offset="0%" stopColor="var(--ai)" stopOpacity=".55" /><stop offset="100%" stopColor="var(--ai)" stopOpacity="0" /></radialGradient>
        </defs>
        {[90, 75, 60, 45].map((f) => (
          <g key={f}>
            <circle cx={C} cy={C} r={fitToRadius(f)} fill="none" stroke="var(--border)" strokeDasharray={f === 90 ? "0" : "2 6"} />
            <text x={C + 4} y={C - fitToRadius(f) - 4} fill="var(--muted-foreground)" fontSize="10">{f}%</text>
          </g>
        ))}
        <circle cx={C} cy={C} r={70} fill="url(#core)" />
        <circle cx={C} cy={C} r={34} fill="var(--surface-2)" stroke="var(--ai)" />
        <text x={C} y={C} textAnchor="middle" dominantBaseline="central" fill="var(--ai)" fontSize="11" fontFamily="var(--font-display)" fontWeight="700">ROL</text>
        {pts.map(({ c, x, y, i }) => {
          const bench = c.availability === "En banca";
          const col = bench ? "var(--bench)" : "var(--rolloff)";
          const isActive = c.employee_id === activeId;
          const far = MAX_R + 30;
          const a = i * 2.399963 - Math.PI / 2;
          const tx = entered ? x : Math.cos(a) * far, ty = entered ? y : Math.sin(a) * far;
          return (
            <g key={c.employee_id}
              tabIndex={0} role="button"
              aria-label={`${c.name}, encaje ${c.fit}%, ${c.availability}${c.hidden_talent ? ", talento oculto" : ""}`}
              onMouseEnter={() => onActive?.(c.employee_id)} onMouseLeave={() => onActive?.(null)}
              onFocus={() => onActive?.(c.employee_id)} onBlur={() => onActive?.(null)}
              onClick={() => onSelect?.(c.employee_id)} onKeyDown={(e) => e.key === "Enter" && onSelect?.(c.employee_id)}
              className="cursor-pointer outline-none"
              style={{ transform: `translate(${C + tx}px, ${C + ty}px)`, opacity: entered ? 1 : 0, transition: `transform 900ms cubic-bezier(.2,.8,.2,1) ${i * 45}ms, opacity 600ms ${i * 45}ms` }}
            >
              {c.hidden_talent && <circle r={14} fill="var(--hidden)" fillOpacity=".18" stroke="var(--hidden)" strokeOpacity=".7" />}
              {isActive && <circle r={18} fill="none" stroke="var(--ai)" strokeWidth="1.5" />}
              {bench ? <circle r={7} fill={col} /> : <circle r={5.5} fill="var(--background)" stroke={col} strokeWidth="3" />}
            </g>
          );
        })}
      </svg>
      {active && (
        <div className="glass pointer-events-none absolute z-10 w-56 rounded-xl border border-line p-3 text-xs shadow-xl"
          style={{ left: `${((C + active.x) / SIZE) * 100}%`, top: `${((C + active.y) / SIZE) * 100}%`, transform: `translate(${active.x > 0 ? "-105%" : "5%"}, -50%)` }}>
          <div className="flex items-baseline justify-between gap-2">
            <b className="text-sm">{active.c.name}</b>
            <span className="font-display text-lg font-bold text-ai tnum">{active.c.fit}%</span>
          </div>
          <p className={cn("mt-0.5", active.c.availability === "En banca" ? "text-bench" : "text-rolloff")}>{active.c.availability}</p>
          {active.c.hidden_talent && <p className="text-hidden">Talento oculto · {active.c.area}</p>}
          <p className="mt-1.5 text-muted-foreground">{active.c.evidence[0]?.label ?? "Sin evidencias"}</p>
        </div>
      )}
    </div>
  );
}

export function OrbitLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <li className="flex items-center gap-1.5"><svg width="14" height="14"><circle cx="7" cy="7" r="6" fill="var(--bench)" /></svg>En banca (punto lleno)</li>
      <li className="flex items-center gap-1.5"><svg width="14" height="14"><circle cx="7" cy="7" r="4.5" fill="none" stroke="var(--rolloff)" strokeWidth="3" /></svg>Roll-off próximo (anillo)</li>
      <li className="flex items-center gap-1.5"><svg width="14" height="14"><circle cx="7" cy="7" r="6" fill="var(--hidden)" fillOpacity=".25" stroke="var(--hidden)" /></svg>Talento oculto (halo)</li>
      <li>Más cerca del centro = mejor encaje</li>
    </ul>
  );
}

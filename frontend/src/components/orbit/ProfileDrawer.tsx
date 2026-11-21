import { useEffect } from "react";
import { Award, Briefcase, Wrench, X } from "lucide-react";
import { skillLabel } from "@/lib/mock-data";
import type { EnrichedCandidate } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AvailabilityBadge, SectionLabel, SimPill } from "./primitives";

/** Side drawer with the person's profile; `focus` scrolls to and highlights the clicked evidence. */
export function ProfileDrawer({ c, focus, onClose }: { c: EnrichedCandidate; focus: string | null; onClose: () => void }) {
  useEffect(() => {
    if (focus) document.getElementById(`pf-${focus}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focus, c]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const p = c.profile;
  const item = (ref: string) => cn("flex items-start gap-2 rounded-lg p-2 text-sm", focus === ref ? "bg-ai/15 ring-1 ring-ai" : "");
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal aria-label={`Perfil de ${p.name}`}>
      <button className="absolute inset-0 bg-background/50" aria-label="Cerrar" onClick={onClose} />
      <aside className="glass absolute right-0 top-0 h-full w-full max-w-md overflow-auto border-l border-line p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-bold">{p.name}</h3>
            <p className="text-sm text-muted-foreground">{p.area} · {c.employee_id}</p>
          </div>
          <button onClick={onClose} autoFocus aria-label="Cerrar" className="rounded-full p-2 hover:bg-surface-2"><X className="size-5" /></button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2"><AvailabilityBadge value={p.availability} />{c.profile_simulated && <SimPill />}</div>
        <SectionLabel><span className="mt-6 block">Skills</span></SectionLabel>
        <ul className="mt-2 space-y-1">
          {p.skills.map((s) => (
            <li key={s.name} id={`pf-skill:${s.name}`} className={item(`skill:${s.name}`)}>
              <Wrench className="mt-0.5 size-3.5 text-muted-foreground" aria-hidden />
              <span className="flex-1">{skillLabel(s)}</span>
              {s.demonstrated === true && <span className="text-xs text-bench">demostrada</span>}
              {s.demonstrated === false && <span className="text-xs text-rolloff">solo declarada</span>}
            </li>
          ))}
        </ul>
        <SectionLabel><span className="mt-6 block">Proyectos</span></SectionLabel>
        <ul className="mt-2 space-y-1">
          {p.projects.map((x) => (
            <li key={x.name + x.year} id={`pf-project:${x.name}`} className={item(`project:${x.name}`)}>
              <Briefcase className="mt-0.5 size-3.5 text-muted-foreground" aria-hidden />
              <span className="flex-1">{x.name}{x.role && <span className="text-muted-foreground"> · {x.role}</span>}</span>
              <span className="tnum text-muted-foreground">{x.year ?? "—"}</span>
            </li>
          ))}
          {p.projects.length === 0 && <li className="p-2 text-sm text-muted-foreground">Sin proyectos registrados</li>}
        </ul>
        <SectionLabel><span className="mt-6 block">Certificaciones</span></SectionLabel>
        <ul className="mt-2 space-y-1">
          {p.certifications.map((x) => (
            <li key={x} id={`pf-cert:${x}`} className={item(`cert:${x}`)}><Award className="mt-0.5 size-3.5 text-muted-foreground" aria-hidden />{x}</li>
          ))}
          {p.certifications.length === 0 && <li className="p-2 text-sm text-muted-foreground">Sin certificaciones</li>}
        </ul>
      </aside>
    </div>
  );
}

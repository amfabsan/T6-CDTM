import { useRef, useState } from "react";
import { Copy, FileDown } from "lucide-react";
import { allCandidates } from "@/lib/matching";
import type { MatchCandidate, MatchResponse, MatchTeam, Requirements } from "@/lib/types";
import { OrbitButton, Panel, SectionLabel, SimPill } from "./primitives";

/** Editable "Equipo propuesto" section + request messages. Nothing is sent automatically. */
export function Proposal({ team, match, projectName, req }: { team: MatchTeam; match: MatchResponse; projectName: string; req: Requirements }) {
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (k: string, t: string) => { await navigator.clipboard.writeText(t); setCopied(k); setTimeout(() => setCopied(null), 1800); };
  const detail = new Map<string, MatchCandidate>(allCandidates(match).map((c) => [c.employee_id, c]));
  return (
    <section className="mt-10 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl">Propuesta del equipo {team.id}</h2><SimPill />
        <p className="w-full text-sm text-muted-foreground">Todo es editable. Nada se envía automáticamente: tú decides.</p>
      </div>
      <Panel>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <SectionLabel>Sección de la propuesta / RFP</SectionLabel>
          <div className="ml-auto flex gap-2">
            <OrbitButton variant="ghost" onClick={() => copy("p", ref.current?.innerText ?? "")}><Copy className="size-4" />{copied === "p" ? "Copiado" : "Copiar"}</OrbitButton>
            <OrbitButton variant="ghost" onClick={() => window.print()}><FileDown className="size-4" />Descargar PDF</OrbitButton>
          </div>
        </div>
        <div ref={ref} contentEditable suppressContentEditableWarning className="print-area border border-line bg-surface p-6 outline-none focus:border-blue">
          <h2 className="text-2xl">Equipo propuesto</h2>
          <p className="mt-1 text-sm text-muted-foreground">{projectName}</p>
          {team.members.map((m) => {
            const c = detail.get(m.employee_id);
            const role = req.roles.find((r) => r.title === m.role);
            const must = role?.mandatory_skills.map((s) => s.name) ?? c?.skills.filter((s) => s.tipo === "obligatoria").map((s) => s.name) ?? [];
            const covered = must.filter((n) => c?.skills.some((s) => s.name.toLowerCase() === n.toLowerCase())).length;
            return (
              <div key={m.employee_id + m.role} className="mt-5 border-t border-line pt-4">
                <h3 className="text-lg">{m.role} — {m.nombre_completo}</h3>
                <p className="mt-1 text-sm">{c ? `${c.puesto_actual} (${c.nivel_seniority}) con experiencia demostrada en ${c.skills.filter((s) => s.demostrada).slice(0, 2).map((s) => s.name).join(" y ") || "el ámbito del rol"}.` : "Perfil propuesto para el rol."}</p>
                {c && <ul className="mt-2 list-disc pl-5 text-sm">{c.evidence.map((e) => <li key={e.proyecto + e.anio}>{e.proyecto} · {e.anio} · {e.sector} ({e.skills.join(", ")})</li>)}</ul>}
                <p className="mt-2 text-sm"><b>Cobertura de requisitos:</b> {covered} de {must.length} obligatorios{c?.gaps.length ? ` · gaps: ${c.gaps.join(", ")}` : ""}.</p>
              </div>
            );
          })}
        </div>
      </Panel>
      <div>
        <SectionLabel>Solicitudes a sus responsables actuales</SectionLabel>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {team.members.map((m) => (
            <RequestCard key={m.employee_id + m.role} name={m.nombre_completo} role={m.role} project={projectName} copied={copied === m.employee_id} onCopy={(t) => copy(m.employee_id, t)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RequestCard({ name, role, project, copied, onCopy }: { name: string; role: string; project: string; copied: boolean; onCopy: (t: string) => void }) {
  const [text, setText] = useState(`Hola,\n\nEstamos formando el equipo de «${project}» y ${name} presenta un encaje adecuado para el rol de ${role}. ¿Podríamos hablar de su disponibilidad para incorporarse?\n\nGracias.`);
  return (
    <Panel>
      <label className="text-sm font-semibold text-navy" htmlFor={`m-${name}`}>Mensaje para el responsable de {name}</label>
      <textarea id={`m-${name}`} value={text} onChange={(e) => setText(e.target.value)} rows={6} className="mt-2 w-full border border-line bg-surface p-3 text-sm outline-none focus:border-blue" />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{copied ? "Copiado. Pendiente de envío manual." : "Envío manual."}</span>
        <OrbitButton variant="ghost" className="min-w-0 whitespace-normal text-left" onClick={() => onCopy(text)}><Copy className="size-4" />Solicitar disponibilidad a {name}</OrbitButton>
      </div>
    </Panel>
  );
}

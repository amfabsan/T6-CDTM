import { useRef, useState } from "react";
import { Copy, FileDown } from "lucide-react";
import { allCandidates } from "@/lib/matching";
import type { MatchCandidate, MatchResponse, MatchTeam, Requirements } from "@/lib/types";
import { OrbitButton, Panel, SectionLabel, SimPill } from "./primitives";

/** Editable "Proposed team" section + request messages. Nothing is sent automatically. */
export function Proposal({ team, teamNum, match, projectName, req }: { team: MatchTeam; teamNum: number; match: MatchResponse; projectName: string; req: Requirements }) {
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (k: string, t: string) => { await navigator.clipboard.writeText(t); setCopied(k); setTimeout(() => setCopied(null), 1800); };
  const detail = new Map<string, MatchCandidate>(allCandidates(match).map((c) => [c.employee_id, c]));
  return (
    <section className="mt-10 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl">Proposal for team {teamNum}</h2><SimPill />
        <p className="w-full text-sm text-muted-foreground">Everything is editable. Nothing is sent automatically: you decide.</p>
      </div>
      <Panel>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <SectionLabel>Proposal / RFP section</SectionLabel>
          <div className="ml-auto flex gap-2">
            <OrbitButton variant="ghost" onClick={() => copy("p", ref.current?.innerText ?? "")}><Copy className="size-4" />{copied === "p" ? "Copied" : "Copy"}</OrbitButton>
            <OrbitButton variant="ghost" onClick={() => window.print()}><FileDown className="size-4" />Download PDF</OrbitButton>
          </div>
        </div>
        <div ref={ref} contentEditable suppressContentEditableWarning className="print-area border border-line bg-surface p-6 outline-none focus:border-blue">
          <h2 className="text-2xl">Proposed team</h2>
          <p className="mt-1 text-sm text-muted-foreground">{projectName}</p>
          {team.members.map((m) => {
            const c = detail.get(m.employee_id);
            const role = req.roles.find((r) => r.title === m.role);
            const must = role?.mandatory_skills.map((s) => s.name) ?? c?.skills.filter((s) => s.tipo === "obligatoria").map((s) => s.name) ?? [];
            const covered = must.filter((n) => c?.skills.some((s) => s.name.toLowerCase() === n.toLowerCase())).length;
            return (
              <div key={m.employee_id + m.role} className="mt-5 border-t border-line pt-4">
                <h3 className="text-lg">{m.role} — {m.nombre_completo}</h3>
                <p className="mt-1 text-sm">{c ? `${c.puesto_actual} (${c.nivel_seniority}) with proven experience in ${c.skills.filter((s) => s.demostrada).slice(0, 2).map((s) => s.name).join(" and ") || "the role's field"}.` : "Profile proposed for the role."}</p>
                {c && <ul className="mt-2 list-disc pl-5 text-sm">{c.evidence.map((e) => <li key={e.proyecto + e.anio}>{e.proyecto} · {e.anio} · {e.sector} ({e.skills.join(", ")})</li>)}</ul>}
                <p className="mt-2 text-sm"><b>Requirement coverage:</b> {covered} of {must.length} mandatory{c?.gaps.length ? ` · gaps: ${c.gaps.join(", ")}` : ""}.</p>
              </div>
            );
          })}
        </div>
      </Panel>
      <div>
        <SectionLabel>Requests to their current managers</SectionLabel>
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
  const [text, setText] = useState(`Hello,\n\nWe are building the team for “${project}” and ${name} is a good fit for the ${role} role. Could we talk about their availability to join?\n\nThank you.`);
  return (
    <Panel>
      <label className="text-sm font-semibold text-navy" htmlFor={`m-${name}`}>Message to {name}'s manager</label>
      <textarea id={`m-${name}`} value={text} onChange={(e) => setText(e.target.value)} rows={6} className="mt-2 w-full border border-line bg-surface p-3 text-sm outline-none focus:border-blue" />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{copied ? "Copied. Send it manually." : "Manual sending."}</span>
        <OrbitButton variant="ghost" className="min-w-0 whitespace-normal text-left" onClick={() => onCopy(text)}><Copy className="size-4" />Request availability for {name}</OrbitButton>
      </div>
    </Panel>
  );
}

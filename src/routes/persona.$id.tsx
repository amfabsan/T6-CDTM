import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, Briefcase, Languages, Wrench } from "lucide-react";
import { AppShell } from "@/components/orbit/AppShell";
import { AvailabilityBadge, Panel, SectionLabel, SimPill } from "@/components/orbit/primitives";
import { getProfile, isLive } from "@/lib/api";
import { allCandidates, useMatching } from "@/lib/matching";
import { perfilFromMatch } from "@/lib/mock-data";
import { Crystal, SkillDots } from "@/components/orbit/MissionVisuals";
import { cn } from "@/lib/utils";
import { TeamAlternatives } from "@/components/orbit/TeamAlternatives";
import { useProject } from "@/lib/project-store";
import { modalityLabel } from "@/lib/labels";

export const Route = createFileRoute("/persona/$id")({
  head: () => ({
    meta: [
      { title: "Professional profile · ORBIT AI" },
      { name: "description", content: "Full profile: skills, projects, certifications and languages." },
      { property: "og:title", content: "Professional profile · ORBIT AI" },
      { property: "og:description", content: "Full profile: skills, projects, certifications and languages." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PersonPage,
});

function PersonPage() {
  const { id } = Route.useParams();
  const { data: match } = useMatching();
  const { teamId } = useProject();
  const team = match?.data.teams.find(t => t.id === teamId) ?? match?.data.teams.find(t => t.members.some(m => m.employee_id === id)) ?? match?.data.teams[0];
  const { data: p, isLoading } = useQuery({
    queryKey: ["perfil", id, !!match],
    queryFn: async () => {
      if (isLive) {
        const real = await getProfile(id).catch(() => null);
        if (real) return real;
      }
      // Sample project (mock ids): build the profile from the simulated matching data.
      const c = match ? allCandidates(match.data).find((x) => x.employee_id === id) : undefined;
      return c ? perfilFromMatch(c) : null;
    },
  });
  return (
    <AppShell>
      <div className="flex flex-wrap gap-4"><Link to="/equipos" className="text-sm text-blue hover:underline">← Back to teams</Link><Link to="/talento" className="text-sm text-blue hover:underline">View candidates</Link></div>
      {isLoading ? <p className="mt-10 text-muted-foreground">Loading profile…</p> : !p ? (
        <p className="mt-10">We couldn't find the profile for <b>{id}</b>.</p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_2fr]">
          <Panel className="h-fit"><p className="mission-kicker mb-4">Professional profile</p><Crystal className="mx-auto mb-6 w-24" tone={p.disponibilidad === "En banca" ? "green" : "amber"} />
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl">{p.nombre_completo}</h1>{(!isLive || match?.simulated) && <SimPill />}</div>
            <p className="mt-1 text-muted-foreground">{p.puesto_actual} · {p.nivel_seniority}</p>
            <div className="mt-3"><AvailabilityBadge value={p.disponibilidad} /></div>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              {[["Country", p.pais], ["City", p.ciudad], ["Main sector", p.sector_principal], ["Work mode", p.modalidad_trabajo ? modalityLabel(p.modalidad_trabajo) : ""], ["Years of experience", p.anios_experiencia], ["Years at NTT DATA", p.anios_en_ntt]].map(([k, v]) => (
                <div key={String(k)}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="text-navy">{v === "" || v == null ? "—" : String(v)}</dd></div>
              ))}
            </dl>
            {p.resumen && <details className="mt-5 text-sm"><summary className="cursor-pointer text-blue-200">View details</summary><p className="mt-3">{p.resumen}</p></details>}
          </Panel>
          <div className="space-y-6">
            <Panel>
              <SectionLabel>Skills</SectionLabel>
              <table className="mt-3 w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1 font-medium">Skill</th><th className="font-medium">Level</th><th className="font-medium">Years</th><th className="font-medium">Evidence</th></tr></thead>
                <tbody>{p.skills.map((s) => (
                  <tr key={s.skill} className="border-t border-line"><td className="py-1.5 text-navy"><Wrench className="mr-1.5 inline size-3.5 text-muted-foreground" aria-hidden />{s.skill}</td><td className="tnum"><SkillDots level={s.nivel} /></td><td className="tnum">{s.anios}</td>
                    <td className={cn(s.demostrada ? "text-success-ink" : "text-warn-ink")}>{s.demostrada ? "✓ Proven" : "Declared only"}</td></tr>
                ))}</tbody>
              </table>
            </Panel>
            <Panel>
              <SectionLabel>Projects</SectionLabel>
              <ul className="project-timeline text-sm">{p.proyectos.map((x) => (
                <li key={x.orden} className="project-tile"><Briefcase className="mb-3 size-4 text-blue-200" aria-hidden /><span className="text-green tnum">{x.anio}</span><b className="mt-2 block">{x.nombre}</b><span className="mt-2 block text-xs text-blue-200">{x.rol} · {x.cliente_sector}</span></li>
              ))}{p.proyectos.length === 0 && <li className="text-muted-foreground">No projects on record</li>}</ul>
            </Panel>
            <div className="grid gap-6 md:grid-cols-2">
              <Panel>
                <SectionLabel>Certifications</SectionLabel>
                <ul className="mt-3 space-y-1 text-sm">{p.certificaciones.map((c) => <li key={c.nombre}><Award className="mr-1.5 inline size-3.5 text-muted-foreground" aria-hidden />{c.nombre}{c.anio ? ` · ${c.anio}` : ""}</li>)}
                  {p.certificaciones.length === 0 && <li className="text-muted-foreground">No certifications</li>}</ul>
              </Panel>
              <Panel>
                <SectionLabel>Languages</SectionLabel>
                <ul className="mt-3 space-y-1 text-sm">{p.idiomas.map((l) => <li key={l.idioma}><Languages className="mr-1.5 inline size-3.5 text-muted-foreground" aria-hidden />{l.idioma} · {l.nivel}</li>)}
                  {p.idiomas.length === 0 && <li className="text-muted-foreground">No language data</li>}</ul>
              </Panel>
            </div>
          </div>
        </div>
      )}
      {match && team && <TeamAlternatives match={match.data} team={team} {...(team.members.some(m => m.employee_id === id) ? { employeeId: id } : {})} />}
    </AppShell>
  );
}

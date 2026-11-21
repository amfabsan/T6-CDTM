import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/orbit/AppShell";
import { AvailabilityBadge, Panel, SimPill } from "@/components/orbit/primitives";
import { allCandidates, useMatching } from "@/lib/matching";

export const Route = createFileRoute("/personas")({
  head: () => ({
    meta: [
      { title: "Personas · ORBIT AI" },
      { name: "description", content: "Todas las personas candidatas del proyecto con su ficha." },
      { property: "og:title", content: "Personas · ORBIT AI" },
      { property: "og:description", content: "Todas las personas candidatas del proyecto con su ficha." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PeoplePage,
});

function PeoplePage() {
  const { data: match, isLoading } = useMatching();
  const [q, setQ] = useState("");
  const people = useMemo(() => (match ? allCandidates(match.data) : []).filter((c) => `${c.nombre_completo} ${c.puesto_actual} ${c.skills.map((s) => s.name).join(" ")}`.toLowerCase().includes(q.toLowerCase())), [match, q]);
  return (
    <AppShell>
      <div className="flex flex-wrap items-center gap-3"><h1 className="text-4xl">Personas</h1>{match?.simulated && <SimPill />}</div>
      <p className="mt-2 text-lg">Personas candidatas para este proyecto. Abre una ficha para ver su evidencia.</p>
      <label className="card mt-6 flex max-w-md items-center gap-2 px-4 py-2">
        <Search className="size-4 text-muted-foreground" aria-hidden /><span className="sr-only">Buscar</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, puesto o skill" className="w-full bg-transparent text-sm outline-none" />
      </label>
      {isLoading ? <p className="mt-10 text-muted-foreground">Cargando personas…</p> : (
        <Panel className="mt-6 overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-4">Nombre</th><th className="p-4">Candidato a</th><th className="p-4">Puesto actual</th><th className="p-4">Encaje</th><th className="p-4">Disponibilidad</th></tr>
            </thead>
            <tbody>
              {people.map((c) => (
                <tr key={c.employee_id} className="border-b border-line last:border-0 hover:bg-surface-2">
                  <td className="p-4"><Link to="/persona/$id" params={{ id: c.employee_id }} className="font-semibold text-blue hover:underline">{c.nombre_completo}</Link></td>
                  <td className="p-4">{c.role}</td>
                  <td className="p-4">{c.puesto_actual}</td>
                  <td className="p-4 tnum">{Math.round(c.score)}%</td>
                  <td className="p-4"><AvailabilityBadge value={c.disponibilidad} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </AppShell>
  );
}

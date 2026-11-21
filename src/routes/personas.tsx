import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/orbit/AppShell";
import { AvailabilityBadge, Panel, SimPill } from "@/components/orbit/primitives";
import { Crystal, FitGauge } from "@/components/orbit/MissionVisuals";
import { allCandidates, useMatching } from "@/lib/matching";

export const Route = createFileRoute("/personas")({
  head: () => ({
    meta: [
      { title: "People · ORBIT AI" },
      { name: "description", content: "All candidate people for the project, with their profiles." },
      { property: "og:title", content: "People · ORBIT AI" },
      { property: "og:description", content: "All candidate people for the project, with their profiles." },
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
      <div className="flex flex-wrap items-center gap-3"><h1 className="mission-title">Available people</h1>{match?.simulated && <SimPill />}</div>
      <p className="mission-kicker mt-3">People · {people.length} profiles</p>
      <label className="card mt-6 flex max-w-md items-center gap-2 px-4 py-2">
        <Search className="size-4 text-muted-foreground" aria-hidden /><span className="sr-only">Search</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, position or skill" className="w-full bg-transparent text-sm outline-none" />
      </label>
      {isLoading ? <p className="mt-10 text-muted-foreground">Loading people…</p> : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{people.map(c => <Link to="/persona/$id" params={{ id: c.employee_id }} key={c.employee_id} className="card lift p-5"><div className="flex items-center gap-3"><div className="avatar-crystal"><Crystal tone={c.disponibilidad === 'En banca' ? 'green' : 'amber'} /><span>{c.nombre_completo.split(' ').slice(0,2).map(n => n[0]).join('')}</span></div><div className="min-w-0 flex-1"><h2 className="text-lg">{c.nombre_completo}</h2><p className="mt-1 text-xs text-blue-200">{c.puesto_actual}</p></div><FitGauge value={c.score} size={58} /></div><p className="my-3 text-xs text-blue-200">{c.role}</p><AvailabilityBadge value={c.disponibilidad} /><div className="mt-3 flex flex-wrap gap-1.5">{c.skills.slice(0,3).map(x => <span key={x.name} className="rounded-full border border-line px-2 py-1 text-[11px]">{x.name}</span>)}</div></Link>)}</div>
      )}
    </AppShell>
  );
}

import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Mic, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { isLive } from "@/lib/api";
import { EMPTY, setProject, useProject } from "@/lib/project-store";
import { MOCK_INTERPRET } from "@/lib/mock-data";
import { SimPill } from "./primitives";

const steps = [
  { n: 1, label: "Necesidad", to: "/" as const },
  { n: 2, label: "Talento", to: "/talento" as const },
  { n: 3, label: "Equipos", to: "/equipos" as const },
  { n: 4, label: "Decisión", to: "/decision" as const },
];

export function OrbitLogo() {
  return (
    <span className="flex items-center gap-2">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
        <circle cx="14" cy="14" r="4.5" fill="var(--ai)" />
        <ellipse cx="14" cy="14" rx="12" ry="5" fill="none" stroke="var(--ai)" strokeOpacity=".6" transform="rotate(-30 14 14)" />
        <circle cx="24" cy="9" r="2" fill="var(--bench)" />
      </svg>
      <span className="font-display text-lg font-bold tracking-tight">ORBIT<span className="text-ai"> AI</span></span>
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { requirements, demo } = useProject();
  const navigate = useNavigate();
  const toggleDemo = () => {
    if (demo) setProject(EMPTY);
    else setProject({ ...EMPTY, demo: true, interpretation: structuredClone(MOCK_INTERPRET), requirements: structuredClone(MOCK_INTERPRET.requirements), projectId: "mock-project" });
    navigate({ to: "/" });
  };
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface/60 p-5 md:flex">
        <OrbitLogo />
        <p className="mt-2 text-xs leading-snug text-muted-foreground">Find the talent. Validate the fit. Make the staffing decision.</p>
        <nav aria-label="Pasos" className="mt-10">
          <ol className="relative space-y-1">
            <span className="absolute left-[15px] top-4 bottom-4 w-px bg-line" aria-hidden />
            {steps.map((s) => {
              const active = s.to === pathname;
              const inner = (
                <>
                  <span className={cn("relative z-10 grid size-8 place-items-center rounded-full border font-display text-sm font-bold tnum",
                    active ? "border-ai bg-ai text-on-accent" : "border-line bg-surface text-muted-foreground")}>{s.n}</span>
                  <span className={cn("text-sm", active ? "font-semibold text-foreground" : "text-muted-foreground")}>{s.label}</span>
                </>
              );
              return (
                <li key={s.n}>
                  <Link to={s.to} aria-current={active ? "step" : undefined} className="flex items-center gap-3 rounded-lg px-0 py-2 hover:text-foreground">{inner}</Link>
                </li>
              );
            })}
          </ol>
        </nav>
        <Link to="/design" className="mt-auto text-xs text-muted-foreground hover:text-ai">Sistema de diseño →</Link>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-line bg-background/80 px-6 py-3 backdrop-blur">
          <span className="md:hidden"><OrbitLogo /></span>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Proyecto</p>
            <h1 className="truncate text-base font-semibold">{requirements?.project.name ?? "Nuevo proyecto"}</h1>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button onClick={toggleDemo} aria-pressed={demo}
              className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors", demo ? "border-ai bg-ai/15 text-ai" : "border-line text-muted-foreground hover:text-foreground")}>
              <Play className="size-3" aria-hidden />Modo demo
              <span className={cn("relative h-4 w-7 rounded-full transition-colors", demo ? "bg-ai" : "bg-surface-2")}>
                <span className={cn("absolute top-0.5 size-3 rounded-full bg-foreground transition-all", demo ? "left-3.5" : "left-0.5")} />
              </span>
            </button>
            {!isLive && <SimPill />}
            <span className="text-xs text-muted-foreground">NTT DATA · Staffing</span>
          </div>
        </header>
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
      <VoiceOrb />
    </div>
  );
}

export function VoiceOrb() {
  const [on, setOn] = useState(false);
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {on && (
        <div className="glass w-72 rounded-xl border border-line p-4 text-sm shadow-xl" role="status">
          <div className="flex items-center justify-between">
            <b className="text-ai">Escuchando…</b>
            <SimPill />
          </div>
          <p className="mt-2 text-muted-foreground">Prueba: «¿Quién está en banca con Kubernetes y banca?»</p>
        </div>
      )}
      <button
        onClick={() => setOn((v) => !v)} aria-pressed={on} aria-label="Pregunta a ORBIT"
        className="relative grid size-16 place-items-center rounded-full bg-ai text-on-accent shadow-xl transition-transform duration-200 hover:scale-105"
      >
        {on && <span className="absolute inset-0 rounded-full border-2 border-ai animate-pulse-ring" aria-hidden />}
        {on ? <X className="size-6" /> : <Mic className="size-6" />}
      </button>
      {!on && <span className="-mt-1 text-[11px] font-medium text-muted-foreground">Pregunta a ORBIT</span>}
    </div>
  );
}

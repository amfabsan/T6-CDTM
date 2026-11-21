import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ClipboardList, Contact, Play, Scale, Users, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { isLive } from "@/lib/api";
import { EMPTY, setProject, useProject } from "@/lib/project-store";
import { MOCK_INTERPRET } from "@/lib/mock-data";
import { OrbitButton, SimPill } from "./primitives";

const nav = [
  { label: "1 · Necesidad", to: "/" as const, subtitle: "Requisitos", icon: ClipboardList },
  { label: "2 · Talento", to: "/talento" as const, subtitle: "Candidatos", icon: Users },
  { label: "3 · Equipos", to: "/equipos" as const, subtitle: "Equipos", icon: UsersRound },
  { label: "4 · Decisión", to: "/decision" as const, subtitle: "Escenarios", icon: Scale },
  { label: "Personas", to: "/personas" as const, subtitle: "Directorio", icon: Contact },
];

export function OrbitLogo({ light = true }: { light?: boolean }) {
  return (
    <span className="flex items-baseline gap-2">
      <span className={cn("text-xl font-bold", light ? "text-on-accent" : "text-navy")}>ORBIT AI</span>
      <span className={cn("text-xs", light ? "text-on-accent/70" : "text-muted-foreground")}>para NTT DATA</span>
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
    <div className="mission-shell flex min-h-screen flex-col">
      <header className="mission-header sticky top-0 z-30 text-on-accent">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-8 gap-y-2 px-6">
          <Link to="/" className="py-4"><OrbitLogo /></Link>
          <nav aria-label="Pasos" className="mission-nav order-3 -mx-2 flex w-full overflow-x-auto lg:order-none lg:w-auto">
            {nav.map((s) => {
              const active = s.to === pathname;
              return (
                <Link key={s.to} to={s.to} aria-current={active ? "page" : undefined}
                  className={cn("flex items-center gap-2 whitespace-nowrap border-b-[3px] px-3 py-4 text-sm transition-colors",
                    active ? "border-gold font-semibold text-on-accent" : "border-transparent text-on-accent/75 hover:text-on-accent")}>
                  <s.icon className="size-4" strokeWidth={1.75} aria-hidden /><span>{s.label}<small>{s.subtitle}</small></span>
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <OrbitButton variant="ghost" onClick={toggleDemo} aria-pressed={demo}
              className="inline-flex items-center gap-2 rounded-[40px] border border-on-accent/40 px-3 py-1 text-xs font-medium text-on-accent hover:border-on-accent">
              <Play className="size-3" aria-hidden />Modo demo
              <span className={cn("relative h-4 w-7 rounded-full transition-colors", demo ? "bg-gold" : "bg-on-accent/25")}>
                <span className="absolute top-0.5 size-3 rounded-full bg-surface transition-all" style={{ left: demo ? 14 : 2 }} />
              </span>
            </OrbitButton>
            {!isLive && <SimPill />}
          </div>
        </div>
      </header>
      <div className="mission-project">
        <div className="mx-auto max-w-[1280px] px-6 py-2 text-xs">
          <span className="text-muted-foreground">Proyecto: </span>
          <b className="text-navy">{requirements?.project.project_name ?? "Nuevo proyecto"}</b>
        </div>
      </div>
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-5 py-8 md:px-8 md:py-10">{children}</main>
      <footer className="border-t border-line text-blue-200">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs">
          <span>ORBIT AI · Inteligencia de talento</span>
          <Link to="/design" className="hover:text-on-accent">Sistema de diseño</Link>
        </div>
      </footer>
    </div>
  );
}

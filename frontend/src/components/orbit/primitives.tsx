import { useEffect, useState, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Clock, Eye, FlaskConical, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Availability } from "@/lib/types";

export const chipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors",
  {
    variants: {
      tone: {
        must: "bg-ai text-on-accent",
        nice: "border border-dashed border-ai/70 text-ai",
        ai: "bg-ai/12 text-ai border border-ai/40",
        bench: "bg-bench/12 text-bench border border-bench/40",
        rolloff: "bg-rolloff/12 text-rolloff border border-rolloff/40",
        gap: "bg-gap/12 text-gap border border-gap/45",
        hidden: "bg-hidden/14 text-hidden border border-hidden/45",
        neutral: "bg-surface-2 text-foreground border border-line",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Chip({
  tone, children, icon, onRemove, className, ...rest
}: VariantProps<typeof chipVariants> & { children: ReactNode; icon?: ReactNode; onRemove?: () => void; className?: string } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn(chipVariants({ tone }), className)} {...rest}>
      {icon}
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Quitar ${String(children)}`} className="-mr-1 rounded-full p-0.5 opacity-70 hover:opacity-100">
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}

export function SimPill({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border border-rolloff/40 bg-rolloff/10 px-2 py-0.5 text-[11px] font-medium text-rolloff", className)}>
      <FlaskConical className="size-3" aria-hidden /> Datos simulados
    </span>
  );
}

const tagTone = { dato: "text-bench border-bench/40", supuesto: "text-rolloff border-rolloff/40", calculado: "text-ai border-ai/40" } as const;
export function DataTag({ kind }: { kind: keyof typeof tagTone }) {
  return <span className={cn("rounded border px-1 py-px text-[10px] font-medium uppercase tracking-wide", tagTone[kind])}>{kind}</span>;
}

/** Shows availability text exactly as stored. */
export function AvailabilityBadge({ value }: { value: Availability | string }) {
  const bench = value === "En banca";
  const roll = /^roll-off/i.test(value);
  return (
    <Chip tone={bench ? "bench" : roll ? "rolloff" : "neutral"} icon={bench ? <CheckCircle2 className="size-3.5" aria-hidden /> : <Clock className="size-3.5" aria-hidden />}>
      {value || "Por confirmar"}
    </Chip>
  );
}
export const HiddenTalentBadge = () => <Chip tone="hidden" icon={<Eye className="size-3.5" aria-hidden />}>Talento oculto</Chip>;
export const MeaningBadge = () => <Chip tone="ai" icon={<Sparkles className="size-3.5" aria-hidden />}>Encontrado por significado</Chip>;
export const GapChip = ({ skill }: { skill: string }) => <Chip tone="gap" icon={<AlertTriangle className="size-3.5" aria-hidden />}>Hueco: {skill}</Chip>;
export const PendingChip = ({ children }: { children: ReactNode }) => <Chip tone="rolloff" icon={<Clock className="size-3.5" aria-hidden />}>{children}</Chip>;

export function formatEs(n: number) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function AnimatedNumber({ value, duration = 900, suffix = "" }: { value: number; duration?: number; suffix?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setV(value);
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setV(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className="tnum">{formatEs(v)}{suffix}</span>;
}

export function Panel({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-line bg-surface p-5", className)} {...rest}>{children}</div>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{children}</p>;
}

export function OrbitButton({ variant = "primary", className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 disabled:opacity-50",
        variant === "primary" ? "bg-ai text-on-accent hover:glow-ai" : "border border-line bg-surface-2 text-foreground hover:border-ai/60",
        className,
      )}
      {...rest}
    />
  );
}

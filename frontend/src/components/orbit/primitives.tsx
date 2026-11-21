import { useEffect, useState, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Clock, Eye, FlaskConical, Sparkles, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const chipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors",
  {
    variants: {
      tone: {
        must: "border border-danger text-danger bg-surface",
        nice: "border border-blue text-blue bg-surface",
        role: "bg-navy/6 text-navy border border-navy/20",
        ai: "bg-blue/8 text-blue border border-blue/30",
        bench: "bg-success-soft text-success-ink border border-success-ink/20",
        rolloff: "bg-warn-soft text-warn-ink border border-warn-ink/20",
        gap: "bg-danger/8 text-danger border border-danger/30",
        hidden: "bg-surface text-blue border border-blue",
        gold: "bg-gold text-navy font-semibold",
        neutral: "bg-surface text-text border border-line",
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
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-warn-soft px-2.5 py-0.5 text-[11px] font-semibold text-warn-ink", className)}>
      <FlaskConical className="size-3" aria-hidden /> Datos simulados
    </span>
  );
}

const tagTone = { dato: "text-success-ink border-success-ink/30", supuesto: "text-warn-ink border-warn-ink/30", calculado: "text-blue border-blue/30" } as const;
export function DataTag({ kind }: { kind: keyof typeof tagTone }) {
  return <span className={cn("border px-1 py-px text-[10px] font-semibold uppercase tracking-wide", tagTone[kind])}>{kind}</span>;
}

/** Shows availability text exactly as stored. */
export function AvailabilityBadge({ value }: { value: string }) {
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
export const IdealBadge = () => <Chip tone="gold" icon={<Star className="size-3.5" aria-hidden />}>Equipo ideal</Chip>;

export function formatEs(n: number) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
/** Euros in Spanish format: 11.800 € / 70 €/h. */
export const eur = (n: number, unit = "") => `${formatEs(n)} €${unit ? `/${unit}` : ""}`;

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
  return <div className={cn("card p-6", className)} {...rest}>{children}</div>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{children}</p>;
}

export function OrbitButton({ variant = "primary", className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[40px] px-6 py-2.5 text-sm font-semibold transition-all duration-200 disabled:opacity-50",
        variant === "primary" ? "bg-blue text-on-accent hover:brightness-110" : "border border-navy bg-surface text-navy hover:bg-surface-2",
        className,
      )}
      {...rest}
    />
  );
}

/** Same look as the primary button, for router links. */
export const primaryLinkCls = "inline-flex items-center gap-2 rounded-[40px] bg-blue px-7 py-3 text-base font-semibold text-on-accent transition-all hover:brightness-110";

import type { EnrichedCandidate, Requirements } from "./types";

export interface TeamMember { roleTitle: string; roleIndex: number; c: EnrichedCandidate }
export interface Team {
  id: number; members: TeamMember[]; fit: number; costPerDay: number; start: "Día 0" | "Por confirmar";
  continuity: { kept: number; total: number; leaving: string; substitute: string | null };
}

/** Simulated daily cost per person (supuesto). */
export const dailyCost = (c: EnrichedCandidate) => 380 + (c.fit % 7) * 25;

export function buildTeams(req: Requirements, data: { role_index: number; enriched: EnrichedCandidate[] }[]): Team[] {
  return Array.from({ length: 5 }, (_, t) => {
    const members: TeamMember[] = [];
    req.roles.forEach((r) => {
      const pool = (data.find((d) => d.role_index === r.role_index)?.enriched ?? []).slice(0, 8);
      for (let k = 0; k < r.seats; k++) {
        const c = pool[(t + k * 2 + (t > 2 ? 1 : 0)) % Math.max(1, pool.length)];
        if (c && !members.some((m) => m.c.employee_id === c.employee_id)) members.push({ roleTitle: r.title, roleIndex: r.role_index, c });
      }
    });
    const fit = Math.round(members.reduce((s, m) => s + m.c.fit, 0) / Math.max(1, members.length));
    const top = [...members].sort((a, b) => b.c.fit - a.c.fit)[0];
    const pool = data.find((d) => d.role_index === top?.roleIndex)?.enriched ?? [];
    const sub = pool.find((c) => c.fit >= 70 && !members.some((m) => m.c.employee_id === c.employee_id));
    const roles = req.roles.length;
    return {
      id: t, members, fit,
      costPerDay: members.reduce((s, m) => s + dailyCost(m.c), 0),
      start: members.every((m) => m.c.availability === "En banca") ? "Día 0" : "Por confirmar",
      continuity: { kept: sub ? roles : roles - 1, total: roles, leaving: top?.c.name ?? "—", substitute: sub?.name ?? null },
    };
  });
}

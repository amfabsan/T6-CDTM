import { describe, expect, it } from "vitest";
import { buildRequirementsRow } from "@/lib/api";
import { selectTop } from "@/lib/matching";
import { MOCK_INTERPRET } from "@/lib/mock-data";
import type { MatchCandidate } from "@/lib/types";

const cand = (employee_id: string, score: number) => ({ employee_id, score }) as MatchCandidate;

describe("ranking rules", () => {
  it("filters by min fit, sorts by score desc with employee_id tie-break, takes Top N", () => {
    const items = [cand("B", 80), cand("A", 80), cand("C", 90), cand("D", 50)];
    expect(selectTop(items, 60, 5).map((c) => c.employee_id)).toEqual(["C", "A", "B"]);
    expect(selectTop(items, 0, 2).map((c) => c.employee_id)).toEqual(["C", "A"]);
  });
});

describe("saving requirements", () => {
  it("overwrites row_template with edits and keeps interpretation_raw untouched", () => {
    const req = structuredClone(MOCK_INTERPRET.requirements);
    req.project.city = "Sevilla"; req.project.start_date = "2027-01-15"; req.project.country_required = false;
    const row = buildRequirementsRow({ ...MOCK_INTERPRET.row_template, interpretation_raw: { a: 1 } }, req);
    expect(row["city"]).toBe("Sevilla");
    expect(row["project_start_date"]).toBe("2027-01-15");
    expect(row["country_required"]).toBe(false);
    expect(row["roles"]).toEqual(req.roles);
    expect(row["interpretation_raw"]).toEqual({ a: 1 });
  });
});

import { selectTeams } from "@/lib/matching";
import { rebalance } from "@/lib/scenarios";
import type { MatchTeam } from "@/lib/types";

const team = (id: string, fit: number, cost: number | null, date: string | null, pct = 100) =>
  ({ id, fit, members: [], cost: { value: cost, status: cost == null ? "por estimar" : "estimado", is_illustrative: true }, start: { date, status: date ? "estimado" : "por confirmar" }, continuity: { covered: 1, total: 1, pct, worst: { employee_id: "x", role: "r", substitute: null, late_substitute: null } }, gaps: 0 }) as MatchTeam;

describe("team selection", () => {
  const teams = [team("T2", 80, 9000, "2027-01-01"), team("T1", 80, 12000, "2026-12-01"), team("T3", 90, null, null), team("T4", 70, 5000, "2027-02-01", 50)];
  it("sorts by fit with id tie-break and shows at most 5", () => {
    expect(selectTeams(teams, { maxBudget: null, minFit: 0, latestStart: null, minContinuity: 0 }, "fit").shown.map((t) => t.id)).toEqual(["T3", "T1", "T2", "T4"]);
  });
  it("budget filter is inclusive and moves cost-pending teams to Pending data", () => {
    const r = selectTeams(teams, { maxBudget: 9000, minFit: 0, latestStart: null, minContinuity: 0 }, "cost");
    expect(r.shown.map((t) => t.id)).toEqual(["T4", "T2"]);
    expect(r.pending.map((t) => t.id)).toEqual(["T3"]);
  });
  it("min continuity is inclusive", () => {
    expect(selectTeams(teams, { maxBudget: null, minFit: 0, latestStart: null, minContinuity: 50 }, "fit").shown).toHaveLength(4);
  });
});

describe("weights", () => {
  it("always sum to 100", () => {
    const w = rebalance({ cost: 30, time: 20, coverage: 25, availability: 15, risk: 10 }, "cost", 70);
    expect(Object.values(w).reduce((a, b) => a + b, 0)).toBe(100);
    expect(w.cost).toBe(70);
  });
});

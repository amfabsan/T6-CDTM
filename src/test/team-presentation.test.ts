import { describe, expect, it } from 'vitest';
import { memberAlternatives, teamNumbers, topFourTeams, topPerCriterion } from '@/lib/team-presentation';
import type { MatchResponse, MatchTeam } from '@/lib/types';
import mock from '@/mocks/matching.json';

const filters = { maxBudget: null, minFit: 0, latestStart: null, minContinuity: 0 };
const team = (id: string, fit: number, cost: number | null, date: string | null, pct: number): MatchTeam => ({
  id, fit, members: [], cost: { value: cost, status: cost == null ? 'por estimar' : 'supuesto', is_illustrative: true },
  start: { date, status: date ? 'supuesto' : 'por confirmar' },
  continuity: { covered: 1, total: 4, pct, worst: { employee_id: 'x', role: 'r', substitute: null, late_substitute: null } }, gaps: 0,
});
const teams = [team('B', 89.25, 100, '2027-01-01', 90), team('A', 89.25, 100, '2027-01-01', 90), team('C', 89.26, 100, '2027-01-01', 90), team('D', 70, 90, '2026-12-01', 100), team('E', 60, null, null, 60), team('F', 50, 120, '2027-02-01', 40)];
const ids = (sort: 'fit' | 'cost' | 'start' | 'continuity') => topFourTeams(teams, filters, sort).shown.map(t => t.id);

describe('top four team tabs', () => {
  it('Best fit uses unrounded fit descending then ID and returns four', () => expect(ids('fit')).toEqual(['C', 'A', 'B', 'D']));
  it('Lowest cost uses cost ascending then fit descending then ID', () => expect(ids('cost')).toEqual(['D', 'C', 'A', 'B']));
  it('Earliest start uses earliest date then fit descending then ID', () => expect(ids('start')).toEqual(['D', 'C', 'A', 'B']));
  it('Lowest risk uses continuity descending then fit descending then ID', () => expect(ids('continuity')).toEqual(['D', 'C', 'A', 'B']));
  it('keeps unknown costs pending when the inclusive budget filter is active', () => {
    const result = topFourTeams(teams, { ...filters, maxBudget: 100 }, 'cost');
    expect(result.shown.map(t => t.id)).toEqual(['D', 'C', 'A', 'B']);
    expect(result.pending.map(t => t.id)).toEqual(['E']);
  });
});
describe('top per criterion', () => {
  it('returns the #1 team of each criterion with the same tie-breaks as the tabs', () => {
    const tops = topPerCriterion(teams, filters);
    expect(tops.map(t => t.sort)).toEqual(['fit', 'cost', 'start', 'continuity']);
    expect(tops.map(t => t.team?.id)).toEqual(['C', 'D', 'D', 'D']);
  });
  it('returns null for a criterion when no team passes the filters', () => {
    const tops = topPerCriterion(teams, { ...filters, minFit: 95 });
    expect(tops.every(t => t.team === null)).toBe(true);
  });
});
describe('visible team numbers', () => {
  it('numbers teams by position in the displayed list, then the rest, never by id', () => {
    const [b, a, c] = teams;
    if (!b || !a || !c) throw new Error('Missing example teams');
    const numOf = teamNumbers([c, b], teams);
    expect(numOf(c)).toBe(1);
    expect(numOf(b)).toBe(2);
    expect(numOf(a)).toBe(3);
  });
});
describe('member alternatives', () => {
  it('shows only same-role ranked candidates outside the current team', () => {
    const match = mock as unknown as MatchResponse;
    const selected = match.teams[0];
    if (!selected) throw new Error('Missing example team');
    const member = selected.members[0];
    if (!member) throw new Error('Missing example member');
    const alternatives = memberAlternatives(match, selected, member.employee_id);
    expect(alternatives.map(a => a.role)).toEqual([member.role]);
    const ids = new Set(selected.members.map(m => m.employee_id));
    const expected = [...(match.ranking[member.role]?.items ?? [])].filter(c => !ids.has(c.employee_id)).sort((a, b) => b.score - a.score || a.employee_id.localeCompare(b.employee_id)).slice(0, 3);
    expect(expected.length).toBeGreaterThan(0);
    expect(alternatives[0]?.candidates.map(c => c.employee_id)).toEqual(expected.map(c => c.employee_id));
  });
});
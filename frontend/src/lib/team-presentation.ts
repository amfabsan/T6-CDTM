import { selectTeams, selectTop, type TeamFilters, type TeamSort } from './matching';
import type { MatchResponse, MatchTeam } from './types';

export function topFourTeams(teams: MatchTeam[], filters: TeamFilters, sort: TeamSort) {
  const result = selectTeams(teams, filters, sort);
  return { ...result, shown: result.shown.slice(0, 4) };
}

/** The #1 team for each criterion, using the same filters and tie-breaks as the tabs. */
export function topPerCriterion(teams: MatchTeam[], filters: TeamFilters) {
  return (['fit', 'cost', 'start', 'continuity'] as TeamSort[]).map((sort) => ({
    sort,
    team: selectTeams(teams, filters, sort).shown[0] ?? null,
  }));
}

/** Alternatives are existing service rankings, never replacement teams computed locally. */
export function memberAlternatives(match: MatchResponse, team: MatchTeam, employeeId?: string) {
  const members = new Set(team.members.map(m => m.employee_id));
  const roles = [...new Set(team.members.filter(m => !employeeId || m.employee_id === employeeId).map(m => m.role))];
  return roles.map(role => ({ role, candidates: selectTop((match.ranking[role]?.items ?? []).filter(c => !members.has(c.employee_id)), 0, 3) }));
}
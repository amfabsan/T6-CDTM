import { useQuery } from "@tanstack/react-query";
import { getCandidates, getProfile, isLive } from "./api";
import { enrich, MOCK_INTERPRET } from "./mock-data";
import { useProject } from "./project-store";

/** Candidates per role: ids from candidatos_proyecto, facts from perfil, fit simulated. */
export function useCandidates() {
  const { projectId, requirements } = useProject();
  const req = requirements ?? MOCK_INTERPRET.requirements;
  const pid = projectId ?? "mock-project";
  const q = useQuery({
    queryKey: ["candidatos", pid, req.roles.map((r) => r.title).join("|")],
    queryFn: async () => {
      const roles = await getCandidates(pid);
      return Promise.all(roles.map(async (rc) => {
        const role = req.roles.find((r) => r.role_index === rc.role_index) ?? req.roles[0]!;
        const list = await Promise.all(rc.candidates.map(async (c, i) => {
          const p = isLive ? await getProfile(c.employee_id).catch(() => null) : null;
          return enrich(c, role, i, p, req.project.client_sector);
        }));
        return { ...rc, enriched: list.sort((a, b) => b.fit - a.fit) };
      }));
    },
  });
  return { ...q, req, simulatedProfiles: !isLive };
}

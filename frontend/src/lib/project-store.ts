import { useSyncExternalStore } from "react";
import type { InterpretResult, Requirements } from "./types";

interface State {
  interpretation: InterpretResult | null;
  requirements: Requirements | null;
  projectId: string | null;
  demo: boolean;
  teamId: string | null;
  teamArrival: boolean;
}
export const EMPTY: State = { interpretation: null, requirements: null, projectId: null, demo: false, teamId: null, teamArrival: false };
let state: State = EMPTY;
const subs = new Set<() => void>();

export function setProject(patch: Partial<State>) {
  state = { ...state, ...patch };
  subs.forEach((s) => s());
}
export function useProject() {
  return useSyncExternalStore(
    (cb) => (subs.add(cb), () => subs.delete(cb)),
    () => state,
    () => state,
  );
}

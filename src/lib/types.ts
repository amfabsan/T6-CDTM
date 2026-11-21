// Tipos de dominio de SkillSonar. Sin dependencias: se usan igual en la app (Lovable/Vite)
// y en los scripts de Node (scripts/verify_demo.ts).

/** verificada = consta en un registro de la empresa (CV interno, histórico, certificación o revisión del manager).
 *  autodeclarada = la persona lo ha contado (nota de voz) y lo ha confirmado, pero nadie lo ha contrastado. */
export type EvidenceStatus = "verificada" | "autodeclarada";

export type EvidenceSource = "cv" | "project" | "voice" | "manager";

export interface Evidence {
  skill: string;
  status: EvidenceStatus;
  source: EvidenceSource;
  /** Cita literal (voz) o texto del registro que la respalda. */
  quote?: string;
  project?: string;
}

export interface Person {
  id: string;
  name: string;
  role?: string;
  availabilityPct: number;
  currentProject?: string;
  evidence: Evidence[];
}

/** Lo que se exige POR PERSONA (minAvailabilityPct) y lo que se exige AL EQUIPO (musts/nices). */
export interface StaffingRequest {
  musts: string[];
  nices: string[];
  minAvailabilityPct: number;
  maxTeamSize: number;
}

export interface ProjectRecord {
  employeeId: string;
  project: string;
  text: string;
}

/** Estado de un requisito: cubierto con evidencia verificada, solo autodeclarada, o sin evidencia. */
export type CoverageStatus = EvidenceStatus | "sin_evidencia";

export interface RequirementCoverage {
  skill: string;
  status: CoverageStatus;
  coveredBy: string | null; // id de la persona que aporta la mejor evidencia
  evidence: Evidence | null;
}

export interface TeamCoverage {
  rows: RequirementCoverage[];
  verified: number;
  pending: number;
  missing: number;
  nicesCovered: number;
}

export type CandidateLabel =
  | { kind: "cumple" }
  | { kind: "revisar"; pending: string[] }
  | { kind: "falta"; missing: string[]; pending: string[] };

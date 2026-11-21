export type Modality = "remoto" | "híbrido" | "presencial";
export type Availability = "En banca" | "Roll-off próximo (<3 meses)";

export interface SkillReq {
  name: string;
  min_level?: number;
  /** Phrase of the plan this skill was interpreted from (jargon translation). */
  source_phrase?: string;
}

export interface RoleReq {
  role_index: number;
  title: string;
  seats: number;
  seniority: string;
  min_years: number;
  must: SkillReq[];
  nice: SkillReq[];
}

export interface ProjectInfo {
  name: string;
  client_sector: string;
  country: string;
  modality: Modality;
  country_required: boolean;
}

export interface Requirements {
  project: ProjectInfo;
  roles: RoleReq[];
}

export interface ReviewItem {
  type: "eliminado" | "corregido" | "revisar";
  item: string;
  reason: string;
}

export interface InterpretResult {
  requirements: Requirements;
  review: ReviewItem[];
  row_template: Record<string, unknown>;
  source_text: string;
}

export interface RawCandidate {
  employee_id: string;
  rrf: number;
  pos_texto: number | null;
  pos_vector: number | null;
}

export interface RoleCandidates {
  role_index: number;
  title: string;
  count: number;
  n_filtrados: number;
  candidates: RawCandidate[];
}

export interface Evidence {
  kind: "skill" | "project" | "cert";
  label: string;
  /** true = demonstrated (lime), false = solo declarada (amber), null = unknown (neutral) */
  demonstrated: boolean | null;
  /** Key of the profile item this evidence comes from, e.g. "skill:AWS". */
  ref: string;
}

export interface ProfileSkill { name: string; level: number | null; years: number | null; demonstrated: boolean | null }
export interface ProfileProject { name: string; year: number | null; role?: string | undefined }
/** Real data from rpc perfil (or simulated when the backend is not configured). */
export interface Profile {
  name: string;
  /** Exactly as stored, e.g. "En banca" / "Roll-off próximo (<3 meses)". */
  availability: string;
  area: string;
  skills: ProfileSkill[];
  projects: ProfileProject[];
  certifications: string[];
}

export interface ScorePart {
  label: string;
  value: number;
}

export interface EnrichedCandidate extends RawCandidate {
  name: string;
  area: string;
  availability: Availability | string;
  profile: Profile;
  profile_simulated: boolean;
  fit: number;
  breakdown: ScorePart[];
  evidence: Evidence[];
  gaps: string[];
  certifications: string[];
  hidden_talent: boolean;
}

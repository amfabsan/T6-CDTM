// ---------- interpret-project ----------
export type Modality = "remoto" | "hibrido" | "presencial";
export type Availability = "En banca" | "Roll-off próximo (<3 meses)";

export interface MandatorySkill { name: string; min_level: number | null }
export interface DesirableSkill { name: string }
export interface LanguageReq { name: string; level: string | null }

export interface RoleReq {
  title: string;
  count: number;
  matching_roles: string[];
  seniority_min: string;
  min_years_experience: number;
  mandatory_skills: MandatorySkill[];
  desirable_skills: DesirableSkill[];
  languages: LanguageReq[];
  /** All required. */
  certifications: string[];
  /** Any one of them. */
  certification_options: string[];
}

export interface ProjectInfo {
  project_name: string;
  client_sector: string;
  country: string;
  city: string | null;
  modality: Modality | null;
  country_required: boolean;
  /** YYYY-MM-DD */
  start_date: string | null;
}

export interface Requirements { project: ProjectInfo; roles: RoleReq[] }

export interface ReviewItem {
  path: string;
  value: unknown;
  reason: string;
  action: "eliminado" | "corregido" | "revisar";
}

export interface InterpretResult {
  source: "pdf" | "texto";
  source_text: string;
  interpretation_raw: unknown;
  requirements: Requirements;
  review: ReviewItem[];
  row_template: Record<string, unknown>;
}

// ---------- candidatos_proyecto ----------
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

// ---------- perfil ----------
export interface PerfilSkill { skill: string; nivel: number; anios: number; demostrada: boolean; n_proyectos: number; ultimo_anio: number | null }
export interface PerfilProyecto { orden: number; nombre: string; cliente_sector: string; anio: number; rol: string; tecnologias: string[] }
export interface PerfilExperiencia { orden: number; empresa: string; puesto: string; inicio: string; fin: string | null; es_actual: boolean; ubicacion: string; tecnologias: string[]; es_ntt: boolean }
export interface PerfilEstudio { nivel: string; titulo: string; institucion: string; anio_inicio: number | null; anio_fin: number | null }
export interface PerfilCertificacion { nombre: string; anio: number | null }
export interface PerfilIdioma { idioma: string; nivel: string }

export interface Perfil {
  employee_id: string;
  nombre: string;
  apellidos: string;
  nombre_completo: string;
  email: string;
  pais: string;
  ciudad: string;
  area: string;
  rol: string;
  nivel_seniority: string;
  puesto_actual: string;
  anios_experiencia: number;
  anios_en_ntt: number;
  fecha_incorporacion: string;
  sector_principal: string;
  disponibilidad: Availability;
  modalidad_trabajo: "Híbrido" | "Presencial" | "Remoto";
  movilidad_internacional: boolean;
  metodologias: string[];
  habilidades_blandas: string[];
  skills_texto: string;
  resumen: string;
  sectores_proyectos: string[];
  skills: PerfilSkill[];
  proyectos: PerfilProyecto[];
  experiencia: PerfilExperiencia[];
  estudios: PerfilEstudio[];
  certificaciones: PerfilCertificacion[];
  idiomas: PerfilIdioma[];
}

// ---------- UI view model ----------
export interface Evidence {
  kind: "skill" | "project" | "cert";
  label: string;
  /** true = Demostrada, false = Solo declarada */
  demonstrated: boolean;
  /** Profile item key, e.g. "skill:AWS". */
  ref: string;
}
export interface ScorePart { label: string; value: number }

export interface EnrichedCandidate extends RawCandidate {
  name: string;
  area: string;
  availability: Availability | string;
  profile: Perfil;
  profile_simulated: boolean;
  fit: number;
  breakdown: ScorePart[];
  evidence: Evidence[];
  gaps: string[];
  certifications: string[];
  hidden_talent: boolean;
}

// ---------- Python matching service: POST /match ----------
export type BreakdownKey = "mandatory" | "evidence" | "sectorRole" | "seniority" | "desirable" | "langCert" | "recency";
export interface BreakdownPart { value: number; weight: number; points: number }
export interface MatchSkill { name: string; tipo: "obligatoria" | "deseable"; nivel: number; anios: number; demostrada: boolean; confianza: number }
export interface MatchEvidence { proyecto: string; anio: number; sector: string; skills: string[] }
export interface MatchCandidate {
  employee_id: string;
  nombre_completo: string;
  puesto_actual: string;
  role: string;
  nivel_seniority: string;
  disponibilidad: string;
  pais: string;
  modalidad_trabajo: string;
  score: number;
  breakdown: Record<BreakdownKey, BreakdownPart>;
  gaps: string[];
  risks: string[];
  evidence: MatchEvidence[];
  skills: MatchSkill[];
}
export interface MatchExcluded { employee_id: string; score: number; reasons: string[] }
export interface MatchTeamMember { role: string; employee_id: string; nombre_completo: string; score: number; disponibilidad: string; available_on: string | null; cost: number | null }
export interface MatchTeam {
  id: string;
  /** Average fit, unrounded. */
  fit: number;
  members: MatchTeamMember[];
  cost: { value: number | null; status: "estimado" | "supuesto" | "por estimar"; is_illustrative: true };
  start: { date: string | null; status: "estimado" | "supuesto" | "por confirmar" };
  continuity: { covered: number; total: number; pct: number; worst: { employee_id: string; role: string; substitute: string | null; late_substitute: { employee_id: string; available_on: string } | null } };
  gaps: number;
}
export interface MatchOptions { rate_per_hour?: Record<string, number>; hours_per_person?: number; rolloff_days?: number }

// ---------- explain-recommendations ----------
export interface ExplainPoint { text: string; evidence_ids: string[] }
export interface ExplainResponse {
  teams: { team_id: string; summary: string; reasons: ExplainPoint[]; source: string }[];
  candidates: { employee_id: string; summary: string; strengths: ExplainPoint[]; source: string }[];
  error?: string;
}

export interface MatchResponse {
  assumptions: { rate_per_hour: Record<string, number>; hours_per_person: number; rolloff_days: number; is_illustrative: boolean };
  n_filtrados: Record<string, number>;
  ranking: Record<string, { cumplen: number; total: number; items: MatchCandidate[] }>;
  excluded: Record<string, MatchExcluded[]>;
  top_teams: { cumplen: number; items: MatchTeam[]; pending: MatchTeam[] };
  teams: MatchTeam[];
  members_detail: MatchCandidate[];
}

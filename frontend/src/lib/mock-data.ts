import type {
  EnrichedCandidate, Evidence, InterpretResult, Profile, ProfileProject, ProfileSkill, RawCandidate, RoleCandidates, RoleReq,
} from "./types";

export const MOCK_SOURCE_TEXT = `Proyecto: Modernización de la plataforma de pagos instantáneos para una entidad bancaria española.

El cliente necesita migrar su motor de transferencias a una arquitectura de microservicios desplegada en la nube pública de AWS, con orquestación de contenedores y despliegue continuo. Se busca un arquitecto con más de 10 años de experiencia que haya liderado programas regulados.

Se incorporarán dos desarrolladores backend con sólida experiencia en Java y Spring Boot, acostumbrados a mensajería asíncrona de alto volumen y a bases de datos relacionales. Se valorará experiencia previa en el sector financiero.

Un especialista de seguridad velará por el cumplimiento de la normativa de tarjetas y por la gestión de identidades y accesos. Disponibilidad 24/7 desde el primer día.

Modalidad híbrida en Madrid (España); el cliente exige residencia en España. Se valora inglés B2. Inicio previsto en enero.`;

const roles: RoleReq[] = [
  {
    role_index: 0, title: "Arquitecto cloud senior", seats: 1, seniority: "Senior", min_years: 10,
    must: [
      { name: "AWS", min_level: 4, source_phrase: "nube pública de AWS" },
      { name: "Kubernetes", min_level: 4, source_phrase: "orquestación de contenedores" },
      { name: "Arquitectura de microservicios", min_level: 4, source_phrase: "arquitectura de microservicios" },
    ],
    nice: [
      { name: "CI/CD", source_phrase: "despliegue continuo" },
      { name: "Entornos regulados", source_phrase: "programas regulados" },
    ],
  },
  {
    role_index: 1, title: "Desarrollador backend Java", seats: 2, seniority: "Mid-Senior", min_years: 4,
    must: [
      { name: "Java", min_level: 4, source_phrase: "Java" },
      { name: "Spring Boot", min_level: 3, source_phrase: "Spring Boot" },
      { name: "Kafka", min_level: 3, source_phrase: "mensajería asíncrona" },
    ],
    nice: [
      { name: "PostgreSQL", source_phrase: "bases de datos relacionales" },
      { name: "Sector banca", source_phrase: "sector financiero" },
    ],
  },
  {
    role_index: 2, title: "Especialista de seguridad", seats: 1, seniority: "Senior", min_years: 7,
    must: [
      { name: "PCI-DSS", min_level: 4, source_phrase: "normativa de tarjetas" },
      { name: "IAM", min_level: 3, source_phrase: "gestión de identidades y accesos" },
    ],
    nice: [{ name: "Inglés B2", source_phrase: "inglés B2" }],
  },
];

export const MOCK_INTERPRET: InterpretResult = {
  source_text: MOCK_SOURCE_TEXT,
  requirements: {
    project: {
      name: "Pagos Instantáneos · Banca ES",
      client_sector: "Banca",
      country: "España",
      modality: "híbrido",
      country_required: true,
    },
    roles,
  },
  review: [
    { type: "eliminado", item: "«Disponibilidad 24/7 desde el primer día»", reason: "Es una condición contractual, no una competencia. No debe filtrar personas." },
    { type: "corregido", item: "«orquestación de contenedores» → Kubernetes", reason: "Traducido al catálogo de skills de la compañía." },
    { type: "corregido", item: "«normativa de tarjetas» → PCI-DSS", reason: "Nombre estándar de la norma." },
    { type: "revisar", item: "Inglés B2 como obligatorio", reason: "El plan dice «se valora»: lo dejamos como deseable. Confírmalo." },
    { type: "revisar", item: "Fecha de inicio «enero»", reason: "Sin año ni día concreto. Queda como «Por confirmar»." },
  ],
  row_template: { name: "Pagos Instantáneos · Banca ES", client_sector: "Banca", country: "España", modality: "híbrido" },
};

// ---------- deterministic candidate generator ----------
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
const FIRST = ["Lucía", "Javier", "Marta", "Carlos", "Elena", "Pablo", "Nuria", "Diego", "Irene", "Álvaro", "Sara", "Raúl", "Laura", "Hugo", "Carmen", "Iván", "Paula", "Sergio"];
const LAST = ["García", "Fernández", "López", "Martín", "Sánchez", "Romero", "Navarro", "Torres", "Domínguez", "Vázquez", "Ruiz", "Gil", "Serrano", "Molina", "Ortega", "Castro"];
const AREAS = ["Cloud & Infra", "Banca", "Seguros", "Sector Público", "Telco", "Ciberseguridad"];
const PROJECTS = ["Core bancario Iberia", "Migración AWS Aseguradora", "Pasarela SEPA", "Portal Ciudadano", "Billing Telco 5G", "SOC 24x7 Utilities"];

export const MOCK_FUNNEL_AVAILABLE = 34003;

export function mockCandidates(): RoleCandidates[] {
  return roles.map((r) => {
    const rand = rng(r.role_index * 97 + 13);
    const n = 16;
    const candidates: RawCandidate[] = Array.from({ length: n }, (_, i) => {
      const pv = i + 1;
      const textGap = rand();
      const pos_texto = textGap > 0.82 ? null : Math.max(1, Math.round(pv + (textGap - 0.4) * 80));
      return { employee_id: `E${r.role_index}${String(1000 + i * 37)}`, rrf: +(0.033 - i * 0.0013).toFixed(4), pos_texto, pos_vector: pv };
    });
    return { role_index: r.role_index, title: r.title, count: n, n_filtrados: [1284, 3412, 612][r.role_index] ?? 500, candidates };
  });
}

function hashId(id: string) {
  let h = 7;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 100000;
  return h;
}

const OTHER_SKILLS = ["Python", "Terraform", "Angular", "SQL Server", "Scrum", "Azure"];
const CERTS = [["AWS Solutions Architect Pro", "CKA Kubernetes"], ["Oracle Java SE 17", "Confluent Kafka Dev"], ["CISSP", "PCI Professional"]];

/** Simulated profile, used only when the real rpc perfil is not available. */
export function mockProfile(raw: RawCandidate, role: RoleReq, rank: number): Profile {
  const rand = rng(hashId(raw.employee_id) + 3);
  const skills: ProfileSkill[] = [];
  role.must.forEach((s, i) => {
    if (rank > 3 && i > 0 && rand() > 0.72) return; // gap
    skills.push({ name: s.name, level: Math.min(5, (s.min_level ?? 3) + (rand() > 0.5 ? 1 : 0)), years: 2 + Math.floor(rand() * 8), demonstrated: rand() > 0.3 });
  });
  role.nice.forEach((s) => rand() > 0.5 && skills.push({ name: s.name, level: 3, years: 1 + Math.floor(rand() * 5), demonstrated: false }));
  skills.push({ name: OTHER_SKILLS[Math.floor(rand() * OTHER_SKILLS.length)] ?? "SQL", level: 3, years: 3, demonstrated: true });
  const projects: ProfileProject[] = Array.from({ length: 3 }, (_, k) => ({ name: PROJECTS[Math.floor(rand() * PROJECTS.length)] ?? "Proyecto", year: 2024 - k * 2 - Math.floor(rand() * 2), role: role.title }));
  const certifications = rand() > 0.45 ? (CERTS[role.role_index] ?? []).slice(0, rand() > 0.5 ? 2 : 1) : [];
  return {
    name: `${FIRST[Math.floor(rand() * FIRST.length)]} ${LAST[Math.floor(rand() * LAST.length)]}`,
    availability: rand() > 0.35 ? "En banca" : "Roll-off próximo (<3 meses)",
    area: AREAS[Math.floor(rand() * AREAS.length)] ?? "Banca",
    skills, projects, certifications,
  };
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const findSkill = (p: Profile, name: string) => p.skills.find((s) => norm(s.name).includes(norm(name)) || norm(name).includes(norm(s.name)));

export function skillLabel(s: ProfileSkill) {
  return [s.name, s.level != null ? `nivel ${s.level}` : null, s.years != null ? `${s.years} años` : null].filter(Boolean).join(" · ");
}

/**
 * Builds the candidate view. Profile facts (name, availability, skills, projects, certs) come from
 * `profile` when given (real rpc perfil); fit % and breakdown are ALWAYS simulated for now.
 */
export function enrich(raw: RawCandidate, role: RoleReq, rank: number, profile?: Profile | null, clientSector = "Banca"): EnrichedCandidate {
  const rand = rng(hashId(raw.employee_id));
  const p = profile ?? mockProfile(raw, role, rank);
  const fit = Math.max(41, Math.round(94 - rank * 3.1 - rand() * 4));
  const evidence: Evidence[] = [];
  const gaps: string[] = [];
  for (const s of role.must) {
    const m = findSkill(p, s.name);
    if (m) evidence.push({ kind: "skill", label: skillLabel(m), demonstrated: m.demonstrated, ref: `skill:${m.name}` });
    else gaps.push(s.name);
  }
  for (const s of role.nice) {
    const m = findSkill(p, s.name);
    if (m) evidence.push({ kind: "skill", label: skillLabel(m), demonstrated: m.demonstrated, ref: `skill:${m.name}` });
  }
  const proj = [...p.projects].sort((a, b) => (b.year ?? 0) - (a.year ?? 0))[0];
  if (proj) evidence.push({ kind: "project", label: [proj.name, proj.year].filter(Boolean).join(" · "), demonstrated: true, ref: `project:${proj.name}` });
  p.certifications.forEach((c) => evidence.push({ kind: "cert", label: c, demonstrated: true, ref: `cert:${c}` }));
  const sk = Math.round(fit * 0.45), ex = Math.round(fit * 0.25), pr = Math.round(fit * 0.18);
  const hidden_talent = !!p.area && !norm(p.area).includes(norm(clientSector)) && !/cloud/i.test(p.area) && fit >= 70 && (profile ? true : rand() > 0.4);
  return {
    ...raw,
    name: p.name, area: p.area, availability: p.availability, profile: p, profile_simulated: !profile,
    fit, hidden_talent, gaps, evidence, certifications: p.certifications,
    breakdown: [
      { label: "Skills", value: sk },
      { label: "Experiencia", value: ex },
      { label: "Proyectos", value: pr },
      { label: "Certificaciones", value: Math.max(0, fit - sk - ex - pr) },
    ],
  };
}

export function foundByMeaning(c: RawCandidate) {
  if (c.pos_vector == null || c.pos_vector > 20) return false;
  return c.pos_texto == null || c.pos_texto - c.pos_vector >= 40;
}

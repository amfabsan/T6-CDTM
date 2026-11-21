import type { InterpretResult, MatchCandidate, Perfil, RoleReq } from "./types";

export const MOCK_SOURCE_TEXT = `Project: Modernization of the instant payments platform for a Spanish bank.

The client needs to migrate its transfer engine to a microservices architecture deployed on the AWS public cloud, with container orchestration and continuous deployment. We are looking for an architect with more than 10 years of experience who has led regulated programs.

Two backend developers will join, with solid experience in Java and Spring Boot, used to high-volume asynchronous messaging and relational databases. Previous experience in the financial sector is a plus.

A security specialist will ensure compliance with card payment regulations and manage identity and access. 24/7 availability from day one.

Hybrid work in Madrid (Spain); the client requires residence in Spain. English B2 is a plus. Expected start in January.`;

const roles: RoleReq[] = [
  {
    title: "Senior cloud architect", count: 1, matching_roles: ["Arquitecto Cloud", "Arquitecto de Soluciones"], seniority_min: "Senior", min_years_experience: 10,
    mandatory_skills: [{ name: "AWS", min_level: 4 }, { name: "Kubernetes", min_level: 4 }, { name: "Arquitectura de microservicios", min_level: 4 }],
    desirable_skills: [{ name: "CI/CD" }, { name: "Entornos regulados" }],
    languages: [], certifications: [], certification_options: ["AWS Solutions Architect Pro", "CKA Kubernetes"],
  },
  {
    title: "Java backend developer", count: 2, matching_roles: ["Desarrollador Backend", "Desarrollador Java"], seniority_min: "Mid", min_years_experience: 4,
    mandatory_skills: [{ name: "Java", min_level: 4 }, { name: "Spring Boot", min_level: 3 }, { name: "Kafka", min_level: 3 }],
    desirable_skills: [{ name: "PostgreSQL" }, { name: "Sector banca" }],
    languages: [], certifications: [], certification_options: [],
  },
  {
    title: "Security specialist", count: 1, matching_roles: ["Especialista Ciberseguridad", "Consultor de Seguridad"], seniority_min: "Senior", min_years_experience: 7,
    mandatory_skills: [{ name: "PCI-DSS", min_level: 4 }, { name: "IAM", min_level: 3 }],
    desirable_skills: [],
    languages: [{ name: "Inglés", level: "B2" }], certifications: [], certification_options: ["CISSP", "PCI Professional"],
  },
];

const tr = (i: number, list: "mandatory_skills" | "desirable_skills", j: number, value: string, phrase: string) =>
  ({ path: `roles[${i}].${list}[${j}].name`, value, reason: `“${phrase}” maps to ${value} in the skills catalog.`, action: "corregido" as const });

export const MOCK_INTERPRET: InterpretResult = {
  source: "texto",
  source_text: MOCK_SOURCE_TEXT,
  interpretation_raw: null,
  requirements: {
    project: { project_name: "Instant Payments · Spanish Bank", client_sector: "Banca", country: "España", city: "Madrid", modality: "hibrido", country_required: true, start_date: null },
    roles,
  },
  review: [
    { path: "roles[2].requirements", value: "24/7 availability from day one", reason: "It is a contractual condition, not a skill. It must not filter people.", action: "eliminado" },
    tr(0, "mandatory_skills", 1, "Kubernetes", "container orchestration"),
    tr(0, "mandatory_skills", 2, "Arquitectura de microservicios", "microservices architecture"),
    tr(0, "desirable_skills", 0, "CI/CD", "continuous deployment"),
    tr(0, "desirable_skills", 1, "Entornos regulados", "regulated programs"),
    tr(1, "mandatory_skills", 2, "Kafka", "asynchronous messaging"),
    tr(1, "desirable_skills", 0, "PostgreSQL", "relational databases"),
    tr(1, "desirable_skills", 1, "Sector banca", "financial sector"),
    tr(2, "mandatory_skills", 0, "PCI-DSS", "card payment regulations"),
    tr(2, "mandatory_skills", 1, "IAM", "identity and access"),
    { path: "roles[2].languages[0]", value: { name: "Inglés", level: "B2" }, reason: "The plan says “is a plus”: confirm whether it should be mandatory.", action: "revisar" },
    { path: "project.start_date", value: null, reason: "“Expected start in January” gives no year or day. It stays as “To be confirmed”.", action: "revisar" },
  ],
  row_template: { project_name: "Instant Payments · Spanish Bank", client_sector: "Banca", country: "España", city: "Madrid", modality: "hibrido", country_required: true, project_start_date: null, roles },
};

/** Simulated perfil built from a matching candidate (only when the backend is not configured). */
export function perfilFromMatch(c: MatchCandidate): Perfil {
  const [nombre = "", ...rest] = c.nombre_completo.split(" ");
  return {
    employee_id: c.employee_id, nombre, apellidos: rest.join(" "), nombre_completo: c.nombre_completo, email: "", pais: c.pais, ciudad: "Madrid",
    area: "Tecnología", rol: c.puesto_actual, nivel_seniority: c.nivel_seniority, puesto_actual: c.puesto_actual, anios_experiencia: Math.max(...c.skills.map((s) => s.anios), 0),
    anios_en_ntt: 0, fecha_incorporacion: "", sector_principal: c.evidence[0]?.sector ?? "", disponibilidad: c.disponibilidad as Perfil["disponibilidad"],
    modalidad_trabajo: c.modalidad_trabajo as Perfil["modalidad_trabajo"], movilidad_internacional: false, metodologias: [], habilidades_blandas: [],
    skills_texto: c.skills.map((s) => s.name).join(", "), resumen: `${c.puesto_actual} (${c.nivel_seniority}).`, sectores_proyectos: [...new Set(c.evidence.map((e) => e.sector))],
    skills: c.skills.map((s) => ({ skill: s.name, nivel: s.nivel, anios: s.anios, demostrada: s.demostrada, n_proyectos: 0, ultimo_anio: null })),
    proyectos: c.evidence.map((e, i) => ({ orden: i + 1, nombre: e.proyecto, cliente_sector: e.sector, anio: e.anio, rol: c.puesto_actual, tecnologias: e.skills })),
    experiencia: [], estudios: [], certificaciones: [], idiomas: [],
  };
}

/** Phrase in the plan ↔ skill chip it became. Uses "corregido" review items that quote the original phrase. */
export function jargonMappings(roles: RoleReq[], review: InterpretResult["review"], text: string) {
  const lower = text.toLowerCase();
  const out: { key: string; phrase: string; skill: string; translated: boolean }[] = [];
  roles.forEach((r, i) => [...r.mandatory_skills, ...r.desirable_skills].forEach((s) => {
    const key = `${i}:${s.name}`;
    const rv = review.find((x) => x.action === "corregido" && String(x.value) === s.name && x.path.startsWith(`roles[${i}]`))
      ?? review.find((x) => x.action === "corregido" && String(x.value) === s.name);
    const q = rv?.reason.match(/[«"“]([^»"”]+)[»"”]/)?.[1];
    if (q && lower.includes(q.toLowerCase())) out.push({ key, phrase: q, skill: s.name, translated: true });
    else if (lower.includes(s.name.toLowerCase())) out.push({ key, phrase: s.name, skill: s.name, translated: false });
  }));
  return out;
}

import type { InterpretResult, MatchCandidate, Perfil, RoleReq } from "./types";

export const MOCK_SOURCE_TEXT = `Proyecto: Modernización de la plataforma de pagos instantáneos para una entidad bancaria española.

El cliente necesita migrar su motor de transferencias a una arquitectura de microservicios desplegada en la nube pública de AWS, con orquestación de contenedores y despliegue continuo. Se busca un arquitecto con más de 10 años de experiencia que haya liderado programas regulados.

Se incorporarán dos desarrolladores backend con sólida experiencia en Java y Spring Boot, acostumbrados a mensajería asíncrona de alto volumen y a bases de datos relacionales. Se valorará experiencia previa en el sector financiero.

Un especialista de seguridad velará por el cumplimiento de la normativa de tarjetas y por la gestión de identidades y accesos. Disponibilidad 24/7 desde el primer día.

Modalidad híbrida en Madrid (España); el cliente exige residencia en España. Se valora inglés B2. Inicio previsto en enero.`;

const roles: RoleReq[] = [
  {
    title: "Arquitecto cloud senior", count: 1, matching_roles: ["Arquitecto Cloud", "Arquitecto de Soluciones"], seniority_min: "Senior", min_years_experience: 10,
    mandatory_skills: [{ name: "AWS", min_level: 4 }, { name: "Kubernetes", min_level: 4 }, { name: "Arquitectura de microservicios", min_level: 4 }],
    desirable_skills: [{ name: "CI/CD" }, { name: "Entornos regulados" }],
    languages: [], certifications: [], certification_options: ["AWS Solutions Architect Pro", "CKA Kubernetes"],
  },
  {
    title: "Desarrollador backend Java", count: 2, matching_roles: ["Desarrollador Backend", "Desarrollador Java"], seniority_min: "Mid", min_years_experience: 4,
    mandatory_skills: [{ name: "Java", min_level: 4 }, { name: "Spring Boot", min_level: 3 }, { name: "Kafka", min_level: 3 }],
    desirable_skills: [{ name: "PostgreSQL" }, { name: "Sector banca" }],
    languages: [], certifications: [], certification_options: [],
  },
  {
    title: "Especialista de seguridad", count: 1, matching_roles: ["Especialista Ciberseguridad", "Consultor de Seguridad"], seniority_min: "Senior", min_years_experience: 7,
    mandatory_skills: [{ name: "PCI-DSS", min_level: 4 }, { name: "IAM", min_level: 3 }],
    desirable_skills: [],
    languages: [{ name: "Inglés", level: "B2" }], certifications: [], certification_options: ["CISSP", "PCI Professional"],
  },
];

const tr = (i: number, list: "mandatory_skills" | "desirable_skills", j: number, value: string, phrase: string) =>
  ({ path: `roles[${i}].${list}[${j}].name`, value, reason: `«${phrase}» se traduce a ${value} del catálogo de skills.`, action: "corregido" as const });

export const MOCK_INTERPRET: InterpretResult = {
  source: "texto",
  source_text: MOCK_SOURCE_TEXT,
  interpretation_raw: null,
  requirements: {
    project: { project_name: "Pagos Instantáneos · Banca ES", client_sector: "Banca", country: "España", city: "Madrid", modality: "hibrido", country_required: true, start_date: null },
    roles,
  },
  review: [
    { path: "roles[2].requirements", value: "Disponibilidad 24/7 desde el primer día", reason: "Es una condición contractual, no una competencia. No debe filtrar personas.", action: "eliminado" },
    tr(0, "mandatory_skills", 1, "Kubernetes", "orquestación de contenedores"),
    tr(0, "desirable_skills", 0, "CI/CD", "despliegue continuo"),
    tr(0, "desirable_skills", 1, "Entornos regulados", "programas regulados"),
    tr(1, "mandatory_skills", 2, "Kafka", "mensajería asíncrona"),
    tr(1, "desirable_skills", 0, "PostgreSQL", "bases de datos relacionales"),
    tr(1, "desirable_skills", 1, "Sector banca", "sector financiero"),
    tr(2, "mandatory_skills", 0, "PCI-DSS", "normativa de tarjetas"),
    tr(2, "mandatory_skills", 1, "IAM", "gestión de identidades y accesos"),
    { path: "roles[2].languages[0]", value: { name: "Inglés", level: "B2" }, reason: "El plan dice «se valora»: confirma si debe ser obligatorio.", action: "revisar" },
    { path: "project.start_date", value: null, reason: "«Inicio previsto en enero» no indica año ni día. Queda como «Por confirmar».", action: "revisar" },
  ],
  row_template: { project_name: "Pagos Instantáneos · Banca ES", client_sector: "Banca", country: "España", city: "Madrid", modality: "hibrido", country_required: true, project_start_date: null, roles },
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

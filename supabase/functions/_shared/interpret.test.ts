// Pruebas de la validación (paso 3). Ejecutar: node --test --experimental-strip-types supabase/functions/_shared/interpret.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildResponseSchema, buildSystemPrompt, validateInterpretation, type Vocabulario } from "./interpret.ts";

const vocab: Vocabulario = {
  skills: ["Kubernetes", "Terraform", "Azure", "AWS", "Java", "Spring Boot", "Ciberseguridad"],
  roles: ["Cloud Architect", "Backend Developer Java", "Security Architect", "DevOps Engineer"],
  sectores: ["Banca y Finanzas", "Sector Público", "Retail y Consumo"],
  certificaciones: ["Certified Kubernetes Administrator (CKA)", "PMP"],
  idiomas: ["Inglés", "Español", "Francés"],
  paises: ["España", "México"],
  ciudades: ["Madrid", "Valencia"],
  niveles_idioma: ["A1", "A2", "B1", "B2", "C1", "C2", "Nativo"],
  seniorities: ["Trainee", "Junior", "Mid", "Senior", "Lead", "Principal"],
  modalidades: ["remoto", "hibrido", "presencial"],
};

test("elimina lo que no existe y lo apunta en review", () => {
  const { requirements, review } = validateInterpretation({
    project: { client_sector: "Banca", country: "Spain", modality: "Remote", country_required: true, city: "Atlantis" },
    roles: [{
      title: "Arquitecto cloud", count: 1, matching_roles: ["Cloud Architect", "Rol Inventado"],
      seniority_min: "Senior", min_years_experience: 5,
      mandatory_skills: [{ name: "kubernetes", min_level: 4 }, { name: "Quantum Blockchain", min_level: 3 }],
      desirable_skills: [{ name: "Terraform" }, { name: "Kubernetes" }],
      languages: [{ name: "English", level: "B2" }],
      certifications: ["CKA inventada", "PMP"],
    }],
  }, vocab);

  const r = requirements.roles[0];
  assert.deepEqual(r.matching_roles, ["Cloud Architect"]);
  assert.deepEqual(r.mandatory_skills, [{ name: "Kubernetes", min_level: 4 }]);
  assert.deepEqual(r.desirable_skills, [{ name: "Terraform" }], "una obligatoria no se repite como deseable");
  assert.deepEqual(r.languages, [{ name: "Inglés", level: "B2" }]);
  assert.deepEqual(r.certifications, ["PMP"]);
  assert.equal(requirements.project.client_sector, null, "'Banca' no es un sector exacto: se elimina, no se adivina");
  assert.equal(requirements.project.country, "España");
  assert.equal(requirements.project.city, null);
  assert.equal(requirements.project.modality, "remoto");
  assert.equal(requirements.project.country_required, true);

  const eliminados = review.filter((x) => x.action === "eliminado").map((x) => x.value);
  for (const v of ["Rol Inventado", "Quantum Blockchain", "CKA inventada", "Banca", "Atlantis"]) assert.ok(eliminados.includes(v), v);
});

test("no inventa: nulls y listas vacías se quedan vacíos; count por defecto 1 con aviso", () => {
  const { requirements, review } = validateInterpretation({
    project: { country_required: false },
    roles: [{ title: "Backend", matching_roles: ["Backend Developer Java"], mandatory_skills: [], desirable_skills: [], languages: [], certifications: [] }],
  }, vocab);
  const r = requirements.roles[0];
  assert.equal(r.count, 1);
  assert.equal(r.seniority_min, null);
  assert.equal(r.min_years_experience, null);
  assert.deepEqual(r.mandatory_skills, []);
  assert.ok(review.some((x) => x.path === "roles[0].count"));
  assert.equal(requirements.project.country, null);
  assert.equal(requirements.project.modality, null);
});

test("certificaciones alternativas: se quedan solo las que existen", () => {
  const { requirements } = validateInterpretation({
    project: {}, roles: [{ title: "Seguridad", count: 1, matching_roles: ["Security Architect"], mandatory_skills: [], desirable_skills: [],
      languages: [], certifications: [], certification_options: ["PMP", "CEH inexistente", "Certified Kubernetes Administrator (CKA)"] }],
  }, vocab);
  assert.deepEqual(requirements.roles[0].certification_options, ["PMP", "Certified Kubernetes Administrator (CKA)"]);
});

test("país exigido sin país válido se desactiva", () => {
  const { requirements } = validateInterpretation({ project: { country: "Narnia", country_required: true }, roles: [] }, vocab);
  assert.equal(requirements.project.country, null);
  assert.equal(requirements.project.country_required, false);
});

test("niveles fuera de rango y fechas mal formadas se eliminan", () => {
  const { requirements } = validateInterpretation({
    project: { start_date: "mañana" },
    roles: [{ title: "x", count: 2, matching_roles: ["DevOps Engineer"], min_years_experience: 99,
              mandatory_skills: [{ name: "AWS", min_level: 9 }], desirable_skills: [], languages: [{ name: "Francés", level: "B9" }], certifications: [] }],
  }, vocab);
  assert.equal(requirements.project.start_date, null);
  assert.equal(requirements.roles[0].min_years_experience, null);
  assert.deepEqual(requirements.roles[0].mandatory_skills, [{ name: "AWS", min_level: null }]);
  assert.deepEqual(requirements.roles[0].languages, [{ name: "Francés", level: null }]);
});

test("sector por rol, horas y ventana de inicio (caso demo: banca obligatoria en Arquitectura, deseable en Backend)", () => {
  const { requirements, review } = validateInterpretation({
    project: { start_date: "2026-11-23", start_deadline_day: 4 },
    roles: [
      { title: "Arquitectura", count: 1, matching_roles: ["Cloud Architect"], mandatory_skills: [{ name: "Azure" }], desirable_skills: [],
        languages: [], certifications: [], sector_experience: ["Banca y Finanzas"], sector_required: true, planned_hours: 40 },
      { title: "Backend", count: 1, matching_roles: ["Backend Developer Java"], mandatory_skills: [], desirable_skills: [],
        languages: [], certifications: [], sector_experience: ["Banca y Finanzas", "Sector Inventado"], sector_required: false, planned_hours: 99999 },
      { title: "Seguridad", count: 1, matching_roles: ["Security Architect"], mandatory_skills: [], desirable_skills: [],
        languages: [], certifications: [], sector_required: true },
    ],
  }, vocab);
  const [a, b, s] = requirements.roles;
  assert.equal(requirements.project.start_deadline_day, 4);
  assert.deepEqual([a.sector_experience, a.sector_required, a.planned_hours], [["Banca y Finanzas"], true, 40]);
  assert.deepEqual([b.sector_experience, b.sector_required, b.planned_hours], [["Banca y Finanzas"], false, null]);
  assert.deepEqual([s.sector_experience, s.sector_required], [[], false], "sin sector no puede ser obligatorio");
  assert.ok(review.some((x) => x.value === "Sector Inventado") && review.some((x) => x.value === 99999));
});

test("obligatorias alternativas (mandatory_any_of): se validan; 1 opción → obligatoria normal; 0 → revisar", () => {
  const { requirements, review } = validateInterpretation({
    project: {},
    roles: [{ title: "Seguridad", count: 1, matching_roles: ["Security Architect"], mandatory_skills: [{ name: "Azure" }],
      mandatory_any_of: [{ options: ["Ciberseguridad", "Kubernetes", "Inventada"], min_level: 3 }, { options: ["Terraform", "Otra"] }, { options: ["Nada"] }],
      desirable_skills: [], languages: [], certifications: [] }],
  }, vocab);
  const r = requirements.roles[0];
  assert.deepEqual(r.mandatory_any_of, [{ options: ["Ciberseguridad", "Kubernetes"], min_level: 3 }]);
  assert.deepEqual(r.mandatory_skills, [{ name: "Azure", min_level: null }, { name: "Terraform", min_level: null }]);
  assert.ok(review.some((x) => x.path === "roles[0].mandatory_any_of[2]" && x.action === "revisar"));
});

test("el prompt muestra el área de cada skill si el vocabulario la trae", () => {
  const p = buildSystemPrompt({ ...vocab, skills_area: { Kubernetes: "Cloud & Infraestructura" } });
  assert.ok(p.includes("Kubernetes [Cloud & Infraestructura]"));
});

test("el prompt incluye el vocabulario y el esquema fuerza los enumerados cortos", () => {
  const p = buildSystemPrompt(vocab);
  assert.ok(p.includes("Kubernetes") && p.includes("Cloud Architect") && p.includes("Banca y Finanzas"));
  const s = buildResponseSchema(vocab) as any;
  assert.deepEqual(s.properties.project.properties.client_sector.enum, vocab.sectores);
  assert.deepEqual(s.properties.roles.items.properties.seniority_min.enum, vocab.seniorities);
});

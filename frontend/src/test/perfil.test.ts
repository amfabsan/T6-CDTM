import { describe, expect, it } from "vitest";
import { parsePerfil } from "@/lib/api";
import { enrich, MOCK_INTERPRET } from "@/lib/mock-data";

const role = MOCK_INTERPRET.requirements.roles[0]!;
const raw = { employee_id: "E1", rrf: 0.03, pos_texto: 1, pos_vector: 1 };

describe("real perfil data", () => {
  it("keeps availability exactly as stored", () => {
    const p = parsePerfil({ nombre: "Ana Ruiz", disponibilidad: "Roll-off próximo (<3 meses)" });
    expect(p?.availability).toBe("Roll-off próximo (<3 meses)");
  });
  it("uses real name, skills and no invented certifications", () => {
    const p = parsePerfil({ nombre: "Ana Ruiz", disponibilidad: "En banca", skills: [{ skill: "AWS", nivel: 4, anios: 6 }], certificaciones: [] });
    const c = enrich(raw, role, 0, p);
    expect(c.name).toBe("Ana Ruiz");
    expect(c.evidence[0]?.label).toBe("AWS · nivel 4 · 6 años");
    expect(c.certifications).toEqual([]);
    expect(c.gaps).toContain("Kubernetes");
  });
});

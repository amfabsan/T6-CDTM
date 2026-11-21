/**
 * English display labels for dataset values. The stored values (Spanish, from the
 * NTT DATA dataset and the backend) are never changed: compare against the raw value,
 * show the label. Unknown values are shown as they come.
 */
const AVAILABILITY: Record<string, string> = {
  "En banca": "On bench",
  "Roll-off próximo (<3 meses)": "Roll-off soon (<3 months)",
  Asignado: "Assigned",
};
export const availabilityLabel = (v: string) => AVAILABILITY[v] ?? v;

const MODALITY: Record<string, string> = {
  Híbrido: "Hybrid", hibrido: "Hybrid",
  Presencial: "On-site", presencial: "On-site",
  Remoto: "Remote", remoto: "Remote",
};
export const modalityLabel = (v: string) => MODALITY[v] ?? v;

const SKILL_TYPE: Record<string, string> = { obligatoria: "mandatory", deseable: "desirable" };
export const skillTypeLabel = (v: string) => SKILL_TYPE[v] ?? v;

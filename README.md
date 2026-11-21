# ORBIT AI · T6 · CDTM × UPV-UV Hackathon 2026 (caso NTT DATA)

> **Find the talent. Validate the fit. Make the staffing decision.**
> La persona que necesitas puede estar ya dentro de la compañía. ORBIT encuentra talento más allá de las palabras exactas del CV, valida la adecuación al proyecto con evidencia y ayuda a decidir cómo cubrir la necesidad: con talento interno, contratación externa o un modelo híbrido.

🔗 **Demo:** _(URL de lovable.app)_ · 🎬 **Vídeo:** _(enlace)_ · 📊 **Pitch deck:** _(enlace)_

## Flujo
1. **Project Brief.** El manager describe la necesidad. La IA la convierte en requisitos MUST / NICE, editables antes de buscar.
2. **Talent Discovery.** Ranking de perfiles internos con score desglosado, fortalezas, gaps, riesgos y la evidencia de cada afirmación (nivel, años de uso, proyectos y certificaciones del dataset). Permite comparar candidatos.
3. **Staffing Decision Center.** Escenarios Internal / External / Hybrid calculados con supuestos editables y etiquetados.

## Cómo está hecho
- **Lovable** (React + shadcn) para la interfaz. **Supabase** (Postgres + Edge Functions) para los datos y el backend.
- **Datos:** dataset sintético de NTT DATA (190.000 perfiles). En Supabase están cargados los 34.003 **disponibles** (En banca + Roll-off <3 meses) con todas sus columnas. Ver [`docs/DATA.md`](docs/DATA.md).
- **IA:** el LLM solo interpreta el brief y redacta explicaciones con evidencia recuperada. Los filtros, el score y los escenarios son **código determinista**.

## Para el equipo y sus IAs
Empezad por **[`AGENTS.md`](AGENTS.md)**: estado del repo, tablas reales, reglas, contratos de las edge functions y reparto. El brief técnico completo está en [`docs/IDEA.md`](docs/IDEA.md) (original en `docs/ORBIT_AI_Brief_Tecnico_MVP.docx`).

## Resultados
_(Rellenar con la medición real: tiempo hasta shortlist manual frente a ORBIT, cobertura interna, etc.)_

## Datos y privacidad
Perfiles **sintéticos** proporcionados por NTT DATA. Ningún empleado real. Las claves de API solo viven como secretos de Supabase.

## Equipo T6
_(Nombres y roles)_

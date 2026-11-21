# legacy/ · NO USAR

Diseño anterior del equipo (**SkillSonar**), sustituido por **ORBIT AI**. Ver [`../AGENTS.md`](../AGENTS.md) y [`../docs/ORBIT_AI_Brief_Tecnico_MVP.docx`](../docs/ORBIT_AI_Brief_Tecnico_MVP.docx).

Se conserva solo como referencia:

| Archivo | Por qué no sirve tal cual | Qué se puede aprovechar |
|---|---|---|
| `skillsonar/src/lib/teamBuilder.ts`, `types.ts` | Modelo `Person` con `availabilityPct` inventado. `proposeTeam` prueba todas las combinaciones y no escala | Nada directo. La idea de "cobertura por requisito" encaja con los gaps del módulo B |
| `skillsonar/supabase/extract/index.ts` | Esquema `musts/nices` antiguo y modo "skills" de nota de voz | **Patrón de llamada al LLM** (AI Gateway de Lovable, CORS, parseo de JSON) y la **barrera de citas literales**, reutilizables en `interpret-project` y `match-candidates` |
| `skillsonar/data/*.csv` | Datos inventados antes de tener el dataset | Nada |
| `skillsonar/docs/IDEA.md`, `STACK.md` | Producto y arquitectura de SkillSonar | Contexto del evento y de los premios (IDEA §1-2) |

# ORBIT AI · T6 · CDTM × UPV-UV Hackathon 2026 (caso NTT DATA)

> **Find the talent. Validate the fit. Make the staffing decision.**
> La persona que necesitas puede estar ya dentro de la compañía. ORBIT encuentra talento más allá de las palabras exactas del CV, valida la adecuación al proyecto con evidencia y ayuda a decidir cómo cubrir la necesidad: con talento interno, contratación externa o un modelo híbrido.

🔗 **Demo:** https://project-people-orbit.lovable.app · ⚙️ **API de matching:** https://t6-cdtm.onrender.com/docs · 🎬 **Vídeo:** _(enlace)_ · 📊 **Pitch deck:** _(enlace)_

## Flujo
1. **Project Brief.** El manager describe la necesidad. La IA la convierte en requisitos MUST / NICE, editables antes de buscar.
2. **Talent Discovery.** Ranking de perfiles internos con score desglosado, fortalezas, gaps, riesgos y la evidencia de cada afirmación (nivel, años de uso, proyectos y certificaciones del dataset). Permite comparar candidatos.
3. **Staffing Decision Center.** Escenarios Internal / External / Hybrid calculados con supuestos editables y etiquetados.

## Cómo está hecho
- **Lovable** (React + shadcn) para la interfaz. **Supabase** (Postgres + Edge Functions) para los datos y el backend.
- **Datos:** dataset sintético de NTT DATA (190.000 perfiles). En Supabase están cargados los 34.003 **disponibles** (En banca + Roll-off <3 meses) con todas sus columnas. Ver [`docs/DATA.md`](docs/DATA.md).
- **IA:** el LLM solo interpreta el brief y redacta explicaciones con evidencia recuperada. Los filtros, el score y los escenarios son **código determinista**.

## Frontend (`frontend/`)
La interfaz se construye en **Lovable** y vive en su propio repo, [`chechupv/orbit-talent-intelligence`](https://github.com/chechupv/orbit-talent-intelligence). Lovable no puede conectarse a un repo existente: crea uno nuevo y lo sincroniza.
En este repo, `frontend/` es una **copia sincronizada con `git subtree`** para que la entrega tenga todo junto. **No se edita aquí:** los cambios se hacen en Lovable o en su repo, y se traen con:
```powershell
git subtree pull --prefix=frontend https://github.com/chechupv/orbit-talent-intelligence.git main --squash
```

## Arquitectura desplegada

| Pieza | Dónde | Qué hace |
|---|---|---|
| Web (pasos 1, 4 y la interfaz de 5-11) | Lovable · `project-people-orbit.lovable.app` | Petición escrita → requisitos editables → confirmar → talento → equipos → decisión |
| `interpret-project` (pasos 1-3, LLM) | Supabase Edge Function | Texto → requisitos por rol con Gemini y vocabulario cerrado (614 skills), validados en código |
| Base de datos (pasos 5-6) | Supabase Postgres + pgvector | 34.003 perfiles disponibles, filtros duros, búsqueda exacta + full-text + embeddings (RRF), migraciones `001`–`007` |
| `match-candidates` (pasos 7-10) | Render · `t6-cdtm.onrender.com` (FastAPI, `matching/api.py`) | Score determinista, ranking por rol, equipos (beam search), coste €/h, inicio y continuidad |
| `explain-recommendations` (paso 11, LLM) | Supabase Edge Function | «Por qué este equipo / por qué encaja» con Gemini; toda frase se valida contra la evidencia y, si falla, sale una plantilla |

## Cómo comprobarlo
```bash
python -m venv .venv && .venv/bin/pip install -r matching/requirements.txt
.venv/bin/python -m unittest discover -s matching/tests -t .                      # pasos 7-10 (24 tests)
node --experimental-strip-types --test supabase/functions/_shared/explain.test.ts   # paso 11 (14 tests)
node --experimental-strip-types --test supabase/functions/_shared/interpret.test.ts # paso 2 (9 tests)
curl https://t6-cdtm.onrender.com/health                                            # {"ok":true}
```
Prueba de punta a punta con los 3 briefs de NTT DATA: [`docs/PRUEBA_BRIEFS_NTT.md`](docs/PRUEBA_BRIEFS_NTT.md) (`scripts/e2e/`).

## Para el equipo y sus IAs
Empezad por **[`AGENTS.md`](AGENTS.md)**: estado del repo, tablas reales, reglas, contratos de las edge functions y reparto. El brief técnico completo está en [`docs/IDEA.md`](docs/IDEA.md) (original en `docs/ORBIT_AI_Brief_Tecnico_MVP.docx`).

## Resultados
Medido el 21-11-2026 sobre los datos reales de NTT DATA (sintéticos) en Supabase:

| Qué | Resultado |
|---|---|
| Brief «migración de core bancario a Azure» (3 roles, 4 plazas) | 18.677 perfiles tras filtros duros → 2.045 / 1.237 / 259 candidatos que cumplen por rol → **4.500 equipos válidos**, Top 5 con coste, inicio y continuidad |
| Tiempo de `/match` | ~35 s en local y ~75 s en Render (plan gratuito); el 80 % se va en Postgres. `run_matching` pasó de 188 s a **2,4 s** al ordenar los sustitutos una vez por rol |
| 3 briefs de prueba de NTT | ✅ Core banking: multi-rol sin repetir persona, banca implícita detectada (15 de 15 del Top 5 con proyectos de banca). ✅ Retail: lo «no imprescindible» no filtra. ❌ Ciberseguridad: disponibilidad inmediata y ≥ 3 años no se aplican como filtro duro (pendiente) |
| Paso 11 con Gemini | 17 de 17 personas y 15 de 15 equipos explicados por el LLM, **0 frases inventadas** tras la validación (4-7 s). Si Gemini está saturado, sale la plantilla |

Lo que es supuesto o simulado (dicho también en la demo): tarifas €/h y horas (el dataset no trae costes), fechas de roll-off (45 días supuestos) y, en la web, el modo «Datos simulados» cuando no hay conexión con el backend.

## Datos y privacidad
Perfiles **sintéticos** proporcionados por NTT DATA. Ningún empleado real. Las claves de API solo viven como secretos de Supabase y de Render, nunca en el repo ni en el navegador. Las recomendaciones apoyan una decisión humana: los requisitos tienen que confirmarlos una persona (`confirmar_requisitos`) antes de buscar.

## Equipo T6
Contribuciones según el historial del repo (completad los roles si hace falta):
- **Zhijian Wu Wang:** datos (carga en Supabase, `docs/DATA.md`), paso 2 (`interpret-project`) y sincronización del frontend.
- **Daniel Torres Bursik:** búsqueda (`003`-`007`) y pasos 7-10 (`matching/`, servicio `/match`).
- **Samuel García:** paso 11 (`explain-recommendations`), prompts de Lovable, prueba con los 3 briefs, despliegue en Render y cuaderno de Improven.
- **chechupv:** interfaz en Lovable.
- **Alejandro Fabiano:** _(rol)_

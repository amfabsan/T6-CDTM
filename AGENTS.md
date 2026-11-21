# AGENTS.md · ORBIT AI (T6 · CDTM × UPV-UV Hackathon · caso NTT DATA)

> Guía para cualquier asistente de IA (Claude Code, Cursor, Codex, Lovable…) que trabaje en este repo. **Léela entera antes de tocar nada.**
> Fuente de verdad del producto: [`docs/IDEA.md`](docs/IDEA.md) (original en `docs/ORBIT_AI_Brief_Tecnico_MVP.docx`). Reglas del caso: [`case/caso.pdf`](case/caso.pdf). Datos: [`docs/DATA.md`](docs/DATA.md).
> **Si este archivo y el brief chocan en nombres de tablas o columnas, manda este archivo:** describe lo que está realmente creado y cargado en Supabase.

## 1. Qué es ORBIT AI
*Find the talent. Validate the fit. Make the staffing decision.*

Un manager de NTT DATA describe una necesidad de proyecto en lenguaje natural. ORBIT:
1. la convierte en requisitos estructurados y editables;
2. encuentra talento interno aunque su experiencia esté descrita con otro vocabulario;
3. explica el ranking con evidencia (nivel, años de uso, proyectos y certificaciones que ya están en la base de datos);
4. compara escenarios Internal / External / Hybrid.

> **Decisión del equipo:** el módulo de entrevista de voz del brief (Talent Assessment con ElevenLabs) **está descartado**. El nivel de experiencia de cada persona ya está en la base de datos (`empleado_skills.nivel`, `anios`, `demostrada`, `ultimo_anio`), y la validación del encaje se hace con esa evidencia. No añadáis ElevenLabs, entrevistas ni transcripciones.

**Principio:** la IA interpreta y explica; las reglas deterministas filtran, puntúan y calculan. La decisión final siempre es humana.

| Módulo | Pantalla | Backend |
|---|---|---|
| A. Project Brief | Textarea + requisitos editables (MUST / NICE) | `interpret-project` |
| B. Talent Discovery | Ranking con score desglosado, evidencia, gaps y comparación de ≥3 candidatos | `match-candidates` |
| C. Staffing Decision Center | Internal / External / Hybrid con supuestos editables | `calculate-staffing-scenarios` |

## 2. Estado del repo

| Ruta | Estado | Qué es |
|---|---|---|
| `supabase/migrations/001_schema.sql` | ✅ hecho, cargado | Tablas del **dataset** (solo lectura) + RPC `perfil` y `buscar_personas` |
| `supabase/migrations/002_orbit_app.sql` | ✅ hecho, probado en local | Tablas de la **app**: `project_requirements`, `scenario_assumptions` |
| `scripts/load_profiles.py` | ✅ hecho | Carga Parquet → Postgres y aplica todas las migraciones |
| `scripts/make_sample.py` | ✅ hecho | Regenera `data/sample/` (muestra JSON/CSV y vocabulario) desde el Parquet |
| `data/profiles.parquet` | ✅ | Dataset original: 190.000 perfiles sintéticos |
| `data/sample/profiles_sample.json` / `.csv` | ✅ | 42 perfiles elegidos a propósito, para leer y para pruebas |
| `data/sample/vocabulario.json` | ✅ | 614 skills, roles por área, sectores, certificaciones: **vocabulario para el LLM** |
| `docs/DATA.md` | ✅ | Estructura del dataset, hallazgos y cifras |
| `docs/ITERATIONS.md`, `docs/PATTERNS.md` | ✅ | Cuaderno de Improven e investigación de ediciones anteriores |
| `prompts/lovable.md` | ✅ | Prompts para construir las pantallas en Lovable |
| `supabase/functions/*` | ⏳ **por hacer** | Las 3 edge functions de la §5 |
| `legacy/skillsonar/` | ⛔ **no usar** | Diseño anterior (SkillSonar). Solo como referencia: ver `legacy/README.md` |

## 3. Datos: qué hay en Supabase

- **Origen:** `data/profiles.parquet`. Es el mismo contenido que el workbook `NTT_DATA_Perfiles_T6.xlsx` que cita el brief: 190.000 perfiles, 390.651 proyectos y 450.363 experiencias, recuentos idénticos. **No hace falta convertir el Excel.**
- **Cargado:** solo los perfiles **disponibles**, 34.003: `En banca` 15.267 y `Roll-off próximo (<3 meses)` 18.736. Los `Asignado` no se cargan, por decisión del equipo. Hay todos los roles (87), skills (614), certificaciones (100), países y sectores. Ocupa 114 MB.
- **Fidelidad:** todas las columnas del Parquet se guardan tal cual, sin limpiar. Solo se **añaden** campos derivados.

### Tablas del dataset (001, solo lectura, nombres en español = columnas del Parquet)

| Tabla real | Equivale en el brief a | Columnas clave |
|---|---|---|
| `empleados` | `profiles` | `employee_id` (PK, `NTT0000001`…), `nombre_completo`, `area`, `rol`, `nivel_seniority`, `puesto_actual`, `anios_experiencia`, `anios_en_ntt`, `sector_principal`, `disponibilidad`, `modalidad_trabajo`, `movilidad_internacional`, `metodologias[]`, `habilidades_blandas[]`, `skills_texto`, `resumen`, **`sectores_proyectos[]`** (derivado) |
| `empleado_skills` | `profile_skills` | `employee_id`, `skill` (vocabulario cerrado de 614), `nivel` 1-5, `anios`, **`demostrada`** (derivado: aparece en algún proyecto o puesto), **`n_proyectos`**, **`ultimo_anio`** |
| `proyectos` | `profile_projects` | `employee_id`, `nombre`, `cliente_sector`, `anio`, `rol`, `tecnologias[]` |
| `experiencia` | `profile_experience` | `employee_id`, `empresa`, `puesto`, `inicio`, `fin` (null = actual), `es_actual`, `ubicacion`, `tecnologias[]`, `es_ntt` |
| `certificaciones`, `idiomas`, `estudios` | campos `*_raw` de `profile_skills` | una fila por elemento |
| `catalogo_skills` | — | `skill`, `perfiles`, `area_principal`: vocabulario para restringir al LLM |

RPC disponibles:
- `perfil(p_employee_id)` devuelve el perfil completo en JSON.
- `buscar_personas(p_disponibilidad[], p_area, p_rol, p_sector, p_min_anios, p_skills[], p_min_nivel, p_limit, p_offset)` es un buscador paginado. Exige **todas** las `p_skills` y cada fila trae `total`.

### Tablas de la app (002, se leen y se insertan desde la app)
- `project_requirements`: salida de `interpret-project` revisada por el manager. Guarda también `interpretation_raw`, la salida del LLM sin editar.
- `scenario_assumptions`: supuestos económicos y pesos, con `is_illustrative`. Se versionan **insertando** una fila nueva.

### Cosas del dato que hay que respetar
- `disponibilidad` es **categórica**. Muéstrala exactamente como viene. **Nunca** conviertas "Roll-off próximo" en una fecha.
- `nivel` y `anios` de una skill pueden no cuadrar (≥3 años a nivel 1, o nivel 5 con <1 año). Es un **riesgo** que hay que mostrar, no un motivo de descarte.
- Lo que no aparece no existe: un perfil sin certificaciones no tiene ninguna.
- `metodologias` y `habilidades_blandas` están repartidas al azar en el dataset. No deben pesar en el score.
- La "otra jerga" está **en el brief del manager**, no en los perfiles. El LLM mapea el texto del brief al vocabulario de `catalogo_skills` (p. ej. "orquestación de contenedores" → Kubernetes, EKS, AKS, GKE). Después el matching es SQL exacto.
- Los requisitos implícitos de sector se comprueban con `sectores_proyectos` (p. ej. banca), aunque el `sector_principal` sea otro: eso es el **talento oculto**.

## 4. Reglas no negociables
1. **El LLM no** decide disponibilidad, **no** calcula scores finales ni importes y **no** inventa experiencia. Solo interpreta el brief y redacta explicaciones a partir de evidencia recuperada.
2. **Filtros duros en código o SQL:** disponibilidad, años mínimos (`anios_experiencia`) y requisitos realmente obligatorios. Un requisito "deseable" o "no imprescindible" **nunca** filtra.
3. **Nunca se envía todo el universo al LLM.** Primero se reduce con SQL a un top-N y solo eso llega al modelo.
4. **Trazabilidad:** cada fortaleza o gap apunta a su origen (skill con nivel y años, proyecto concreto, puesto, certificación). Si el LLM cita un proyecto, se **valida** que existe en el perfil antes de mostrarlo.
5. **Los obligatorios incumplidos** se muestran como bloqueo o gap, no se esconden en una media.
6. **Escenarios:** el dataset **no** trae salarios, tarifas ni plazos. Todo valor económico es un **supuesto editable**, etiquetado como "supuesto ilustrativo". La UI separa *dato observado*, *supuesto* y *resultado calculado*.
7. **Secretos** (clave del LLM, `DATABASE_URL`) solo en secretos de Supabase o en el entorno local. **Nunca** en el código del navegador ni en el repo. Las tablas del dataset no se escriben desde el navegador (RLS solo lectura).
8. **Honestidad:** si algo de la demo está simulado o hardcodeado, se dice.
9. **No tocar `legacy/`** ni construir sobre `teamBuilder.ts` (su búsqueda exhaustiva de combinaciones no escala).

## 5. Contratos de las edge functions (por hacer)
Ubicación: `supabase/functions/<nombre>/index.ts` (Deno). CORS como en `legacy/skillsonar/supabase/extract/index.ts`, que sirve de base para llamar al LLM a través del AI Gateway de Lovable (`LOVABLE_API_KEY`) o de `AI_GATEWAY_URL` + `AI_API_KEY`.

### `interpret-project` (módulo A, rol 2)
- **In:** `{ project_description, project_start_date?, constraints? }`
- **Out:** JSON con la forma de §6.1 del brief:
  - `role`, `seniority`, `mandatory_skills[{name,min_level}]`, `desirable_skills[{name}]`, `sector_experience[]`, `languages[{name,level}]`, `certifications[]`;
  - `availability.acceptable[]`, `min_years_experience`, `client_facing`.
- **Nombres:** skills **solo** del `catalogo_skills`; sectores **solo** de los 10 del dataset; idiomas con los nombres del dataset (`Inglés`, `B2`…). Se descarta lo que no exista. No inferir fechas, niveles ni certificaciones que no estén en el brief.
- **Guardar** en `project_requirements` tras la edición humana, con `interpretation_raw`.

### `match-candidates` (módulo B, rol 2)
- **Pipeline:**
  1. filtros duros en SQL;
  2. candidatos por `empleado_skills.skill = any(...)`;
  3. enriquecer con proyectos y experiencia;
  4. score determinista;
  5. el LLM redacta fortalezas, gaps y explicación **solo** con la evidencia recuperada;
  6. top-N con desglose.
- **Pesos iniciales** (configurables, no oficiales): skills 40 · nivel 20 · años de uso 10 · proyectos/sector 15 · seniority 5 · idiomas/otros 10. Usa `demostrada` para distinguir evidencia en proyecto de skill solo declarada.
- **Riesgos por candidato** (lo pide NTT DATA): nivel y años que no cuadran, Roll-off, skill solo declarada, último uso antiguo (`ultimo_anio`), sector distinto, idioma, modalidad o movilidad.
- **Extra de NTT DATA:** una lista por rol sin repetir persona entre roles y respetando la disponibilidad.

### `calculate-staffing-scenarios` (módulo C, rol 3)
- **In:** requisitos + shortlist (con cobertura y disponibilidad) + `scenario_assumptions`.
- **Out:** por escenario, coste, tiempo hasta incorporación, cobertura, disponibilidad, riesgo y score. También el ganador y **por qué**.
- **Fórmula:** `Score = w1·Cost + w2·Time + w3·Coverage + w4·Availability − w5·Risk`, normalizada. **Código determinista y testeable, sin LLM.** Pesos visibles en la UI.

## 6. Reparto (brief §10, sin el rol de ElevenLabs)
| Rol | Responsabilidad | Punto de partida en el repo |
|---|---|---|
| 1. Data Engineering | Datos en Supabase y validación | ✅ Hecho: `001`, `002`, `load_profiles.py`, `docs/DATA.md` |
| 2. AI Matching / Backend | `interpret-project`, `match-candidates` | §3 y §5 de este archivo, `buscar_personas` como referencia de SQL |
| 3. Scenario Intelligence | `calculate-staffing-scenarios` | `scenario_assumptions` (002), §5 |
| 4. Lovable / Integración | Las 3 pantallas + fichas de persona | `prompts/lovable.md` |

## 7. Cómo ejecutar
```powershell
# Entorno local (una vez): .venv con duckdb y psycopg ya está creado; si no:
python -m venv .venv; .\.venv\Scripts\pip install duckdb "psycopg[binary]"
# Cargar Supabase (Session pooler IPv4; la conexión directa es solo IPv6). Aplica 001 + 002 y carga los disponibles:
$env:DATABASE_URL = "postgresql://postgres.<ref>:<PASSWORD>@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
.\.venv\Scripts\python -X utf8 scripts\load_profiles.py --schema --solo-disponibles
# Postgres local para pruebas:
docker run -d --name skillsonar-pg -e POSTGRES_PASSWORD=localtest -p 55432:5432 postgres:17
```
Volver a cargar vacía las tablas del dataset. `project_requirements` y `scenario_assumptions` no se tocan.

## 8. Convenciones
- UI y textos en **español**. El código y los nombres de las tablas de la app, en inglés. Las tablas del dataset mantienen los nombres en español del Parquet.
- Las migraciones nuevas van como `supabase/migrations/00N_*.sql`, idempotentes (`if not exists`, `drop policy if exists`). No se editan migraciones ya aplicadas en Supabase: se añade una nueva.
- La lógica determinista compartida (score, escenarios) va en módulos puros y testeables. No va mezclada con la llamada al LLM.
- Antes de afirmar una cifra en el pitch, se calcula sobre los datos (SQL o DuckDB sobre el Parquet). No se estima a ojo.

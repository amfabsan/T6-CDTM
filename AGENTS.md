# AGENTS.md · ORBIT AI (T6 · CDTM × UPV-UV Hackathon · caso NTT DATA)

> Guía para cualquier asistente de IA (Claude Code, Cursor, Codex, Lovable…) que trabaje en este repo. **Léela entera antes de tocar nada.**
> Fuente de verdad del producto: [`docs/IDEA.md`](docs/IDEA.md) (original en `docs/ORBIT_AI_Brief_Tecnico_MVP.docx`), con los cambios de la §1. Matching y equipos: [`docs/WORKFLOW_MATCHING.md`](docs/WORKFLOW_MATCHING.md) y [`docs/ORBIT_AI_Rankings_y_Filtros.pdf`](docs/ORBIT_AI_Rankings_y_Filtros.pdf). Reglas del caso: [`case/caso.pdf`](case/caso.pdf). Datos: [`docs/DATA.md`](docs/DATA.md).
> **Si este archivo y el brief chocan en nombres de tablas o columnas, manda este archivo:** describe lo que está realmente creado y cargado en Supabase.

## 1. Qué es ORBIT AI
*Find the talent. Validate the fit. Make the staffing decision.*

Un manager de NTT DATA describe una necesidad de proyecto en lenguaje natural. ORBIT:
1. la convierte en requisitos estructurados y editables;
2. encuentra talento interno aunque su experiencia esté descrita con otro vocabulario;
3. explica el ranking por rol con evidencia (nivel, años de uso, proyectos y certificaciones que ya están en la base de datos);
4. propone el Top 5 de equipos (encaje, coste, inicio y continuidad ante una baja);
5. compara escenarios Internal / External / Hybrid.

El manager puede manejar por voz los rankings y los equipos con un asistente de **ElevenLabs**.

> **Cambios respecto al brief (`docs/IDEA.md`):**
> - **La entrevista de voz a candidatos (Talent Assessment) está descartada.** El nivel de experiencia ya está en la base de datos (`empleado_skills.nivel`, `anios`, `demostrada`, `ultimo_anio`). No añadáis entrevistas, transcripciones ni rúbricas.
> - **ElevenLabs se usa para otra cosa:** un **asistente de voz** con el que el manager filtra el ranking de perfiles y ordena y explica el Top 5 de equipos, como especifica el PDF de rankings. Mueve los controles de la UI con *client tools* y solo repite datos que ya calculó el backend. Ver [`prompts/elevenlabs.md`](prompts/elevenlabs.md).
> - **Se adopta [`docs/WORKFLOW_MATCHING.md`](docs/WORKFLOW_MATCHING.md):** requisitos por rol, búsqueda híbrida, score 35/20/15/10/10/5/5 y equipos.

**Principio:** la IA interpreta y explica; las reglas deterministas filtran, puntúan y calculan. La decisión final siempre es humana.

| Módulo | Pantalla | Backend |
|---|---|---|
| A. Necesidad | Textarea + requisitos **por rol** editables (MUST / NICE, nº de plazas) | `interpret-project` |
| B. Talento | Ranking por rol con encaje %, desglose, evidencia, huecos y riesgos; controles Top 3/5/10 y encaje mínimo; comparar candidatos | `match-candidates` (`roles[]`) |
| C. Equipos | Top 5 de equipos ordenable y filtrable por encaje, coste, inicio y continuidad tras una baja | `match-candidates` (`teams[]`) |
| D. Decisión | Internal / External / Hybrid con supuestos editables | `calculate-staffing-scenarios` |
| Voz (B y C) | Asistente ElevenLabs que maneja los controles de B y C y explica equipos | `elevenlabs-signed-url` + *client tools* en la UI |

## 2. Estado del repo

| Ruta | Estado | Qué es |
|---|---|---|
| `supabase/migrations/001_schema.sql` | ✅ hecho, cargado | Tablas del **dataset** (solo lectura) + RPC `perfil` y `buscar_personas` |
| `supabase/migrations/002_orbit_app.sql` | ✅ hecho, probado en local | Tablas de la **app**: `project_requirements`, `scenario_assumptions` |
| `supabase/migrations/003_busqueda.sql` | ✅ hecho, probado en local (pgvector) | Pasos 5-6: pgvector, `perfil_busqueda`, embeddings de skills/roles, filtros duros, búsqueda híbrida con RRF y `vocabulario_orbit` |
| `supabase/migrations/004_filtros_minimos.sql` | ✅ probado en local, **pendiente de aplicar en Supabase** | `filtrar_candidatos` solo excluye `Asignado` y el país si es exigido (el resto lo puntúa `matching/`); RPC `perfiles(ids)` |
| `matching/` (+ `matching/api.py`) | ✅ hecho, 24 tests | Pasos 7-10 en Python y servicio HTTP `match-candidates` (FastAPI): `POST /match {project_id}` |
| `scripts/build_embeddings.py` | ✅ hecho | Embeddings locales (MiniLM multilingüe, 384 dim) de skills, roles y perfiles. Se ejecuta tras cada carga |
| `supabase/functions/interpret-project/` + `_shared/interpret.ts` | ✅ hecho, probado con Gemini (sin desplegar) | Pasos 1-3: PDF o texto → Gemini con vocabulario cerrado → validación. Tests: `_shared/interpret.test.ts` |
| `scripts/load_profiles.py` | ✅ hecho | Carga Parquet → Postgres y aplica todas las migraciones |
| `scripts/make_sample.py` | ✅ hecho | Regenera `data/sample/` (muestra JSON/CSV y vocabulario) desde el Parquet |
| `data/profiles.parquet` | ✅ | Dataset original: 190.000 perfiles sintéticos |
| `data/sample/profiles_sample.json` / `.csv` | ✅ | 42 perfiles elegidos a propósito, para leer y para pruebas |
| `data/sample/vocabulario.json` | ✅ | 614 skills, roles por área, sectores, certificaciones: **vocabulario para el LLM** |
| `docs/DATA.md` | ✅ | Estructura del dataset, hallazgos y cifras |
| `docs/ORBIT_AI_Rankings_y_Filtros.md` | ✅ | Especificación de ranking de perfiles y Top 5 de equipos (texto del PDF) |
| `docs/ORBIT_AI_Caso_Demo_Pitch.md` | ✅ | Caso de demo (core bancario a Azure): briefing, resultados esperados y fixture de pruebas |
| `docs/WORKFLOW_MATCHING.md` | ✅ adoptado (código pendiente de PR) | Workflow de matching: filtros duros, búsqueda híbrida (pgvector + RRF), score y equipos |
| `docs/ORBIT_AI_Rankings_y_Filtros.pdf` | ✅ | Especificación de los controles de ranking, el Top 5 de equipos y la continuidad |
| `docs/ITERATIONS.md`, `docs/PATTERNS.md` | ✅ | Cuaderno de Improven e investigación de ediciones anteriores |
| `prompts/lovable.md` | ✅ | Prompts para construir las pantallas en Lovable (incluido el asistente de voz) |
| `prompts/elevenlabs.md` | ✅ | Configuración del asistente de voz: prompt, client tools y guion de demo |
| `supabase/functions/*` (resto) | ⏳ **por hacer** | `match-candidates` (score y equipos sobre `candidatos_proyecto`), `calculate-staffing-scenarios`, `elevenlabs-signed-url` |
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
- `vocabulario_orbit()` (003) devuelve el vocabulario cerrado: skills, roles, sectores, certificaciones, idiomas, países, ciudades, niveles, seniorities y modalidades.
- `filtrar_candidatos(...)` es el **paso 5**. **Desde 004 solo excluye `Asignado` y, si `p_pais_exigido`, el país**; los demás parámetros se aceptan pero se ignoran (años, seniority, idiomas, certificaciones y ubicación pasan a gaps/riesgos en `matching/`). Versión de 003, ya sustituida: filtros duros por rol. Disponibilidad, años, seniority mínimo, idiomas con nivel mínimo, certificaciones obligatorias (todas) y alternativas (`p_certificaciones_alguna`, basta una), y ubicación según la modalidad: presencial → misma ciudad, mismo país o movilidad internacional; híbrido → mismo país; remoto → el país solo si es exigido. **Las skills no filtran.** Verificado contra DuckDB en 13 casos.
- `buscar_candidatos(...)` (003) es el **paso 6**: entre los filtrados, full-text (`perfil_busqueda.tsv`, `ts_rank_cd`) + coseno con el vector medio de las skills y roles pedidos (obligatorias ×2), fusionados con RRF (k=20). Devuelve hasta 200 con `rrf`, `pos_texto`, `pos_vector` y `n_filtrados`.
- `candidatos_proyecto(p_project_id, p_limit)` (003) aplica los pasos 5+6 a cada rol de `project_requirements.roles` y devuelve `[{role_index, title, count, n_filtrados, candidates}]`. Es la entrada de `match-candidates`.

### Tablas de la app (002, se leen y se insertan desde la app)
- `project_requirements`: salida de `interpret-project` revisada por el manager. Los requisitos **por rol** van en `roles` (jsonb), junto con `country`, `city`, `modality`, `country_required`, `client_sector`, `project_start_date` y `start_deadline_day` (003 añade también `source_text` y `validation_review`). Guarda también `interpretation_raw`, la salida del LLM sin editar. Las columnas de un solo rol (`role`, `required_skills`…) son opcionales.
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
7. **Secretos** (`GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `DATABASE_URL`) solo en secretos de Supabase o en el entorno local. **Nunca** en el código del navegador ni en el repo. Las tablas del dataset no se escriben desde el navegador (RLS solo lectura).
8. **Honestidad:** si algo de la demo está simulado o hardcodeado, se dice.
9. **No tocar `legacy/`** ni construir sobre `teamBuilder.ts` (su búsqueda exhaustiva de combinaciones no escala).

## 5. Contratos de las edge functions (por hacer)
Ubicación: `supabase/functions/<nombre>/index.ts` (Deno). CORS como en `legacy/skillsonar/supabase/extract/index.ts`, que sirve de base para llamar al LLM a través del AI Gateway de Lovable (`LOVABLE_API_KEY`) o de `AI_GATEWAY_URL` + `AI_API_KEY`.

### `interpret-project` (módulo A, rol 2) · ✅ hecho
Código: `supabase/functions/interpret-project/index.ts` (HTTP, PDF y vocabulario) + `_shared/interpret.ts` (prompt, esquema, Gemini y validación, sin APIs de Deno).
- **In:** `multipart/form-data` con `file` (el PDF del plan) o `project_text`, o JSON `{ "project_text": "..." }`.
  - Si el PDF no tiene texto (escaneado), responde **422** con `{ error: "pdf_sin_texto" }` y la UI pide pegarlo a mano.
- **LLM:** Gemini con `responseSchema` y temperatura 0. Recibe el vocabulario de `vocabulario_orbit()`.
  - Modelo: `GEMINI_MODEL` o, si no está, `gemini-flash-latest`.
  - Si un modelo da 429/5xx o no responde, reintenta y pasa a los de respaldo (`GEMINI_FALLBACK_MODELS`). Presupuesto total: 120 s.
- **Validación (código):** quita todo lo que no existe en el vocabulario y lo apunta en `review[]`, con `path`, `value`, `reason` y `action` (eliminado / corregido / revisar).
  - Corrige solo mayúsculas, tildes y traducciones directas ("English" → "Inglés", "Spain" → "España").
  - No inventa nada: lo que el plan no dice queda en `null` o `[]`.
- **Out:** `{ source, source_text, interpretation_raw, requirements, review, row_template }`.
  - `requirements.project`: `project_name`, `client_sector`, `country`, `city`, `modality` (remoto | hibrido | presencial), `country_required`, `start_date`.
  - `requirements.roles[]`: `title`, `count`, `matching_roles[]` (de los 87), `seniority_min`, `min_years_experience`, `mandatory_skills[{name,min_level}]`, `desirable_skills[{name}]`, `languages[{name,level}]`, `certifications[]` (todas) y `certification_options[]` (basta una).
- **Paso 4 (UI):** el manager edita `requirements` e inserta en `project_requirements`. `row_template` ya trae las columnas, con `interpretation_raw` y `validation_review`.
- **Probado:** con un plan real (banco, 4 personas, remoto España exigido) tarda unos 10 s. Traduce "orquestación de contenedores" → Kubernetes y separa obligatorias de deseables.

### `match-candidates` (módulos B y C, rol 2)
Pipeline completo en [`docs/WORKFLOW_MATCHING.md`](docs/WORKFLOW_MATCHING.md):
1. ✅ filtros duros en SQL (`filtrar_candidatos`, ver §3; **las skills nunca filtran**);
2. ✅ búsqueda híbrida, full-text + pgvector con RRF, top 200 por rol: `supabase.rpc('candidatos_proyecto', { p_project_id })`;
3. score determinista en **Python** (`matching/`, solo stdlib): `run_matching(requirements, candidates_from_rpc(candidatos_proyecto, perfiles))`; elegible = no Asignado, score > 0 y al menos una skill pedida; el resto de requisitos son gaps;
4. equipos (`matching/teams.py`): todas las combinaciones válidas (beam search si hay más de 20.000), encaje, coste, inicio, continuidad y Top 5 por 4 órdenes; nadie repetido dentro de un equipo. Tests: `python -m unittest discover -s matching/tests -t .`;
5. el LLM redacta fortalezas y huecos **solo** con `evidence`, `gaps` y `risks`.

**Score:**
- **Pesos:** skills obligatorias 35 · evidencia demostrada 20 · sector y rol 15 · seniority y años 10 · deseables 10 · idiomas y certificaciones 5 · recencia 5.
- **Confianza por skill:** demostrada en ≥2 proyectos 1; demostrada 0,85; solo declarada 0,6.
- **Penalización:** ×0,7 si nivel y años no cuadran.

**Out**, la usan la pantalla y el asistente de voz:
```jsonc
{
  "project_id": "uuid",
  "roles": [{
    "role": "Cloud Architect", "count": 1,
    "candidates": [{
      "employee_id": "NTT…", "nombre": "…", "disponibilidad": "En banca", "fit": 87,
      "breakdown": { "obligatorias": 30, "evidencia": 18, "sector_rol": 12, "seniority": 9, "deseables": 7, "idiomas_cert": 5, "recencia": 4 },
      "strengths": [{ "text": "…", "evidence": { "type": "project", "ref": "Migración a la nube de core bancario (2024)" } }],
      "gaps": ["Terraform (obligatoria)"],
      "risks": ["Roll-off: inicio por confirmar"],
      "outside_area": true
    }]
  }],
  "teams": [{
    "team_id": "A", "members": [{ "role": "…", "employee_id": "…", "nombre": "…", "fit": 90 }],
    "fit": 92,
    "cost": 4200,                                   // null = "Por estimar" (faltan supuestos de tarifa)
    "start": { "day": 4, "status": "confirmado" },  // status "por_confirmar" si hay alguien en Roll-off
    "continuity": 67,                               // peor caso: roles cubiertos / roles obligatorios × 100
    "worst_dropout": { "employee_id": "…", "role": "…", "covered_roles": 2, "total_roles": 3, "substitute": null },
    "dropouts": [ /* un elemento por integrante, con la misma forma que worst_dropout */ ]
  }]
}
```
**Reglas de los equipos** (PDF de rankings):
- **Coste** = supuesto €/día (`scenario_assumptions`) × días planificados por persona.
- **Inicio:** "En banca" = día 0; "Roll-off" = `por_confirmar`, una ventana sin fecha.
- **Continuidad:** se retira a cada integrante por turno y se busca sustituto en el pool del mismo rol.
- **En la UI:** filtrar y ordenar los 15 equipos y mostrar hasta 5.

### `calculate-staffing-scenarios` (módulo D, rol 3)
- **In:** `{ project_id, team_id, assumptions }`: requisitos + equipo elegido (con cobertura y disponibilidad) + `scenario_assumptions`.
- **Out:** por escenario, coste, tiempo hasta incorporación, cobertura, disponibilidad, riesgo y score. También el ganador y **por qué**.
- **Fórmula:** `Score = w1·Cost + w2·Time + w3·Coverage + w4·Availability − w5·Risk`, normalizada. **Código determinista y testeable, sin LLM.** Pesos visibles en la UI.

### `elevenlabs-signed-url` (asistente de voz, rol 5)
- **In:** nada; lo llama la app al pulsar el micrófono.
- **Out:** `{ signed_url }`. Hace `GET https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=<ELEVENLABS_AGENT_ID>` con la cabecera `xi-api-key: <ELEVENLABS_API_KEY>`.
- La clave nunca llega al navegador. Las *client tools* se definen en la UI (`prompts/lovable.md` paso 6) y en el panel del agente, con los mismos nombres (`prompts/elevenlabs.md`).

## 6. Reparto (brief §10, adaptado)
| Rol | Responsabilidad | Punto de partida en el repo |
|---|---|---|
| 1. Data Engineering | Datos en Supabase y validación | ✅ Hecho: `001`, `002`, `load_profiles.py`, `docs/DATA.md` |
| 2. AI Matching / Backend | `interpret-project`, `match-candidates` (ranking por rol + equipos) | §3 y §5, `docs/WORKFLOW_MATCHING.md`, PDF de rankings |
| 3. Scenario Intelligence | `calculate-staffing-scenarios` | `scenario_assumptions` (002), §5 |
| 4. Lovable / Integración | Las 4 pantallas + fichas de persona | `prompts/lovable.md` |
| 5. ElevenLabs | Asistente de voz de rankings y equipos + `elevenlabs-signed-url` | `prompts/elevenlabs.md`, `prompts/lovable.md` paso 6 |

## 7. Cómo ejecutar
```powershell
# Entorno local (una vez): .venv con duckdb y psycopg ya está creado; si no:
python -m venv .venv; .\.venv\Scripts\pip install duckdb "psycopg[binary]"
# Cargar Supabase (Session pooler IPv4; la conexión directa es solo IPv6). Aplica 001 + 002 y carga los disponibles:
$env:DATABASE_URL = "postgresql://postgres.<ref>:<PASSWORD>@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
.\.venv\Scripts\python -X utf8 scripts\load_profiles.py --schema --solo-disponibles
# Embeddings de la búsqueda híbrida (modelo local, sin API; ~10 min la primera vez). Repetir tras cada carga:
.\.venv\Scripts\pip install fastembed
.\.venv\Scripts\python -X utf8 scripts\build_embeddings.py
# Edge function interpret-project (Supabase CLI): secreto y despliegue
supabase secrets set GEMINI_API_KEY=<clave>     # opcional: GEMINI_MODEL=gemini-flash-latest
supabase functions deploy interpret-project
# Servicio match-candidates (pasos 7-10, Python). Claves solo en el entorno, nunca en el repo:
.\.venv\Scripts\pip install -r matching\requirements.txt
$env:SUPABASE_URL = "https://<ref>.supabase.co"; $env:SUPABASE_KEY = "<clave>"
.\.venv\Scripts\uvicorn matching.api:app --port 8000
.\.venv\Scripts\python -m unittest discover -s matching/tests -t .
# Tests de la validación del LLM (Node 22+):
node --test --experimental-strip-types supabase/functions/_shared/interpret.test.ts
# Postgres local con pgvector para pruebas:
docker run -d --name orbit-pgvector -e POSTGRES_PASSWORD=localtest -p 55433:5432 pgvector/pgvector:pg17
```
Volver a cargar vacía las tablas del dataset. `project_requirements` y `scenario_assumptions` no se tocan.

## 8. Convenciones
- UI y textos en **español**. El código y los nombres de las tablas de la app, en inglés. Las tablas del dataset mantienen los nombres en español del Parquet.
- Las migraciones nuevas van como `supabase/migrations/00N_*.sql`, idempotentes (`if not exists`, `drop policy if exists`). No se editan migraciones ya aplicadas en Supabase: se añade una nueva.
- La lógica determinista compartida (score, escenarios) va en módulos puros y testeables. No va mezclada con la llamada al LLM.
- Antes de afirmar una cifra en el pitch, se calcula sobre los datos (SQL o DuckDB sobre el Parquet). No se estima a ojo.

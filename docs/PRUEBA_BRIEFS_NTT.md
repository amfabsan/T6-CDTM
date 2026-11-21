# Prueba de punta a punta con los 3 briefs de NTT DATA (21-11-2026, 14:30-15:00)

**Qué se probó:**
- **Paso 2:** `callGemini` + `validateInterpretation`, el código real con Gemini.
- **Pasos 5-10:** `matching/` real sobre los **34.003 disponibles** del Parquet.
- **Paso 11:** `explainWithGemini`, el código real con Gemini.

**Aproximado:** el **paso 6**. La búsqueda híbrida con embeddings y RRF vive en Supabase, así que aquí se ordena por coincidencia con las skills y roles pedidos y se cogen 200 por rol. **Simulado:** los textos de los briefs. Los originales están en la carpeta de SharePoint de NTT DATA, no en el repo, y se han **reconstruido** a partir de la descripción de `case/caso.pdf` §4 (ver `scripts/e2e/briefs.json`).

Cómo repetirla (desde la raíz, con `GEMINI_API_KEY` o `GEMINI_API_KEY_EXPLAIN` en `.env`):
```bash
python -m venv .venv && .venv/bin/pip install -r matching/requirements.txt pyarrow
O=/tmp/e2e && mkdir -p $O
.venv/bin/python scripts/e2e/build_vocab.py $O/vocab.json
GEMINI_MODEL=gemini-3.6-flash node --env-file=.env --experimental-strip-types scripts/e2e/interpret.ts $O/vocab.json $O
.venv/bin/python scripts/e2e/run_matching.py $O && .venv/bin/python scripts/e2e/check.py $O
for b in core_banking retail_ia ciberseguridad_publico; do node --env-file=.env --experimental-strip-types scripts/try_explain.ts $O/match_$b.json; done
```

## Resultado por brief

| Brief (qué prueba según NTT) | Resultado | Veredicto |
|---|---|---|
| **Core banking a cloud** (multi-rol, implícito de banca) | 3 roles y 4 plazas (arquitecto cloud ×1, backend Java ×2, DBA Oracle ×1); 4.500 equipos válidos; **nadie repetido dentro de un equipo**. Sector del cliente detectado: «Banca y Finanzas». **15 de 15** del Top 5 por rol tienen proyectos de banca | ✅ Cumple. ⚠️ «Terraform» (deseable del proyecto) se copió como deseable en los 3 roles |
| **Asistente IA retail** (obligatorio frente a deseable) | Python, LLMs, RAG y Azure OpenAI como **obligatorias**; LangChain como deseable; retail como sector **deseable** (`sector_required: false`). **0 excluidos por retail** y **3 de 5** del Top 5 sin proyectos de retail | ✅ Cumple: lo «no imprescindible» no filtra |
| **Ciberseguridad sector público** (filtros duros: disponibilidad inmediata y ≥ 3 años) | Detecta `min_years = 3`. Pero de los 514 disponibles con SIEM, los filtros por defecto dejan pasar a los 514: **102 con < 3 años** y **291 en Roll-off**. En el Top 5, **2 personas en Roll-off**, que entran en los equipos propuestos | ❌ **No cumple la regla de NTT**: «Immediate availability and a minimum of 3 years… can't be skipped» |

**Paso 11 (explicación) en los 3:** entre 4 y 7 s, todas las personas y todos los equipos explicados por el LLM (17 personas y 15 equipos) y **0 frases descartadas**. Ejemplo (core banking): *«Joe Whitehead aporta su alta experiencia en Azure y Kubernetes demostrada en «Automatización de banca móvil (2025)».»*

## Problemas encontrados (por prioridad)

1. **❌ Ciberseguridad: los filtros duros no se aplican.** `DEFAULT_STRICT = ("disponibilidad",)` solo excluye «Asignado»; los años mínimos restan puntos pero no excluyen, y no hay forma de pedir «solo En banca».
   - **Propuesta:** que el paso 2 marque cuándo el plan exige disponibilidad inmediata y años «no negociables», y que `run_matching` reciba entonces `strict=("disponibilidad", "min_years")` más un filtro «solo En banca».
   - **Por qué es urgente:** es exactamente lo que el jurado de NTT va a probar.
2. **⚠️ Paso 2 lento para la demo en directo:** 82-103 s por brief. La cadena por defecto (`gemini-flash-latest` → `gemini-3.8-flash` → …) incluye `3.8-flash`, que hoy no responde en 40 s; con ella, el segundo brief **falló por timeout**.
   - **Propuesta:** dejar el brief de la demo pre-interpretado (guardado en `project_requirements`) y quitar `3.8-flash` de la cadena.
3. **⚠️ Certificación deseable tratada como obligatoria:** «Deseable: CISSP o CEH» acabó en `certification_options`, que significa «basta una, obligatoria» y genera un gap. No hay campo de certificaciones deseables.
4. **⚠️ Requisitos que se pierden sin aviso:**
   - «Gestión de vulnerabilidades» no existe en las 614 skills (la más cercana es «Pentesting») y desapareció sin nota en `review[]`;
   - «CEH» no está entre las 100 certificaciones.
   - **Propuesta:** que el paso 2 apunte en `review` lo que no pudo mapear.
5. **Menor (paso 11):** en ciberseguridad escribió «coste por estimar de 19.200 €» porque no recibe el estado del coste («supuesto»).
   - **Propuesta:** pasar `cost.status` al prompt.

# Cuaderno de iteraciones (reto Improven)

> Formato del brief oficial de Improven. Esta página es el espejo en el repo del cuaderno de Notion o papel.
> Rúbrica (1–5 por criterio, media ponderada): problema y usuario 20 % · propuesta de valor 15 % · MVP mínimo pero completo 20 % · **evolución iterativa 20 %** · **aprendizaje y decisiones 15 %** · equipo 10 %. Desempata la evolución y después el aprendizaje.
> **No puntúa:** la jerga ágil, el número de funciones, el pulido técnico o visual por sí solo ni acertar a la primera. Cambiar con buenos motivos suma.
> **Ayuda:** IAgile Nomad (asistente de Improven), https://agilenomad.net/experiencia-inmersiva.html

## Kick-off (30 min)

**Frase de valor:**
Para [managers y equipos de staffing de NTT DATA] que [tienen que cubrir posiciones y acaban contratando fuera porque no encuentran el talento interno], ORBIT AI es [un asistente de staffing intelligence] que [encuentra talento interno aunque esté descrito con otra jerga, lo valida con la evidencia de su perfil (nivel, años, proyectos) y compara cubrir dentro, fuera o en híbrido]. A diferencia de [buscar por palabras clave en CVs o Excel], [explica cada recomendación con su evidencia y deja la decisión al manager].
*(Ajustar al briefing real.)*

**La apuesta con más riesgo** (probarla en la vuelta 1):
Creemos que [el responsable de staffing no ve qué requisitos quedan sin cubrir hasta que es tarde]. Lo sabremos si [al menos 2 de 3 personas a las que enseñemos el boceto dicen que les pasa o entienden el valor de la matriz de cobertura].

**Ahora / Después**
*Prueba para decidir: «Si lo quitamos, ¿el usuario puede seguir resolviendo su problema?» Si la respuesta es sí, va a Después.*

| Ahora | Después (roadmap del pitch) |
|---|---|
| Necesidad → requisitos MUST/NICE editables · talento con score, evidencia, gaps y riesgos · comparar candidatos | Integración con HRIS/ATS · embeddings a escala · optimización multi-proyecto |
| Escenarios Internal / External / Hybrid con supuestos editables | Panel de impacto · auditoría de sesgos y gobernanza |

## Ciclo de cada vuelta
1. **Pensar** (10 min): una frase con lo que queremos conseguir o aprender.
2. **Construir:** lo mínimo para enseñarlo.
3. **Enseñar** (10–15 min): a 2–3 personas externas al equipo, sin explicar demasiado.
4. **Decidir** (5 min): qué mantenemos, qué cambiamos y qué quitamos, y foto de la versión.

**Preguntas para los probadores:** ¿Qué entiendes que hace esto y para quién es? · ¿Qué ves raro, confuso o que sobra? · ¿Te ayuda a decidir? ¿Qué echarías en falta? · ¿Qué cambiarías o quitarías primero?

## Cuaderno

| Vuelta | Qué queríamos conseguir o aprender | Qué construimos | Qué nos dijo la gente | Qué decidimos | Foto |
|---|---|---|---|---|---|
| 0 · Leer el reto (hasta 10:30) | ¿Qué problema tiene NTT DATA de verdad? Partíamos de la hipótesis de que había que **reunir** datos (scraper) y de un producto previo, SkillSonar (entrevista de voz al empleado) | Lectura del caso y de los datos: 190.000 perfiles sintéticos. `docs/DATA.md` con el análisis: vocabulario cerrado de 614 skills, solo el 18 % disponible, 20.065 perfiles con proyectos de banca fuera de su sector | _(rellenar: mentor de NTT DATA — ¿el dolor es encontrar o actualizar perfiles?)_ | ❌ **Scraper descartado:** los datos ya los da NTT y scrapear personas reales choca con la privacidad. 🔄 El problema no es *tener* datos, sino **encontrar** a la persona aunque esté descrita con otra jerga | #0 |
| 1 · El concepto (10:30–12:20) | ¿Qué producto resuelve el caso y no solo la parte de voz? | Brief técnico de **ORBIT AI** (`docs/IDEA.md`) y workflow de matching en 11 pasos: filtros duros, búsqueda híbrida, score y equipos (PR #2, #3) | _(rellenar)_ | ❌ **Entrevista de voz al empleado descartada:** el nivel ya está en los datos (`nivel`, `anios`, `demostrada`). ❌ **ElevenLabs fuera del MVP.** ✅ Se adopta ORBIT: *find the talent, validate the fit, make the staffing decision* | #1 |
| 2 · El MVP (12:20–14:10) | ¿Funciona el flujo completo con datos reales? | Paso 2 (PDF → requisitos con Gemini), pasos 7-10 (score, ranking, equipos en Python), **paso 11** (explicación con Gemini validada contra la evidencia) y servicio `/match` (PR #5, #6, #8) | _(rellenar)_ | 🔄 **Filtros mínimos:** solo excluye «Asignado»; lo demás puntúa y aparece como gap, para que nadie desaparezca sin motivo (PR #7/#8). 🔄 **Coste en €/hora**, no €/día (PR #9). 🔄 **Los requisitos solo se usan si una persona los confirma** (006). 🐛 La primera prueba real del paso 11 **descartaba los 5 resúmenes de equipo** (el LLM ponía «31.200 €» entre comillas): corregido (PR #11, de 5 a 0 descartes) | #2 |
| 3 · Validar con los 3 briefs de NTT (14:30–15:00) | ¿Cumple las reglas que NTT dice que va a probar? | Prueba de punta a punta con los 3 briefs de prueba sobre los 34.003 disponibles (`docs/PRUEBA_BRIEFS_NTT.md`) | _(rellenar: enseñar el resultado de core banking a un mentor y anotar su reacción)_ | ✅ Core banking: multi-rol sin repetir persona y banca implícita detectada (15 de 15 con proyectos de banca). ✅ Retail: lo «no imprescindible» no filtra. ❌ **Ciberseguridad:** disponibilidad inmediata y ≥ 3 años no se aplican como filtro duro (2 personas en Roll-off en el Top 5) → **por corregir**. ⚠️ El paso 2 tarda 80-100 s → pre-interpretar el brief de la demo | #3 |

**Lo que falta para que el cuaderno puntúe en Improven:** la columna «Qué nos dijo la gente» con **personas de fuera del equipo** (mentor de NTT DATA, otro equipo, organización): quién, qué dijo y qué cambiamos por ello, más una foto por vuelta. Hasta ahora las decisiones salen de leer el caso y de pruebas propias, no de usuarios externos.

## Resumen de 1 minuto para la última visita del jurado (antes de los pitches)
1. **Problema y usuario:** el staffing manager de NTT DATA acaba contratando fuera a alguien que ya tiene dentro, porque lo busca por palabras clave en perfiles descritos con otra jerga.
2. **La evolución:** scraper → SkillSonar (voz) → ORBIT AI (encontrar, validar y decidir con evidencia) → MVP de punta a punta → validación con los 3 briefs de NTT, que destapó que los filtros duros de ciberseguridad no se aplicaban.
3. **Qué aprendimos:** _(rellenar con lo que digan las personas externas)_. De nuestras pruebas: hay que explicar **con evidencia** y validar lo que escribe el LLM (corregimos un fallo que descartaba todos los resúmenes); y no basta con filtros «blandos» cuando el cliente dice «no negociable».
4. **Qué dejamos fuera y por qué:** el scraper (datos ya disponibles y privacidad), la entrevista de voz (el nivel ya está en los datos), ElevenLabs (no aportaba a la decisión de staffing) y la integración con HRIS (roadmap).

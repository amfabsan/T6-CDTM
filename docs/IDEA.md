# T6 · CDTM Valencia Hacks 2026 · Caso NTT DATA

> **Caso:** *AI-Driven Talent & Organizational Intelligence*: emparejar el potencial de las personas con necesidades de negocio complejas a escala, usando datos organizativos propietarios que se entregan el sábado.
> Palabras clave del enunciado: **applied AI, data intelligence, recommendation engines, enterprise-grade product design**.

---

## 1. Lo que sabemos del evento

| Tema | Dato |
|---|---|
| Fecha y lugar | Sábado 21 nov 2026, The Terminal Hub (Valencia), 08:30–19:00 |
| Formato | 60 participantes, 12 equipos, 2 casos principales. Cada equipo hace uno (nosotros: NTT DATA) |
| Entrega | **16:45, cierre estricto**, en Polievalúa: pitch deck, repo de GitHub y vídeo de demo |
| Pitch | 17:00–18:15, 3 min de pitch y 2 min de preguntas. Premios 18:45 |
| Jurado anunciado | Juan Fuentes (EBAN/EIT), Iñigo de la Iglesia (Mission, inversión), Alejandro Vignoni (IDEAS UPV / StartUPV), Ana Moya y Julián Fernández (Buho AI). Perfil: inversión, emprendimiento, IA y operaciones |
| Sponsors | Sherpas, **NTT DATA**, Maisa, IDEAS UPV, **ElevenLabs**, Improven, Notion, **Lovable**, Red Bull, Mercadona IT, Cátedra HP, Finanz, Scientists360, The Terminal Hub |
| Herramientas | Créditos de **Lovable** (se canjean en el evento), 1 mes de **ElevenLabs Creator** (se canjea en el Discord de ElevenLabs con el email de inscripción, **antes del evento**) y plantilla de Notion |

**Premios**
- **Caso:** Finanz Premium 1 año, ElevenLabs Pro 3 meses por persona y formación de Scientists360.
- **Reto ElevenLabs** (Best Use): 3 meses del plan Scale por persona (~897 $). Rúbrica: integración y valor 50 %, creatividad 25 % y vídeo 25 %. Usarlo solo como locución del vídeo ya permite participar, pero **integrarlo en el producto puntúa mucho más**.
- **Reto Improven** (Best MVP Ideation): visita a sus oficinas y una plaza en su bootcamp. Rúbrica: problema y usuario 20 %, valor 15 %, enfoque del MVP 20 %, evolución entre iteraciones 20 %, aprendizaje 15 % y equipo 10 %. Requiere **≥3 iteraciones** probadas con personas externas al equipo y un cuaderno de iteraciones con fotos.

## 2. Lo que dicen las ediciones anteriores

- **VLC Hacks 2025 (1.ª edición):** retos de HP, NTT DATA, IBM y LeapingAI. El caso de NTT DATA consistía en **agilizar la respuesta a RFPs** en unas 6 h. El equipo del post de LinkedIn calificó Lovable de imprescindible para prototipar y ganó el premio "Leadership Under Pressure" de Scientists360. No se ha encontrado una lista pública de ganadores del caso.
- **CDTM Hacks Múnich 2025** (el evento madre) deja un patrón claro:
  - **1.º puesto global, N/avi**, y ganador del caso de salud, **MediMate**, con el lema *"Talk to an AI, not a clipboard"*. **Una entrevista conversacional por voz que sustituye un formulario** ganó el caso y dos retos técnicos.
  - **PeopleWorks** (feedback continuo entre compañeros) ganó *Best use of AI to improve processes*, y **Pledge** (selección con agentes) ganó *Most potential to earn real money*. Los productos de personas y RR. HH. puntúan bien cuando automatizan un proceso real.
- **Conclusión:** ganan los flujos completos que funcionan en directo, con una interacción memorable (la voz) y una métrica creíble. **No gana el dashboard más bonito.**
- Análisis completo de los 33 proyectos de Múnich 2025 en **[PATTERNS.md](PATTERNS.md)**. Resumen: 6 de los 9 ganadores citan Lovable en su stack. Es una señal real pero moderada, que sirve para decidir cómo trabajar y no para predecir la nota. Los 2 proyectos con ElevenLabs ganaron algo. **PeopleWorks** (un agente de voz que entrevista a compañeros sobre competencias) se parece mucho a nuestra idea, así que hay que diferenciarse: nosotros = **decisión de staffing**, no evaluación de personas.

---

## 3. La idea: **SkillSonar**

> **Frase de apertura del pitch:** *"Build a project team and see the evidence behind every recommendation."*
> **Frase para introducir la voz:** *"SkillSonar ayuda a encontrar talento interno para un proyecto y muestra qué experiencia respalda cada recomendación y qué falta por comprobar."*
>
> *"Para los responsables de staffing de una consultora que tienen que montar un equipo en días, SkillSonar es un apoyo a la decisión que **propone el equipo que cubre mejor los requisitos en conjunto**, incluido el talento que no aparece en el CV, **incluido el talento que no aparece en el CV**, y muestra con qué evidencia. A diferencia de buscar por palabras clave en perfiles desactualizados, SkillSonar descubre experiencia nueva con una nota de voz de 15 segundos y deja claro qué está verificado y qué no. **La decisión siempre es humana.**"*

### El problema (lo validamos con el mentor de NTT DATA)
1. **Perfiles muertos.** Nadie actualiza su CV interno ni su matriz de skills. Lo que alguien aprendió en su último proyecto no consta en ninguna parte.
2. **Staffing por contactos.** El manager asigna a quien conoce o a quien está libre, no a quien encaja mejor. Hay talento oculto en el *bench* y gente saturada.
3. **Decisiones opacas.** Cuando se responde a una RFP o arranca un proyecto, cuesta justificar por qué ese equipo y qué huecos de capacidad quedan.

### El producto: el centro es **«Proponer equipo»**

La diferencia con PeopleWorks (Múnich 2025, que ya demostró la captura por voz con citas) está en **lo que hace el responsable con la información**: montar un equipo para un proyecto concreto y comprobar qué requisitos cubre **en conjunto**. La voz es la forma de alimentar esa decisión, no el producto.

```
                 DECISIÓN (manager) — el núcleo
┌─────────────────────────────────────────────────────────────┐
│ 1. Necesidad: texto/RFP → requisitos obligatorios/deseables  │
│    + restricciones (disponible desde el lunes, ≥50 %)         │
│ 2. Candidatos con evidencia por requisito (🟢🟡⚪)              │
│ 3. PROPONER EQUIPO → equipo que cubre más obligatorios         │
│    en conjunto + matriz requisito × persona + huecos          │
│ 4. Comparar: "top-2 del ranking" vs "equipo complementario"   │
│ 5. Borrador editable → sección de equipo de la RFP o           │
│    solicitud de aprobación                                    │
└─────────────────────────────────────────────────────────────┘
        ▲  hueco: "falta evidencia de Azure"
        │
┌───────┴──────────────────────────┐
│ CAPTURA (empleado)               │
│ 🎙️ nota de voz 15 s → ElevenLabs  │
│ STT → propuesta → Ana confirma    │
│ → 🟡 autodeclarada                 │
└──────────────────────────────────┘
```

**Qué se exige a cada persona y qué al equipo:**
- **Por persona:** las restricciones individuales, como disponibilidad ≥50 % desde la fecha de inicio. Quien no las cumple no entra.
- **Por equipo:** los requisitos de capacidad (Azure, ciberseguridad, Java) se cubren **entre todos**. Así entran especialistas que se complementan, y se entiende por qué Sergio entra aunque Elena esté mejor situada en el ranking individual.

**Cómo se propone el equipo (determinista y explicable):**
1. Solo entran personas que cumplen las restricciones individuales.
2. Se elige primero a quien cubre **más obligatorios todavía sin cubrir**. 🟢 cuenta como cubierto y 🟡 como "cubierto, pendiente de verificar".
3. Se repite hasta cubrir todos los obligatorios o llegar al tamaño de equipo. Los empates se resuelven por deseables cubiertos.
4. El resultado se muestra con la **matriz requisito × persona** y los **huecos** en rojo. El manager puede cambiar a cualquier persona y la cobertura se recalcula al momento.

⚠️ **Elegir siempre a quien más cubre no garantiza el equipo más pequeño posible.** Por eso no decimos "equipo mínimo" salvo que esté comprobado. Con equipos de 2–3 personas y decenas de candidatos, probar todas las combinaciones es instantáneo, así que si da tiempo se hace en la app. Para la demo, [`scripts/verify_demo.js`](../scripts/verify_demo.js) prueba todas las parejas y confirma tres cosas:
- antes de la nota de voz, **ninguna pareja** cubre los 3 requisitos;
- después, **ninguna persona sola** los cubre;
- **Ana + Sergio es la única pareja** que los cubre.

**Demo (el guion):**
1. **Un proyecto con una restricción real:** son obligatorios **Azure, ciberseguridad y Java**, Python es deseable y se pide disponibilidad ≥50 % desde el lunes. *(Escenario ya cargado en `data/sample/`.)*
   - El perfil más completo (Carlos: Azure, Java, arquitecto senior) **solo está disponible al 20 %**.
   - Las dos primeras del ranking individual (Elena y Hugo, ambos con Azure y Python) se solapan y **solo cubren 1 de los 3 obligatorios**.
2. **Cambia la decisión con Ana:**
   - Aparece como «falta evidencia de Azure», porque su perfil dice "Java junior".
   - Graba 15 segundos contando que lideró una migración a Azure, revisa la propuesta y la confirma → «Azure · autodeclarada · pendiente de verificar».
   - La propuesta Ana + Sergio muestra **«2 requisitos verificados + Azure pendiente»**.
   - El responsable contrasta la cita con el histórico de proyectos, donde consta la migración a Azure de Ana, y la verifica → **«3 de 3 verificados»** 🟢. Si no hubiera histórico, el borrador se queda con Azure pendiente, y eso también es un resultado válido.
3. **Las dos propuestas, una al lado de la otra:**

   | | Azure | Ciberseguridad | Java |
   |---|---|---|---|
   | **Top-2 individual** (Ana + Elena) | ✅ | ❌ **vacía** | ✅ |
   | **Equipo propuesto** (Ana + Sergio) | ✅ (Ana, verificada) | ✅ (Sergio) | ✅ (Ana) |

   Se pulsa **«Proponer equipo»** y sale un **borrador editable** con quién cubre cada requisito, sus evidencias y los huecos pendientes. Puede convertirse en la sección de equipo de una RFP o en una solicitud de aprobación. Antes de la nota de voz, ninguna pareja cubría los 3 requisitos (comprobado con `scripts/verify_demo.js`).

**El momento del pitch:** *«Con las mismas dos plazas, pasamos de cubrir dos requisitos a cubrir los tres. Sergio aporta la competencia que faltaba.»*

**Tres estados de evidencia** (visibles en toda la app):
- 🟢 **Verificada:** consta en el histórico de proyectos, una certificación o una revisión del manager.
- 🟡 **Autodeclarada:** la persona lo ha contado en la entrevista. Se guarda con la cita literal y el proyecto.
- ⚪ **Sin evidencia:** el requisito no aparece en ninguna fuente.

### Por qué encaja con lo que puntúan
| Criterio | Cómo lo cubrimos |
|---|---|
| Recommendation engine | Recomienda **equipos**, no solo personas: cobertura conjunta de requisitos con reglas explicables. Sin pesos inventados |
| Data intelligence | Usamos sus datos reales y los enriquecemos con datos que hoy no existen (entrevistas) |
| Enterprise-grade | Cada recomendación muestra **por qué** y **con qué evidencia**. Lo que no tiene evidencia se marca como *"sin verificar"* y no se oculta. El humano decide |
| ElevenLabs (integración, 50 %) | La voz **resuelve la tarea** (capturar skills sin formulario) y no es decorativa |
| Improven | Hay 3 vueltas naturales: boceto → flujo del manager → bucle de voz completo |

### ¿Y si los datos del sábado son otra cosa?
Mantenemos la estructura **necesidad → match con evidencia → decisión verificable** y adaptamos la entrada:
- **CVs o perfiles + histórico de proyectos** → la idea tal cual.
- **RFPs o descripciones de proyecto** (como en 2025) → la entrada del manager es la RFP. Extraemos los requisitos y montamos el equipo con su cobertura. La entrevista de voz rellena los huecos de evidencia.
- **Encuestas, evaluaciones o movilidad interna** → la misma lógica orientada a **movilidad interna y reskilling** ("¿quién podría ocupar este rol en 3 meses con formación?").
- **Datos muy sucios o pocos** → avisamos de ello en el pitch. La entrevista de voz es, precisamente, la manera de generar datos de calidad.

---

## 4. Alcance: HOY vs DESPUÉS

| HOY (lo que se ve funcionando a las 16:45) | DESPUÉS (lo contamos en el pitch como roadmap) |
|---|---|
| Carga de los datos de NTT DATA (CSV o tabla) en Supabase vía Lovable | Integración con HRIS o SAP SuccessFactors y SSO |
| Pantalla del manager: necesidad → requisitos → candidatos con evidencia → **Proponer equipo** (cobertura conjunta, huecos, comparar con el top-2, borrador editable) | Optimización con coste, seniority, ubicación y equilibrio de carga |
| Nota de voz → **ElevenLabs Speech-to-Text** → propuesta de habilidad, proyecto y cita → Ana confirma → la ficha cambia | Agente conversacional en directo (ElevenLabs Agents), entrevistas automáticas al cerrar cada proyecto |
| Estado "sin evidencia / sin verificar" visible | Detección de sesgos y auditoría (AI Act: el staffing es de alto riesgo) |
| Un caso medido: manual frente a SkillSonar | Piloto con una unidad de NTT DATA |

---

## 5. Arquitectura (montable en un día)

- **Front + backend:** **Lovable** (React + Supabase). Tablas: `employees`, `skills`, `employee_skills(evidence, source, confidence, verified)`, `projects` y `requests`.
- **IA:** el AI integrado de Lovable (o una edge function con un LLM) para:
  1. Extraer capacidades requeridas de un texto o RFP en JSON.
  2. Generar la explicación de cada match. **El ranking lo calcula una fórmula determinista** (no lo decide el LLM), así es reproducible y defendible ante el jurado.
- **Voz, opción principal: grabación, transcripción y revisión.**
  1. **Grabar:** botón "Grabar nota de voz" en el perfil (`MediaRecorder` del navegador, unos 15 s).
  2. **Transcribir:** una *edge function* de Supabase envía el audio a **ElevenLabs Speech-to-Text** (`POST /v1/speech-to-text`, modelo Scribe, idioma español). **La API key va en la edge function y nunca en el frontend.**
  3. **Proponer:** el LLM extrae `[{skill, project, evidence_quote}]` de la transcripción. La cita tiene que ser literal.
  4. **Revisar:** Ana ve la propuesta y puede confirmar, editar o descartar cada habilidad.
  5. **Guardar:** se guarda con `source='voice'` y `status='autodeclarada'`. La ficha y el ranking se actualizan.
  
  Se puede probar con una grabación hecha de antemano, sin depender de una conversación en directo. **La IA no estima niveles.**
- **Mejora opcional (solo si lo anterior ya funciona):** ElevenLabs Agents en directo con `@elevenlabs/react`. El agente entrevista y llama a una *client tool* `add_skill({skill, evidence_quote, project})`, que pasa por la misma pantalla de revisión.
- **Plan de reserva:** locución con ElevenLabs en el vídeo de demo. Mantiene la candidatura al reto, aunque con menos puntuación en integración.
- **En el pitch, la voz se justifica por lo que cambia:** se enseña el cambio en la ficha de Ana y cómo lo usa el responsable de staffing, no solo que la transcripción funciona. Integración y valor es el 50 % de la nota del reto.
- **Ranking por reglas (explicable, sin pesos):**
  1. **Filtro de obligatorios.** Si cumple todos con evidencia verificada → *"cumple"*. Si alguno solo está autodeclarado → *"candidata para revisar"*. Si a alguno le falta evidencia → *"falta evidencia de X"*, y se muestra sin ocultarlo.
  2. **Disponibilidad** (≥ la que pide el proyecto).
  3. **Ordenar por número de deseables cubiertos.** Desempata la evidencia más reciente.

  Cada tarjeta explica la recomendación en una línea: *"Cumple Azure (verificado, proyecto X) y Java (CV). Disponible al 80 %. Cubre 2 de 3 deseables."*

### Prompt inicial para Lovable (pegar al abrir el caso y ajustar a los datos reales)
> Build "SkillSonar", an enterprise talent-matching web app for a consulting firm's staffing managers. Clean, professional UI (NTT DATA-like blue palette), Spanish language. Supabase tables: employees(id, name, role, seniority, location, availability_pct, current_project), skills(id, name, category), employee_skills(employee_id, skill_id, evidence_quote text, project text, source 'cv'|'project'|'voice', status 'verificada'|'autodeclarada', updated_at). Pages: (1) "Nueva necesidad": textarea where the manager pastes a project need or RFP excerpt; an AI step extracts required skills with priority (must/nice) as editable chips, plus required availability. (2) "Recomendaciones": rule-based ranking, no weighted score: first filter by must-haves (label each candidate "cumple" if all musts are verified, "candidata para revisar" if some must is only self-declared, "falta evidencia de X" otherwise — never hide them), then availability, then sort by number of nice-to-haves covered. Each card shows a one-line explanation, the evidence quote and source per skill, and status badges (green verificada, yellow autodeclarada, grey sin evidencia). (2b) Main feature, a "Proponer equipo" button: deterministic team builder — individual constraints (availability) are checked per person, capability requirements are covered by the team as a whole; filter by required availability, repeatedly pick the person covering the most still-uncovered must-haves (verificada = covered, autodeclarada = covered-pending), tie-break by nice-to-haves, until all musts are covered or the max team size is reached. Show a side-by-side comparison "Top-2 del ranking" vs "Equipo propuesto" with musts covered shown as "X verificados + Y pendientes", let the manager swap members with live recalculation, and generate an editable draft (team, who covers each requisite, evidence, gaps) exportable as an RFP team section. Include a coverage matrix showing which required skills the selected team covers and which are gaps. (3) "Perfil" of an employee showing skills grouped by source, with a big "Grabar nota de voz" button: record ~15 s with MediaRecorder, send the audio to a Supabase edge function that calls ElevenLabs Speech-to-Text (POST https://api.elevenlabs.io/v1/speech-to-text, model_id "scribe_v1", language_code "spa", API key stored as a Supabase secret, never in the client), then use AI to extract [{skill, project, evidence_quote}] with literal quotes. Show a review screen where the employee confirms, edits or discards each proposed skill; confirmed ones are saved with source 'voice' and status 'autodeclarada' and appear in the profile with a highlight animation. Seed with the CSV I will upload.

### Prompt de extracción (transcripción → propuesta)
> A partir de esta transcripción de una nota de voz de un empleado, extrae solo las experiencias profesionales concretas que la persona dice haber tenido. Devuelve JSON: `[{"skill": nombre normalizado (p. ej. "Azure", "Liderazgo de equipo"), "project": nombre del proyecto o null, "evidence_quote": fragmento LITERAL de la transcripción}]`. No infieras niveles, potencial ni habilidades que no se mencionen explícitamente. Si no hay ninguna, devuelve `[]`.

### Prompt del agente de ElevenLabs (solo para la mejora opcional)
> Eres SkillSonar, un entrevistador amable de una consultora. Tu objetivo es descubrir, en menos de 3 minutos, qué experiencia nueva ha adquirido la persona en su último proyecto. Haz una pregunta cada vez y como máximo 5 preguntas: qué proyecto fue, qué hizo exactamente, qué herramientas o tecnologías usó, qué le tocó liderar o resolver y qué le gustaría hacer después. Cada vez que la persona describa una experiencia concreta con un ejemplo, llama a `add_skill` con el nombre normalizado de la habilidad, una cita breve y literal de lo que dijo y el nombre del proyecto. No evalúes niveles ni potencial. No inventes habilidades que no haya mencionado. Al acabar, resume en una frase y llama a `finish_interview`.

---

## 6. Plan del día (sobre nuestro horario)

| Hora | Qué | Evidencia para Improven |
|---|---|---|
| 09:00–10:00 | Kick-off. Leer el caso y la rúbrica juntos. Asignar quién se encarga de cada criterio | — |
| 10:00–10:15 | **Datos:** cuántas tablas y filas, qué columnas sirven, huecos y nulos | Nota en Notion |
| 10:15–10:35 | **Foco:** validar SkillSonar con las 6 preguntas al mentor. Decidir HOY/DESPUÉS | Frase de valor y apuesta |
| 10:35–12:00 | **Vuelta 1:** boceto (Figma, papel o el primer Lovable) del flujo del manager y la entrevista. Probar con 2–3 externos | Foto #1 + log |
| 12:00–14:15 | **Vuelta 2:** cerrar primero **una necesidad → tres candidatos → evidencias → un requisito sin cubrir** con datos reales. En paralelo, el recorrido de voz (grabar → transcribir → revisar → guardar). Probar sin guiar a nadie | Foto #2 + log |
| **14:30** | **Decisión sobre la voz, con dos condiciones observables:** ① el flujo de staffing funciona con un ejemplo del reto, y ② la grabación se ha ejecutado **dos veces seguidas sin intervención técnica**. Si se cumplen las dos, la voz entra en la demo. Si falla la segunda, se pasa a la locución del vídeo y ese tiempo se dedica a medir, grabar y ensayar | — |
| 14:15–16:15 | **Vuelta 3:** el momento Ana (cambio de estado de la evidencia), el caso "sin evidencia" y la medición | Foto #3 + Keep/Change/Drop |
| 15:30–16:15 | Grabar el vídeo con **locución de ElevenLabs**, cerrar el deck y el README | — |
| **16:20** | **Entregar** (25 min de margen) y verificar los enlaces desde otra cuenta | — |

**Reparto (5 personas):**
- **Producto y mentor:** valida el problema y lleva el pitch.
- **Datos y lógica:** Supabase, score y prompts de extracción.
- **Lovable/UI:** pantallas del manager y del perfil.
- **Voz:** grabación + ElevenLabs STT + pantalla de revisión, además de la locución del vídeo.
- **QA, medición y entrega:** prueba manual vs SkillSonar, log de Improven, Polievalúa y README.

## 7. La métrica que enseñamos
**Diseño:** dos necesidades parecidas (A y B) sacadas de los datos y dos personas probadoras, que **usan los dos métodos con el orden invertido**:

| | Necesidad A | Necesidad B |
|---|---|---|
| Probador 1 | Manual (Excel o filtros) | SkillSonar |
| Probador 2 | SkillSonar | Manual |

Así no se mezcla el efecto de la herramienta con la habilidad de cada persona. Medimos:
- **Velocidad:** tiempo hasta tener una **propuesta de equipo**.
- **Calidad:** cuántos requisitos obligatorios cubre **el equipo entero con evidencia verificable**, según una revisión manual hecha después.
- **Talento oculto:** candidatos válidos que la búsqueda manual no encontró.

Para Improven, anotad también **un cambio que salga de observar a alguien usando el prototipo**. Por ejemplo: encontró al candidato, pero tardó en entender por qué estaba recomendado → añadimos la línea de explicación en la tarjeta.

En el pitch decimos cuántos ejemplos usamos. Una prueba pequeña y honesta es mejor que una cifra inflada.

## 8. Pitch de 3 minutos
1. **0:00–0:25 · Problema:** *"Build a project team and see the evidence behind every recommendation."* Hoy, montar un equipo es buscar perfiles uno a uno en CVs desactualizados, y nadie ve qué requisitos quedan sin cubrir hasta que es tarde.
2. **0:25–1:40 · Demo:** proyecto con restricción → el top-2 deja seguridad sin cubrir → nota de voz de Ana (15 s) → «Azure · autodeclarada» → verificada con el histórico → «2 verificados + Azure pendiente» → verificada con el histórico → las dos propuestas lado a lado (ciberseguridad vacía en el top-2) → **Proponer equipo** → borrador con evidencias. Frase: *«Con las mismas dos plazas, pasamos de cubrir dos requisitos a cubrir los tres.»*
3. **1:40–2:15 · Evidencia:** la métrica, más un cambio que hicimos gracias a un test externo (vueltas 1→3).
4. **2:15–2:45 · Viabilidad:** qué funciona hoy, cómo tratamos el "sin evidencia" (el humano decide y todo es trazable) y qué haría falta para un piloto.
5. **2:45–3:00 · Cierre:** *"SkillSonar convierte 15 segundos de voz en talento visible y cada recomendación en una decisión defendible."*

**Preguntas que hay que ensayar:** ¿cómo medisteis el beneficio? ¿Qué pasa si la IA alucina una skill? (Cita literal + "sin verificar" + validación del manager.) ¿Privacidad y sesgo? (Consentimiento, el empleado ve y edita su perfil, sin atributos protegidos en el score.) ¿Por qué lo usarían los empleados? (15 segundos de voz frente a un formulario de 40 campos, y su perfil les consigue mejores proyectos.)

## 9. Datos y cumplimiento (preguntar el sábado ANTES de subir nada)
- ¿Qué servicios están autorizados para procesar los datos del reto (Lovable, Supabase, ElevenLabs, LLMs)?
- ¿Qué se puede enseñar en el vídeo y qué se puede incluir en el repo público? Si no está claro, se usan datos anonimizados o ficticios en el repo.
- En el pitch se presenta como **apoyo a una decisión humana**, con evidencias que se pueden revisar y corregir. **Nunca** como algo que "mide el potencial" de una persona. Además, el staffing es una categoría de alto riesgo según el AI Act.

## 10. Checklist para el viernes
- [ ] **Canjear los créditos de ElevenLabs** (Discord → #coupon-codes, con el email de inscripción).
- [ ] Grabar 2–3 notas de voz de prueba (la de Ana con Azure, otra sin habilidades claras y otra con ruido).
- [ ] Hacer un proyecto de prueba en Lovable con `data/sample/` para llegar con el esqueleto aprendido.
- [ ] **Probar el recorrido completo con datos ficticios:** grabar → transcribir (edge function + ElevenLabs STT) → revisar → guardar → ver el cambio en la ficha y en el ranking. Apuntad cuánto se tarda en montarlo para estimar el esfuerzo del sábado.
- [ ] (Opcional) Probar el agente en directo de ElevenLabs con `@elevenlabs/react` solo si sobra tiempo.
- [ ] Preparar plantillas: deck vacío, README y tabla de Improven (Hipótesis | Versión | Qué observamos | Qué cambiamos | Foto).
- [ ] Probar una grabación de pantalla con audio.

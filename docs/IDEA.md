# ORBIT AI

**From Talent Discovery to Talent Assessment to Staffing Decision**

**Brief técnico · MVP de hackathon**

CDTM × UPV-UV Hackathon | Caso NTT DATA | 21 de noviembre de 2026

> **Propuesta de valor.** La persona que necesitas puede estar ya dentro de la compañía. ORBIT encuentra talento más allá de las palabras exactas del CV, valida la adecuación al proyecto con evidencia y ayuda a decidir cómo cubrir la necesidad: con talento interno, contratación externa o un modelo híbrido.

Documento de ejecución para el equipo técnico. Prioridad: un flujo end-to-end funcional, demostrable y trazable en el tiempo disponible.

## 1. Resumen ejecutivo

ORBIT AI es un prototipo de staffing intelligence para NTT DATA. Recibe una necesidad de proyecto en lenguaje natural, la convierte en requisitos estructurados, localiza profesionales internos aunque su experiencia esté descrita con otro vocabulario, explica el ranking con evidencias y permite comparar candidatos. Como diferenciador, incorpora una entrevista de voz contextual con ElevenLabs para obtener evidencia adicional sobre cómo una persona aborda un reto concreto. Finalmente, compara escenarios Internal / External / Hybrid mediante un motor de cálculo transparente.

- **Usuario principal:** manager, responsable de proyecto o equipo de staffing que necesita cubrir una o varias posiciones.
- **Resultado:** shortlist explicable, gaps visibles, evidencia verificable y recomendación de cobertura.
- **Principio de diseño:** la IA interpreta y explica; las reglas deterministas filtran, puntúan y calculan.
- **Límite de alcance:** el MVP demuestra el flujo para una necesidad y un pequeño conjunto de candidatos; no pretende desplegar una plataforma corporativa completa.

## 2. Encaje con el reto oficial

El caso de NTT DATA plantea que el talento adecuado puede existir dentro de la organización, pero quedar oculto por silos, diferencias de nomenclatura y datos repartidos entre CVs, skills y proyectos. El prototipo debe interpretar necesidades, hacer matching semántico, explicar recomendaciones sin inventar experiencia y facilitar la comparación de candidatos.

| Requisito del caso | Cómo lo cubre ORBIT AI |
|---|---|
| Interpretación automática | Extrae conocimientos técnicos, experiencia/seniority, sector/función, idiomas, certificaciones y disponibilidad cuando exista. |
| Matching inteligente | Combina skills equivalentes, tecnologías relacionadas, experiencia transferible, profundidad y duración. |
| Explicabilidad | Muestra fortalezas, requisitos cubiertos, gaps y evidencia asociada a los registros de origen. |
| Comparación | Permite contrastar score, disponibilidad, cobertura y carencias de varios perfiles. |
| Diferenciación propuesta | Entrevista de voz contextual + evaluación estructurada + decisión Internal/External/Hybrid. |

Ponderación oficial de evaluación:

| Criterio | Peso | Implicación para el MVP |
|---|---|---|
| Ejecución técnica y funcionalidad | 30% | Debe funcionar de verdad: input, búsqueda, ranking, explicación y comparación. |
| Resolución del reto e innovación diferencial | 25% | Matching más allá de keywords y entrevista contextual como evidencia adicional. |
| Impacto, modelo de negocio y escalabilidad | 25% | Ahorro potencial de tiempo/coste, despliegue y modelo comercial defendibles. |
| Pitch, demo y defensa | 20% | Flujo simple, demo memorable y narrativa clara en 3 minutos. |

## 3. Alcance funcional del MVP

| Módulo | Entrada | Salida / comportamiento |
|---|---|---|
| A. Project Brief | Descripción libre del proyecto | Requisitos estructurados, separados en obligatorios y deseables; edición manual antes de buscar. |
| B. Talent Discovery | Requisitos aprobados | Ranking de perfiles, score, evidencia, fortalezas, gaps y disponibilidad. |
| C. Talent Assessment | Candidato shortlist + contexto del proyecto | Entrevista ElevenLabs de 3 preguntas, transcripción y evaluación rubricada. |
| D. Staffing Decision Center | Necesidad, shortlist y supuestos editables | Comparativa Internal / External / Hybrid con coste, tiempo, cobertura y riesgo. |

### Fuera del alcance de las 5 horas

- Integración con sistemas HR corporativos, SSO empresarial o sincronización en tiempo real.
- Reentrenamiento de modelos, embeddings de toda la base si no están disponibles, o indexación vectorial completa de 190.000 perfiles.
- Optimización global multi-proyecto a escala productiva. Puede quedar como evolución.
- Decisión automática de contratación, promoción o asignación sin revisión humana.

## 4. Datos disponibles y tratamiento

El workbook proporcionado contiene cinco hojas. La unidad de persona es el registro de Perfiles; Habilidades, Proyectos y Experiencia son relaciones de uno-a-muchos y no deben contarse como personas independientes.

| Hoja | Volumen observado | Uso principal |
|---|---|---|
| Perfiles | 190.000 filas | Identidad sintética, área, rol, puesto, seniority, disponibilidad, experiencia total, sector, país/ciudad, modalidad, movilidad, antigüedad y resumen. |
| Habilidades | 190.000 filas | Skills con nivel y años, certificaciones, idiomas, estudios y texto original de habilidades. |
| Proyectos | 390.651 filas | Proyecto, sector del cliente, año, rol desempeñado y tecnologías. |
| Experiencia | 450.363 filas | Empresa, puesto, fechas, ubicación y tecnologías. |
| Resumen | Hoja de agregados | Estadísticas generales del dataset. |

Distribución de disponibilidad observada en la hoja Perfiles:

| Estado de disponibilidad | Perfiles | Porcentaje | Tratamiento recomendado |
|---|---|---|---|
| En banca | 15.267 | 8,04% | Disponible ahora; elegible para asignación inmediata. |
| Roll-off próximo (<3 meses) | 18.736 | 9,86% | Disponibilidad potencial; mostrar como próxima, no como inmediata. |
| Asignado | 155.997 | 82,10% | No asumir disponibilidad inmediata; mostrar como asignado. |

> **Precaución:** estos estados son categóricos. No convertir «roll-off próximo» en una fecha concreta si el dataset no la proporciona. Los años de uso de una skill no equivalen necesariamente a años de experiencia profesional total.

### 4.1 Modelo de datos propuesto en Supabase

| Tabla | Clave y campos recomendados | Relación |
|---|---|---|
| `profiles` | `profile_id` (PK), `full_name`, `area`, `role`, `current_position`, `seniority`, `availability`, `total_experience_years`, `primary_sector`, `country`, `city`, `modality`, `international_mobility`, `tenure_years`, `join_date`, `summary`, `methodologies`, `soft_skills` | 1 registro por profesional. |
| `profile_skills` | `id` (PK), `profile_id` (FK), `skills_raw`, `skill_name_normalized`, `proficiency_level`, `years_used`, `certifications_raw`, `languages_raw`, `education_raw`, `source_text` | N:1 con `profiles`. |
| `profile_projects` | `id` (PK), `profile_id` (FK), `project_name`, `client_sector`, `year`, `project_role`, `technologies_raw` | N:1 con `profiles`. |
| `profile_experience` | `id` (PK), `profile_id` (FK), `company`, `position`, `start_date`, `end_date`, `location`, `technologies_raw` | N:1 con `profiles`. |
| `project_requirements` | `id`, `project_name`, `description`, `required_skills` JSONB, `desirable_skills` JSONB, `seniority`, `sector`, `languages`, `certifications`, `availability_constraints` | Necesidad analizada. |
| `candidate_assessments` | `id`, `profile_id`, `project_id`, `interview_transcript`, `rubric_scores` JSONB, `summary`, `created_at` | Evaluación complementaria. |
| `scenario_assumptions` | `id`, `project_id`, `internal_cost_rate`, `external_rate`, `recruitment_cost`, `hiring_days`, `onboarding_days`, `weights` JSONB | Supuestos editables y versionados. |

### 4.2 Reglas de carga e integridad

- Leer encabezados desde la fila 4; los registros comienzan en la fila 5.
- Usar ID de perfil como clave de unión entre las cuatro tablas de detalle.
- No hacer un join plano de todas las hojas sin agregación: la multiplicación de filas duplicaría perfiles y distorsionaría puntuaciones.
- Importar preferentemente con CSV + COPY/bulk import a PostgreSQL; evitar insertar más de un millón de filas una a una por API.
- Crear índices sobre `profile_id`, `availability`, `seniority`, `area`, `primary_sector` y campos normalizados de skills.
- Conservar los campos originales (raw) junto a los normalizados para trazabilidad y revisión.
- Validar conteos, IDs huérfanos, duplicados y distribución de disponibilidad después de la importación.

## 5. Arquitectura técnica

| Capa | Tecnología | Responsabilidad |
|---|---|---|
| Frontend | Lovable | UI del flujo: brief, shortlist, evaluación de voz y escenarios. |
| Backend / datos | Supabase PostgreSQL + Edge Functions | Persistencia, consultas, reglas de negocio y endpoints. |
| IA generativa | LLM accesible desde Edge Function | Extracción estructurada del brief, normalización semántica y explicación basada en evidencias. |
| Voz | ElevenLabs Agents | Entrevista contextual al candidato; entrega transcripción para evaluación. |
| Motor de escenarios | Código determinista en Edge Function | Cálculos reproducibles de coste, plazo, cobertura y riesgo. |

Flujo end-to-end:

```
Lovable → Supabase Edge Functions → PostgreSQL
                         ↘ LLM (interpretar / explicar)
                         ↘ ElevenLabs (entrevista contextual)
                         ↘ Scenario Engine (cálculo determinista)
```

### 5.1 Principios de arquitectura

- No enviar los 190.000 perfiles al LLM. Primero reducir el universo con filtros y consultas SQL.
- Para el MVP, combinar skills normalizadas, sinónimos y texto de proyectos/experiencia. Añadir embeddings/reranking solo si ya están listos y no ponen en riesgo el flujo.
- El LLM no decide disponibilidad, no inventa datos y no calcula importes financieros.
- El backend devuelve siempre el origen de la evidencia y una explicación de cómo se obtuvo el score.
- Separar lógica de matching y lógica de escenarios para poder probarlas de forma independiente.

## 6. Edge Functions y contratos

### 6.1 `interpret-project`

**Objetivo:** transformar una descripción natural en un objeto estructurado y editable.

**Input:** `{ project_description, project_start_date?, constraints? }`

**Output sugerido:**

```json
{
  "role": "Senior AI Engineer",
  "seniority": "Senior",
  "mandatory_skills": [{"name": "Azure", "min_level": 3}],
  "desirable_skills": [{"name": "RAG"}, {"name": "AI agents"}],
  "sector_experience": ["Banking"],
  "languages": [{"name": "English", "level": "B2"}],
  "certifications": [],
  "availability": {"acceptable": ["En banca", "Roll-off próximo (<3 meses)"]},
  "client_facing": true
}
```

- Separar MUST-HAVE de NICE-TO-HAVE; el usuario puede corregir la extracción antes de buscar.
- No inferir fechas, niveles o certificaciones que no estén en el brief.

### 6.2 `match-candidates`

**Objetivo:** recuperar candidatos, calcular score explicable y devolver evidencia verificable.

Pipeline recomendado:

1. Aplicar filtros duros solo a requisitos realmente obligatorios (por ejemplo, país, ciudad, idioma mínimo y disponibilidad).
2. Recuperar candidatos mediante skills normalizadas y sinónimos; ampliar búsqueda con tecnologías relacionadas.
3. Enriquecer candidatos con proyectos y experiencia profesional relevantes.
4. Calcular score de forma determinista; no usar el LLM como único mecanismo de ranking.
5. Generar fortalezas, gaps y explicación a partir de evidencias recuperadas.
6. Devolver los mejores candidatos con desglose del score y trazabilidad.

Ponderación inicial sugerida (configurable; no es una ponderación oficial de NTT DATA):

| Dimensión | Peso inicial | Evidencia |
|---|---|---|
| Coincidencia de skills | 40% | Skills requeridas presentes o equivalentes. |
| Nivel de dominio | 20% | Nivel de proficiency disponible en la hoja Habilidades. |
| Duración de uso | 10% | Años de uso declarados para la skill. |
| Experiencia en proyectos / sector | 15% | Proyectos y experiencia relacionados. |
| Seniority | 5% | Seniority del perfil frente al requerido. |
| Idiomas y otros requisitos | 10% | Idiomas, certificaciones y condiciones adicionales. |

Los pesos deben poder ajustarse y normalizarse. Los requisitos obligatorios incumplidos deben mostrarse como bloqueo o gap, no esconderse dentro de una media ponderada. Los requisitos deseables suman valor, pero no excluyen automáticamente.

### 6.3 `calculate-staffing-scenarios`

**Objetivo:** comparar alternativas de cobertura sin atribuir al dataset información económica que no contiene.

| Escenario | Lógica | Variables necesarias |
|---|---|---|
| Internal | Cubrir con profesionales internos identificados por ORBIT. | Coste interno imputado, tiempo de movilización, cobertura, disponibilidad y coste de oportunidad. |
| External | Cubrir mediante contratación/consultoría externa. | Tarifa o coste estimado, coste de selección, plazo de contratación, onboarding y riesgo. |
| Hybrid | Combinar perfiles internos con contratación externa para gaps concretos. | Combinación de variables anteriores; coste y tiempo por parte interna/externa. |

El Excel no proporciona salarios, tarifas, coste de reclutamiento, time-to-hire ni duración de onboarding. Estos valores deben ser inputs editables, etiquetados como supuestos, nunca presentados como datos reales del dataset.

### 6.4 `evaluate-interview`

**Objetivo:** convertir la transcripción de ElevenLabs en una evaluación complementaria vinculada a los requisitos del proyecto.

**Input:** `project_requirements` + `candidate_id` + `transcript`.

**Output:** `rubric_scores`, `observed_evidence`, `strengths`, `concerns`, `unverified_items`, `concise_summary`.

- No actualizar automáticamente las skills oficiales del perfil.
- No convertir una respuesta verbal en certificación o prueba concluyente de competencia.
- Mantener revisión humana; señalar expresamente qué aspectos no han podido verificarse.

## 7. ElevenLabs: diferenciador de ORBIT

ElevenLabs no se utilizará para volver a preguntar por skills o disponibilidad, porque esos datos ya existen en el dataset. Su función será una evaluación contextual posterior al matching: cuando ORBIT identifica una shortlist, el agente plantea preguntas específicas del proyecto para observar razonamiento, aplicación práctica y comunicación.

### 7.1 Flujo de entrevista

1. El manager selecciona un candidato shortlist y el contexto del proyecto.
2. Lovable inicia el agente de ElevenLabs con el contexto permitido y una guía de entrevista.
3. El agente realiza 3 preguntas breves, adaptadas al reto técnico/funcional.
4. Se recupera la transcripción y se envía a `evaluate-interview`.
5. ORBIT muestra evaluación rubricada, citas/respuestas relevantes y puntos no verificados.
6. El manager utiliza esta información junto con el perfil y el matching; la decisión final es humana.

### 7.2 Ejemplo de entrevista contextual

Contexto de ejemplo: proyecto de migración de infraestructura bancaria legacy a Cloud.

- ¿Cómo estructurarías el enfoque de migración y qué factores determinarían la arquitectura?
- ¿Qué riesgos técnicos, de seguridad o continuidad priorizarías y cómo los mitigarías?
- Si se produce una interrupción crítica durante la migración, ¿cómo organizarías la respuesta y la comunicación con el cliente?

### 7.3 Rúbrica sugerida

| Dimensión | Qué observar |
|---|---|
| Aplicación práctica | Conecta conceptos con decisiones y pasos concretos. |
| Resolución de problemas | Identifica riesgos, alternativas y trade-offs. |
| Comprensión del contexto | Adapta la respuesta al sector, cliente y restricciones. |
| Comunicación | Explica de forma clara, ordenada y comprensible. |
| Evidencia / límites | Distingue experiencia demostrada de hipótesis; registra lo no verificado. |

**MVP de voz:** un agente, un contexto de proyecto, tres preguntas y una evaluación. No construir una plataforma de entrevistas completa durante el hackathon.

## 8. Staffing Decision Center: escenarios y decisión

La pantalla debe mostrar una comparación ejecutiva y permitir modificar supuestos. La recomendación se recalcula automáticamente cuando cambian los inputs.

| Métrica | Internal | External | Hybrid |
|---|---|---|---|
| Coste total estimado | Coste interno imputado + oportunidad | Tarifa/coste + selección | Suma ponderada de ambos |
| Tiempo hasta incorporación | Movilización interna | Selección + contratación + onboarding | Máximo/solapamiento según plan |
| Cobertura de requisitos | Cobertura del talento interno | Cobertura del perfil externo supuesto | Cobertura combinada |
| Disponibilidad | Según estado del dataset | Según plazo estimado configurable | Según ambas vías |
| Riesgo | Desasignación / oportunidad / encaje | Plazo / disponibilidad / onboarding | Complejidad de coordinación |

### 8.1 Cálculo y transparencia

- Mostrar coste y plazo como estimaciones calculadas a partir de inputs explícitos.
- Separar dato observado, supuesto del usuario y resultado calculado.
- No asignar valores monetarios por defecto como si fueran hechos. Si se necesitan valores demo, marcarlos como «supuesto ilustrativo».
- Permitir ajustar pesos de coste, rapidez, cobertura y riesgo.
- Explicar por qué gana un escenario: por ejemplo, menor tiempo, mayor cobertura o menor coste estimado.

Fórmula conceptual para el ranking de escenarios (normalizada):

**Scenario Score = w₁·Cost Score + w₂·Time Score + w₃·Coverage Score + w₄·Availability Score − w₅·Risk Penalty**

Los pesos y la normalización deben definirse en código y mostrarse en la UI. El motor de escenarios debe ser determinista y testeable.

## 9. Diseño de pantallas en Lovable

| Pantalla | Componentes mínimos | Acción principal |
|---|---|---|
| 1. Project Brief | Textarea de necesidad, requisitos extraídos editables, chips MUST-HAVE / NICE-TO-HAVE. | Confirmar requisitos y buscar talento. |
| 2. Talent Discovery | Tabla/lista de candidatos con score, disponibilidad, strengths, gaps y evidencia; selector de comparación. | Abrir perfil / comparar. |
| 3. Talent Assessment | Perfil, contexto de entrevista, widget ElevenLabs, transcripción y rúbrica. | Iniciar entrevista / guardar evaluación. |
| 4. Staffing Decision Center | Comparativa Internal/External/Hybrid, métricas, supuestos editables y recomendación. | Ajustar supuestos y decidir. |

## 10. Reparto del equipo (5 personas)

| Responsable | Responsabilidad | Entregable verificable |
|---|---|---|
| 1. Data Engineering | Convertir Excel a CSV, crear tablas, importar, validar IDs y conteos. | Datos consultables desde Supabase. |
| 2. AI Matching / Backend | `interpret-project` y `match-candidates`; reglas, score y evidencia. | Brief → shortlist real con explicación. |
| 3. Scenario Intelligence | Modelo Internal/External/Hybrid, inputs y cálculo determinista. | Comparador que cambia al editar supuestos. |
| 4. ElevenLabs | Configurar agente, preguntas, integración y transcripción. | Una entrevista de voz ejecutable y transcript accesible. |
| 5. Lovable / Integración | Construir pantallas y conectar endpoints. | Flujo visual end-to-end. |

## 11. Plan de ejecución: 5 horas

| Tiempo | Foco | Criterio de salida |
|---|---|---|
| 00:00–00:45 | Data import + Supabase | Tablas cargadas; un perfil y sus skills/proyectos se consultan correctamente. |
| 00:45–01:45 | Matching básico | Una necesidad devuelve ranking, score y evidencia; evitar perfeccionismo en embeddings. |
| 01:30–03:00 | Scenario engine | Los tres escenarios muestran métricas a partir de inputs configurables. |
| 02:00–03:30 | ElevenLabs | Agente de 3 preguntas funciona y se obtiene transcripción. |
| 03:30–04:15 | Integración Lovable | El usuario puede recorrer brief → resultados → entrevista/escenarios. |
| 04:15–05:00 | Pruebas y demo | Validar un caso, corregir fallos críticos y preparar pitch de 3 minutos. |

Las franjas se solapan deliberadamente: el equipo trabaja en paralelo. La integración debe comenzar antes de que todos los módulos estén perfectos.

## 12. Criterios de aceptación del MVP

- Un usuario introduce una necesidad en lenguaje natural y recibe requisitos estructurados editables.
- El sistema devuelve candidatos del dataset real, no registros inventados ni una lista estática.
- Cada candidato muestra score desglosado, fortalezas, gaps y referencias a evidencia del perfil/proyectos/experiencia.
- Los estados de disponibilidad se muestran exactamente como están en la fuente.
- El usuario puede comparar al menos tres candidatos.
- El usuario puede lanzar una entrevista ElevenLabs contextual y visualizar su transcripción.
- La evaluación de voz es complementaria y no altera automáticamente el perfil maestro.
- Internal / External / Hybrid se calculan con supuestos editables y claramente identificados.
- El flujo completo puede demostrarse sin pasos manuales ocultos ni resultados falsos.

## 13. Riesgos y salvaguardas

| Riesgo | Mitigación |
|---|---|
| Duplicación de perfiles por joins 1:N | Mantener tablas normalizadas y agregar por `profile_id` antes de puntuar. |
| Matching por keyword demasiado literal | Normalización, diccionario de equivalencias, tecnologías relacionadas y evidencia contextual. |
| Alucinaciones del LLM | Restringir explicaciones a fragmentos recuperados; mostrar fuente y gaps; no inventar. |
| Disponibilidad mal interpretada | No convertir categorías en fechas; distinguir disponible ahora, próximo roll-off y asignado. |
| Supuestos económicos confundidos con datos | Etiquetar inputs, permitir edición y separar observado/estimado/calculado. |
| Entrevista de voz considerada prueba definitiva | Evaluación complementaria, rúbrica transparente y revisión humana. |
| Exceso de alcance | Priorizar matching real, escenarios funcionales y una entrevista demo. |

## 14. Guion de demo recomendado (3 minutos)

| Tiempo | Demo / mensaje |
|---|---|
| 0:00–0:25 | Problema: «El talento que necesitas puede estar ya dentro, pero oculto por silos y diferentes formas de describir la experiencia». |
| 0:25–1:10 | Introducir una necesidad realista; ORBIT extrae requisitos y separa obligatorios/deseables. |
| 1:10–1:45 | Mostrar shortlist, ranking, evidencia y gaps. Comparar perfiles y destacar experiencia transferible. |
| 1:45–2:15 | Lanzar fragmento de entrevista ElevenLabs; mostrar transcripción y evaluación contextual. |
| 2:15–2:45 | Mostrar escenarios Internal / External / Hybrid y cómo cambian al modificar supuestos. |
| 2:45–3:00 | Cierre: ORBIT conecta discovery, assessment y staffing decision en un flujo explicable. |

## 15. Evolución posterior al hackathon

- Indexación semántica y embeddings a escala con evaluación de calidad y coste.
- Optimización de asignaciones para múltiples vacantes/proyectos y restricciones simultáneas.
- Recomendación de equipos complementarios cuando ningún perfil individual cubre todos los requisitos.
- Integración con HRIS, ATS, sistemas de staffing, permisos y auditoría corporativa.
- Panel de impacto: tiempo de búsqueda, porcentaje de cobertura interna, tasa de movilidad interna y coste evitado estimado.
- Gobernanza: control de acceso, retención, trazabilidad, evaluación de sesgos y revisión humana.

## 16. Notas de implementación y fuentes

Fuente primaria del reto: «NTT DATA Case: AI Talent Matcher», CDTM × UPV-UV Hackathon, 21 November 2026, 4 páginas. El alcance mínimo, las funcionalidades avanzadas y los pesos de evaluación se han trasladado respetando el documento.

Fuente de datos: workbook «NTT_DATA_Perfiles_T6.xlsx», hojas Perfiles, Habilidades, Proyectos, Experiencia y Resumen. Los recuentos y la distribución de disponibilidad indicados corresponden a la inspección previa del workbook. En caso de discrepancia durante la importación, prevalecen los datos efectivamente cargados y validados.

Las ponderaciones de matching, estructura de tablas, endpoints, diseño de escenarios y guion de demo son propuestas técnicas para el MVP, no requisitos oficiales ni campos garantizados del dataset.

---

**ORBIT AI | Find the talent. Validate the fit. Make the staffing decision.**

# ElevenLabs · Agente de entrevista contextual (módulo C)

> Rol 4. Brief §7. **Alcance del MVP:** un agente, un contexto de proyecto, 3 preguntas y una evaluación. No es una plataforma de entrevistas.
> El agente **no** pregunta por skills ni por disponibilidad, porque esos datos ya están en el dataset. Su papel es observar razonamiento, aplicación práctica y comunicación ante un reto concreto del proyecto.

## Configuración (ElevenLabs → Agents)
- **Idioma:** español. **Voz:** una clara y profesional de la librería. **LLM:** el que ofrezca el plan.
- **Variables dinámicas** que envía la app al iniciar: `{{candidate_name}}` y `{{project_context}}` (un párrafo con el rol, los MUST-HAVE y el sector del `project_requirements`).
- **Duración:** unos 3-4 min. Termina tras la tercera respuesta.
- **Transcripción:** al terminar, la app la recupera con el SDK o la API de conversaciones y la envía a `evaluate-interview`. Hay que guardar el `conversation_id` en `candidate_assessments.elevenlabs_conversation_id`.
- **Clave:** `ELEVENLABS_API_KEY` solo como secreto de Supabase. Si el widget necesita una URL firmada, la genera una edge function, nunca el navegador.

## Prompt del sistema
> Eres ORBIT, un entrevistador técnico amable y profesional de NTT DATA. Vas a hablar con {{candidate_name}} sobre este proyecto:
> {{project_context}}
>
> Tu objetivo es observar cómo la persona aborda un reto real del proyecto, no comprobar su CV. Haz **exactamente 3 preguntas**, de una en una, adaptadas al proyecto:
> 1. **Enfoque:** cómo estructuraría el trabajo y qué factores determinarían sus decisiones.
> 2. **Riesgos:** qué riesgos técnicos, de seguridad o de continuidad priorizaría y cómo los mitigaría.
> 3. **Situación crítica:** cómo organizaría la respuesta y la comunicación con el cliente ante un incidente grave.
>
> Reglas:
> - Después de cada respuesta puedes hacer como máximo **una** repregunta breve para pedir un ejemplo concreto.
> - No preguntes por skills, años de experiencia, disponibilidad, salario ni datos personales.
> - No evalúes en voz alta ni des feedback sobre si la respuesta es buena.
> - No inventes datos del proyecto que no estén en el contexto.
> - Al terminar la tercera pregunta, agradece y despídete en una frase.

## Ejemplo de preguntas (proyecto: migración de core bancario a cloud)
1. ¿Cómo estructurarías el enfoque de migración y qué factores determinarían la arquitectura?
2. ¿Qué riesgos técnicos, de seguridad o continuidad priorizarías y cómo los mitigarías?
3. Si se produce una interrupción crítica durante la migración, ¿cómo organizarías la respuesta y la comunicación con el cliente?

## Rúbrica que aplica `evaluate-interview` (1-5 por dimensión)
| Dimensión | Qué observar |
|---|---|
| Aplicación práctica | Conecta conceptos con decisiones y pasos concretos |
| Resolución de problemas | Identifica riesgos, alternativas y trade-offs |
| Comprensión del contexto | Adapta la respuesta al sector, al cliente y a las restricciones |
| Comunicación | Explica de forma clara, ordenada y comprensible |
| Evidencia / límites | Distingue experiencia demostrada de hipótesis; registra lo no verificado |

Cada puntuación lleva una **cita literal** del transcript; se descartan las citas que no aparezcan tal cual. Lo que el candidato afirma sin poder verificarse va a `unverified_items`. **Nunca** se modifica `empleado_skills`.

## Plan B y extra
- **Si el agente falla en directo:** tened grabada una entrevista de ejemplo, con su transcript y su evaluación, y decidlo en la demo ("grabada antes").
- **Reto ElevenLabs:** el agente dentro del producto es la integración que más puntúa. Además, se puede narrar el vídeo de demo con TTS.

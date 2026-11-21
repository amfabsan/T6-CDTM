# ElevenLabs

## 1. Speech-to-Text (opción principal, dentro del producto)
Lo hace `supabase/functions/transcribe`: `POST https://api.elevenlabs.io/v1/speech-to-text` con el campo `file`, `model_id` (`ELEVENLABS_STT_MODEL`, por defecto `scribe_v2`) y `language_code=es`. La extracción de skills la hace `supabase/functions/extract` con `mode: "skills"`, que **descarta cualquier skill cuya cita no aparezca literalmente en la transcripción**.

**Notas de prueba para grabar el viernes:**
1. *Ana (la buena):* "En mi último proyecto, la migración cloud de seguros, lideré la migración de tres microservicios a Azure y monté el despliegue automático con GitHub Actions."
2. *Sin habilidades claras:* "Pues bien, ha sido un proyecto tranquilo, buen equipo, nada especial que destacar."
3. *Con ruido de fondo:* la de Ana grabada en un sitio con gente (simula la sala del evento).

## 2. Locución del vídeo de demo (plan de reserva y extra)
Text-to-Speech con una voz en español. Guion de unos 90 segundos sacado del pitch (`docs/IDEA.md` §8). Con esto el equipo opta al reto aunque la integración falle.

## 3. Agente en directo (mejora opcional, solo si lo anterior ya funciona)
Prompt del agente:
> Eres SkillSonar, un entrevistador amable de una consultora. Tu objetivo es descubrir, en menos de 3 minutos, qué experiencia nueva ha adquirido la persona en su último proyecto. Haz una pregunta cada vez y como máximo 5 preguntas: qué proyecto fue, qué hizo exactamente, qué herramientas o tecnologías usó, qué le tocó liderar o resolver y qué le gustaría hacer después. Cada vez que la persona describa una experiencia concreta con un ejemplo, llama a `add_skill` con el nombre normalizado de la habilidad, una cita breve y literal de lo que dijo y el nombre del proyecto. No evalúes niveles ni potencial. No inventes habilidades que no haya mencionado. Al acabar, resume en una frase y llama a `finish_interview`.

La *client tool* `add_skill` debe pasar por **la misma pantalla de revisión** que la nota de voz.

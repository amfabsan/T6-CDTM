# Patrones de los proyectos ganadores de CDTM Hacks

## Fuentes
- **CDTM Hacks Múnich 2025** (36 h, 125 participantes, 3 casos: Trade Republic, Avi Medical y Beam). Datos completos de los **33 proyectos** sacados del repositorio oficial [`CDTM/cdtm-hacks`](https://github.com/CDTM/cdtm-hacks), fichero `website/src/constants/projects.ts`, que incluye la descripción, el stack, las dificultades y los enlaces de cada proyecto. 9 de ellos ganaron algo.
- **VLC Hacks 2025** (2 oct 2025, casos de HP, NTT DATA, IBM y Leaping AI). CDTM Valencia **no ha publicado la lista de ganadores**. Lo único confirmado: Tudor Duca ganó el caso de IBM y, en el caso de NTT DATA (responder RFPs), un equipo usó Lovable y se llevó el premio de Scientists360.
- **No existen ediciones anteriores públicas.** Múnich 2025 es la única con datos (la web de 2024 da 404) y Valencia 2026 es la 2.ª edición.

## Los 9 ganadores de Múnich 2025

| Proyecto | Premio | Qué hacía | Stack clave |
|---|---|---|---|
| **N/avi** | 🥇 1.º global, 2.º del caso Avi | Onboarding de pacientes: foto de documentos → datos médicos estructurados. "Tan fácil como hacerse un selfie" | Next.js, Gemini 2.0 Flash, OCR con varias pasadas |
| **maintaino** | 🥈 2.º global, 2.º del caso Beam, potencial de negocio | Plataforma de mantenimiento con agentes que anticipan fallos y **piden recambios** | **Lovable**, Make/Beam, GPT, **ElevenLabs**, Supabase |
| **Republica** | 🥉 3.º global, 1.º del caso Trade Republic | Asistente multimodal (voz y texto) dentro de la app del banco | React/shadcn con **Lovable**, Whisper, TTS, Mistral |
| **MediMate** | 1.º del caso Avi, Best Mistral, Best Avatars | *"Talk to an AI, not a clipboard"*: un avatar entrevista al paciente y el médico recibe un dashboard | iOS, FastAPI, LiveKit, dashboard con **Lovable**, desplegado en GCP |
| **Opus** | 1.º del caso Beam | Plantilla de agentes de IA para RR. HH., soporte y análisis, que se activan desde Slack | Beam, n8n, observabilidad con **Lovable** y Supabase, voz con VAPI |
| **Today's growth.** | 2.º del caso Trade Republic | Muestra cómo afecta el gasto de hoy a tu pensión y **cancela suscripciones** con un clic | React, Supabase, GPT-4o, Make, demo en lovable.app |
| **PeopleWorks** ⚠️ | Best use of AI to improve processes | Un agente de RR. HH. **llama a los compañeros por voz**, recoge feedback y lo mapea contra competencias **con citas reales** | **Lovable**/V0, **ElevenLabs**, OpenAI, Mistral, Supabase |
| **Pledge** | Most potential to earn real money | Selección con agentes que **entrevistan al candidato** para aclarar huecos del CV | Plantilla de **Lovable**, Beam, OpenAI |
| **WorkAR** | Biggest creative risk | Instrucciones en realidad aumentada (Meta Quest) generadas a partir de un vídeo de un experto | Unity, Gemini, OWL-V2 |

⚠️ **PeopleWorks se parece mucho a SkillSonar (nuestro diseño anterior, hoy ORBIT AI).** Ver el apartado sobre implicaciones.

## Números (33 proyectos de Múnich 2025)

| Señal | Ganadores (puesto o premio, 9 en total) | Resto (24) |
|---|---|---|
| **Lovable** citado en el stack (`howBuilt`) | **6 de 9** | 3 de 24 |
| **Lovable** citado en el stack o con demo en `lovable.app` | 7 de 9 | 8–9 de 24 (≈7 de 15 proyectos con Lovable ganan) |
| Usan **ElevenLabs** | **2 de 9** (maintaino, PeopleWorks) | 0 de 24 |
| Tienen **voz** en el producto | 4 de 9 | 7 de 24 |
| **Un agente entrevista a personas** | 2 de 9 (PeopleWorks, Pledge) | 0 de 24 |
| Tienen **demo desplegada** (URL) | 7 de 9 (78 %, uno es un Linktree) | 16 de 24 (67 %) |

**Cómo leer esto (corregido tras la revisión de un compañero):**
- **La cifra de Lovable cambia según cómo se cuente.** Va de 6/10 a 7/15 proyectos con Lovable que ganan algo. La señal existe, pero no es enorme. **Sirve para decidir cómo trabajar, no para predecir la nota en Valencia.**
- **Desplegar la demo no distingue a los ganadores:** también lo hizo el 67 % del resto. Se despliega para que el jurado pueda probar el flujo, no porque dé puntos por sí solo.
- **ElevenLabs y las entrevistas** son 2 casos cada uno. Es una anécdota, no una tendencia.
- **Detalle técnico relevante:** el propio equipo de PeopleWorks cuenta que **integrar el agente (ElevenLabs y Beyond Presence) y procesar las transcripciones** fue lo que más tiempo les llevó, y eso en 36 horas. Nosotros tenemos unas 6. Esto refuerza que la opción principal de voz sea grabar → transcribir → revisar → guardar.

## 8 patrones de éxito

1. **Una conversación que sustituye un formulario.** Lo hacen MediMate ("not a clipboard"), Republica, PeopleWorks y Pledge. El jurado premia que la IA **elimine fricción humana**, no que añada otra pantalla.
2. **Producto con dos caras.** Una persona aporta información de forma cómoda (paciente, empleado o candidato) y un profesional la recibe **estructurada** en un dashboard (médico, RR. HH. o manager). Así funcionan N/avi, MediMate, PeopleWorks y Pledge.
3. **Entra desorden y sale estructura con evidencia.** Fotos, audio o texto libre se convierten en datos limpios. PeopleWorks cita literalmente lo que se dijo. Trazabilidad = credibilidad.
4. **La IA actúa, no solo muestra datos.** maintaino pide recambios, Today's growth cancela suscripciones y Opus ejecuta tareas. El último paso de la demo es **una acción**, no un gráfico.
5. **Conectado de principio a fin.** MediMate insiste en que *los datos reales llegan al dashboard del médico*. Un flujo completo vale más que muchas funciones sueltas. Desplegar es lo normal (también lo hizo el 67 % de los no ganadores), no lo que marca la diferencia.
6. **Lovable para la interfaz y el tiempo para lo diferencial.** 6 de los 9 ganadores citan Lovable en su stack. El equipo de Republica lo resume así: iterar rápido es mejor que escribir prompts largos.
7. **Una frase y una metáfora que se recuerdan.** "Talk to an AI, not a clipboard" o "tan fácil como un selfie". El pitch se queda con una imagen.
8. **Un caso de uso concreto y elegido pronto.** En la sección de dificultades, los equipos repiten los mismos errores: maintaino perdió horas pivotando, otro equipo planificó demasiado y trabajó en silos, y Pledge tardó 24 h en encontrar un problema real porque el caso era hipotético.

## Implicaciones para T6 (escrito para SkillSonar; ORBIT AI hereda la mayoría)

- ✅ **La idea encaja con 6 de los 8 patrones:** conversación en lugar de formulario, dos caras, evidencia con citas, Lovable con Supabase, ElevenLabs y un caso concreto de RR. HH.
- 🎯 **El centro del producto es «Proponer equipo»:** montar un equipo para un proyecto concreto y comprobar qué requisitos cubre **en conjunto**. Ahí está la diferencia real con PeopleWorks, que ya demostró la captura de feedback por voz con citas.
- ⚠️ **Hay que diferenciarse de PeopleWorks.** Ellos hacían *feedback y desarrollo* de una persona. Nosotros hacemos una **decisión de staffing**:
  - un recomendador sobre **los datos reales de NTT DATA**;
  - un re-ranking en directo cuando aparece una evidencia nueva;
  - una **propuesta de equipo** con su cobertura de capacidades.
  
  La entrevista es el medio, no el producto. Si alguien del jurado conoce PeopleWorks, esta frase lo resuelve: *"no evaluamos personas, encontramos la persona adecuada para un proyecto"*.
- ➕ **Añadir una acción final (patrón 4).** Al pulsar "Proponer equipo", la app genera:
  - la **sección de equipo de una propuesta o RFP**, con el CV resumido de cada miembro y una justificación (enlaza con el caso de NTT DATA de 2025);
  - el mensaje de solicitud al manager de cada persona.
- ➕ **Frase del pitch (patrón 7):** *"Talk to ORBIT, not to a skills form."* o *"El mejor candidato ya trabaja aquí, pero su CV no lo sabe."*
- ➕ **Desplegar en lovable.app** y poner la URL en el README y en la entrega (patrón 5).
- ➕ **Priorizar la integración sobre el número de funciones (patrón 5).** Si a las 14:15 la voz no escribe en el perfil, se recorta todo lo demás hasta que lo haga.

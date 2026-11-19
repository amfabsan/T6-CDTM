# Stack y arquitectura · T6 SkillSonar

## Regla de decisión
En Múnich 2025, los ganadores usaron **la tecnología de los patrocinadores del evento** y montaron todo lo demás con lo más simple posible. Las piezas exóticas (avatares, apps nativas, plataformas de agentes) aparecen en sus fichas como lo que más tiempo les costó, y eso que tenían 36 horas. Nosotros tenemos unas 6.

## Patrocinadores de VLC Hacks 2026 → qué usamos

| Patrocinador | Qué aporta | Cómo lo usamos |
|---|---|---|
| **Lovable** (tech) | Créditos para todo el equipo | **La app entera.** Interfaz React con shadcn, Supabase integrado (tablas y *edge functions*), AI Gateway, despliegue en `lovable.app` y sincronización con GitHub, que nos da el repo obligatorio |
| **ElevenLabs** (reto + créditos Creator) | Speech-to-Text, Text-to-Speech, Agents | **STT dentro del producto** (nota de voz → evidencia) para el criterio de integración y valor, que es el 50 %. **TTS** para la locución del vídeo, que es el 25 % y el seguro para optar al reto. **Agents** solo como mejora |
| **Notion** (tech) | Plantilla oficial y taller | Tablero de tareas del día y **cuaderno de iteraciones de Improven** (espejo en `docs/ITERATIONS.md`) |
| **Improven** (reto) | Metodología (≥3 vueltas probadas con externos) | No es tecnología: la estructura del día. Foto y log en cada vuelta |
| **NTT DATA** (caso) | Datos y posibles API el sábado | Una sola puerta de entrada: la página "Importar datos" y `001_schema.sql`, que se adaptan a sus columnas. Si hay API, se llama desde una *edge function* |
| Maisa, Sherpas, IDEAS UPV, Mercadona IT, Cátedra HP, Finanz, Scientists360, Red Bull | Ecosistema, premios, logística | Nada técnico. No añadimos herramientas sin créditos ni soporte en el evento |

**Fuera:** n8n, Make, frameworks multiagente, LiveKit o avatares, apps nativas, backends separados y un LLM que decida el ranking.

## Arquitectura

```
            Navegador (app Lovable · React + shadcn)
 ┌──────────────────────────────────────────────────────────────┐
 │ Nueva necesidad → Candidatos → PROPONER EQUIPO → Borrador     │
 │ Perfil → 🎙️ Nota de voz → Revisión (confirmar/editar/descartar)│
 │                                                              │
 │ src/lib/teamBuilder.ts  ← lógica determinista (sin LLM):      │
 │   rankIndividuals · proposeTeam (exhaustivo) · teamCoverage   │
 │   candidateLabel · findSupportingRecord · verifySkill         │
 └───────────────┬───────────────────────────┬──────────────────┘
                 │ supabase-js               │ functions.invoke
        ┌────────▼────────┐        ┌─────────▼──────────────────────┐
        │ Supabase Postgres│        │ Edge functions (secretos aquí) │
        │ employees        │        │ transcribe → ElevenLabs STT    │
        │ project_history  │        │ extract    → LLM (Lovable AI)  │
        │ employee_skills  │        │   · requirements (RFP → JSON)  │
        │ staffing_requests│        │   · skills (cita literal o fuera)│
        │ team_proposals   │        └────────────────────────────────┘
        └──────────────────┘
```

**Principios:**
1. **El LLM extrae y la lógica decide.** El ranking y el equipo salen de `teamBuilder.ts`, son reproducibles y los verifica `scripts/verify_demo.ts`.
2. **Las claves solo viven en las *edge functions*** (ElevenLabs y LLM). Nunca en el navegador.
3. **Barrera anti-alucinación:** `extract` descarta las skills cuya cita no aparece literalmente en la transcripción.
4. **Toda evidencia tiene estado (verificada o autodeclarada) y fuente (cv, project, voice o manager).**

## Estructura de carpetas

```
T6-CDTM/
├── README.md                     ← plantilla de entrega (Polievalúa): rellenar el sábado
├── .env.example                  ← secretos necesarios (los reales van en Supabase, nunca en git)
├── docs/
│   ├── IDEA.md                   ← producto, demo, pitch, plan del día
│   ├── PATTERNS.md               ← análisis de ganadores de Múnich 2025
│   ├── STACK.md                  ← este documento
│   └── ITERATIONS.md             ← cuaderno de iteraciones de Improven (espejo de Notion)
├── prompts/
│   ├── lovable.md                ← 5 prompts en orden
│   └── elevenlabs.md             ← STT, notas de prueba, locución, agente opcional
├── src/lib/                      ← se copia tal cual al repo de Lovable
│   ├── types.ts
│   └── teamBuilder.ts
├── supabase/
│   ├── migrations/001_schema.sql
│   └── functions/
│       ├── transcribe/index.ts   ← ElevenLabs Speech-to-Text
│       └── extract/index.ts      ← LLM: requisitos y skills con cita literal
├── data/sample/                  ← datos ficticios con el escenario de Ana
│   ├── employees.csv
│   └── project_history.csv
└── scripts/
    └── verify_demo.ts            ← comprueba el escenario con la misma lógica que la app
```

## ⚠️ Antes de usar lo preparado
- **Preguntad a la organización** si se permite reutilizar código propio preparado antes del evento (ver `docs/IDEA.md` §9). Las bases no lo prohíben, pero el email habla de empezar en igualdad de condiciones.
- **Soporte técnico de ElevenLabs durante el evento:** canal `#hackathon-support` de su Discord.
- **Después del evento:** formulario de feedback y la galería de proyectos de ElevenLabs (showcase.elevenlabs.io), que da merch. Los detalles están en la Hacker Guide.

## Cómo se junta con Lovable
Al conectar GitHub, Lovable **crea un repo nuevo** con su propia plantilla (Vite, `src/`, `supabase/`). Comprobadlo el viernes.
1. **Viernes (ensayo):** crear el proyecto en Lovable → Connect GitHub → clonar → copiar las carpetas de arriba → push → Lovable lo sincroniza. Pasar los prompts 1–5 de `prompts/lovable.md` con `data/sample/`.
2. **Sábado:** o bien se reutiliza ese proyecto, cambiando los datos por los de NTT DATA y adaptando el esquema, o bien se repite el paso 1 en limpio (unos 10 minutos). **El repo de Lovable es el que se entrega.**
3. Antes de subir datos reales, preguntad qué servicios autoriza NTT DATA (`docs/IDEA.md` §9).

## Comprobación rápida
```powershell
node scripts/verify_demo.ts
```

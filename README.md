# SkillSonar · T6 · CDTM Valencia Hacks 2026 (caso NTT DATA)

> **Build a project team and see the evidence behind every recommendation.**

🔗 **Demo:** _(URL de lovable.app)_ · 🎬 **Vídeo:** _(enlace)_ · 📊 **Pitch deck:** _(enlace)_

## Problema
_(Rellenar el sábado con lo que confirme el briefing de NTT DATA y el mentor.)_ Los responsables de staffing montan equipos buscando perfiles uno a uno en CVs desactualizados, y nadie ve qué requisitos quedan sin cubrir.

## Qué hace
1. **Necesidad → requisitos.** El manager pega la descripción de un proyecto o una RFP y la IA extrae los requisitos obligatorios, los deseables y la disponibilidad.
2. **Proponer equipo.** Propone el equipo más pequeño que cubre todos los obligatorios **en conjunto**, comparado con el top-2 de un ranking clásico y con la cobertura de cada requisito.
3. **Evidencia con estado.** 🟢 verificada · 🟡 autodeclarada · ⚪ sin evidencia. La decisión siempre es humana.
4. **Nota de voz (ElevenLabs).** Un empleado cuenta en 15 segundos qué hizo en su último proyecto. ElevenLabs lo transcribe, la IA propone las skills con cita literal y el empleado las confirma. El manager puede verificarlas con el histórico de proyectos.

## Resultados
_(Medición cruzada: 2 probadores × 2 necesidades, con el orden invertido.)_
| | Manual | SkillSonar |
|---|---|---|
| Tiempo hasta la propuesta de equipo | | |
| Obligatorios cubiertos con evidencia verificable | | |

## Cómo está hecho
- **Lovable** (React, shadcn, Supabase) para la app, el despliegue y el repo.
- **ElevenLabs Speech-to-Text** en `supabase/functions/transcribe` y **Text-to-Speech** para la locución del vídeo.
- **LLM** solo para extraer, en `supabase/functions/extract`. Descarta las citas que no aparecen literalmente en la transcripción.
- **Lógica de staffing determinista**, sin LLM, en `src/lib/teamBuilder.ts`. Se verifica con `node scripts/verify_demo.ts`.

Más detalle en [`docs/STACK.md`](docs/STACK.md) y [`docs/IDEA.md`](docs/IDEA.md). Propuestas pendientes de comentar: [`docs/IDEAS-SAMUEL.md`](docs/IDEAS-SAMUEL.md). Las iteraciones están en [`docs/ITERATIONS.md`](docs/ITERATIONS.md).

## Datos y privacidad
_(Indicar qué datos se usaron y si el repo contiene datos ficticios o anonimizados.)_ El sistema no evalúa niveles ni potencial de nadie: solo muestra evidencias revisables.

## Equipo T6
_(Nombres y roles)_

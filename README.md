# ORBIT AI · T6 · CDTM × UPV-UV Hackathon 2026 (caso NTT DATA)

> **Find the talent. Validate the fit. Make the staffing decision.**
> La persona que necesitas puede estar ya dentro de la compañía. ORBIT encuentra talento más allá de las palabras exactas del CV, valida la adecuación al proyecto con evidencia y ayuda a decidir cómo cubrir la necesidad: con talento interno, contratación externa o un modelo híbrido.

🔗 **Demo:** https://project-people-orbit.lovable.app/ · 🎬 **Vídeo:** _(enlace)_ · 📊 **Pitch deck:** _(enlace)_

## Flujo
1. **Project Brief.** El manager describe la necesidad. La IA la convierte en requisitos MUST / NICE, editables antes de buscar.
2. **Talent Discovery.** Ranking de perfiles internos con score desglosado, fortalezas, gaps, riesgos y la evidencia de cada afirmación (nivel, años de uso, proyectos y certificaciones del dataset). Permite comparar candidatos.
3. **Staffing Decision Center.** Escenarios Internal / External / Hybrid calculados con supuestos editables y etiquetados.

## Cómo está hecho
- **Lovable** (React + shadcn) para la interfaz. **Supabase** (Postgres + Edge Functions) para los datos y el backend.
- **Datos:** dataset sintético de NTT DATA (190.000 perfiles). En Supabase están cargados los 34.003 **disponibles** (En banca + Roll-off <3 meses) con todas sus columnas. Ver [`docs/DATA.md`](docs/DATA.md).
- **IA:** el LLM solo interpreta el brief y redacta explicaciones con evidencia recuperada. Los filtros, el score y los escenarios son **código determinista**.

## Frontend (`frontend/`)
La interfaz se construye en **Lovable** y vive en su propio repo, [`chechupv/orbit-talent-intelligence`](https://github.com/chechupv/orbit-talent-intelligence). Lovable no puede conectarse a un repo existente: crea uno nuevo y lo sincroniza.
En este repo, `frontend/` es una **copia sincronizada con `git subtree`** para que la entrega tenga todo junto. **No se edita aquí:** los cambios se hacen en Lovable o en su repo, y se traen con:
```powershell
git subtree pull --prefix=frontend https://github.com/chechupv/orbit-talent-intelligence.git main --squash
```

## Para el equipo y sus IAs
Empezad por **[`AGENTS.md`](AGENTS.md)**: estado del repo, tablas reales, reglas, contratos de las edge functions y reparto. El brief técnico completo está en [`docs/IDEA.md`](docs/IDEA.md) (original en `docs/ORBIT_AI_Brief_Tecnico_MVP.docx`).

## Resultados
_(Rellenar con la medición real: tiempo hasta shortlist manual frente a ORBIT, cobertura interna, etc.)_

## Datos y privacidad
Perfiles **sintéticos** proporcionados por NTT DATA. Ningún empleado real. Las claves de API solo viven como secretos de Supabase.

## Metodología ágil (reto Improven)

Trabajamos en **ciclos cortos**: en cada vuelta formulamos una hipótesis, construimos lo mínimo para comprobarla, la probamos y decidimos qué **mantener, cambiar o descartar**. El detalle de cada vuelta está en [`docs/ITERATIONS.md`](docs/ITERATIONS.md).

| Vuelta | Qué queríamos saber | Qué aprendimos | Qué decidimos |
|---|---|---|---|
| **0 · Entender el reto** | ¿Hay que *reunir* datos de las personas? | NTT DATA ya da 190.000 perfiles; el problema es **encontrar** a la persona aunque esté descrita con otra jerga | ❌ Fuera el scraper (datos disponibles y privacidad) |
| **1 · El concepto** | ¿Qué producto resuelve el caso? | El nivel de cada skill ya está en los datos; entrevistar por voz no aportaba a la decisión | 🔄 De SkillSonar a **ORBIT AI**: encontrar, validar y decidir. ❌ Fuera la voz |
| **2 · El MVP** | ¿Funciona el flujo completo con datos reales? | La primera prueba real del paso 11 descartaba todos los resúmenes de equipo | 🔄 Filtros mínimos (nadie desaparece sin motivo), coste en €/h y confirmación humana de los requisitos. 🐛 Fallo corregido (de 5 frases descartadas a 0) |
| **3 · Validar con los 3 briefs de NTT** | ¿Cumple las reglas que NTT va a evaluar? | Core banking ✅ y retail ✅; en ciberseguridad los filtros duros no se aplicaban | 📌 Pendiente: disponibilidad inmediata y años mínimos como filtro duro ([prueba](docs/PRUEBA_BRIEFS_NTT.md)) |
| **4 · Simplificar la entrada** | ¿Hace falta subir el plan en PDF? | Escribir la petición es más directo y quita un punto de fallo en la demo | ❌ Fuera la subida de PDF: la petición se escribe |

**Principios que seguimos**
- **MVP primero:** lo mínimo que resuelve el caso de punta a punta antes que funciones extra.
- **Decidir con evidencia:** cada cambio sale de una prueba (datos reales, briefs de NTT, tests), no de intuición.
- **Descartar sin miedo:** scraper, entrevista de voz, ElevenLabs y PDF quedaron fuera porque no aportaban a la decisión de staffing.
- **Honestidad:** lo simulado o pendiente se dice (por ejemplo, el fallo de ciberseguridad).

## Equipo T6
| Nombre | Rol |
|---|---|
| **Betel Díaz** | CPO · Co-founder |
| **Alejandro Fabiano** | AI Chief · Co-founder |
| **Zhijian Wu** | Chief Technology · Co-founder |
| **Samuel García** | Architecture & Cloud · Co-founder |
| **Daniel Torres** | Data Analytics · Co-founder |

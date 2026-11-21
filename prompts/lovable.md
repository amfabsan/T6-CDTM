# Prompts para Lovable (en orden)

> La lección de Republica (3.º en Múnich 2025): **iterar rápido es mejor que escribir prompts largos.** Un prompt por paso, se comprueba el resultado y se pasa al siguiente.
> El repositorio ya trae la lógica y el backend. **Lovable solo tiene que construir la interfaz y conectarla.**

## 0. Preparación (una vez)
- Proyecto nuevo en Lovable → **Connect GitHub**, que crea el repo. Copiad en él `src/lib/`, `supabase/`, `data/`, `docs/`, `scripts/` y `prompts/`, y haced push. Lovable sincroniza los cambios.
- Activad Lovable Cloud/Supabase. Ejecutad `supabase/migrations/001_schema.sql` y añadid el secreto `ELEVENLABS_API_KEY`.

## 1. Base y datos
> Build "SkillSonar", a staffing decision-support web app for a consulting firm's staffing managers. Spanish UI, clean enterprise look (deep blue palette, shadcn). Use the existing Supabase schema in `supabase/migrations/001_schema.sql`. Add an "Importar datos" page that uploads `employees.csv` and `project_history.csv` (format in `data/sample/`) into the tables; each `skills_cv` entry (split by ";") becomes an `employee_skills` row with status 'verificada' and source 'cv'. Add a "Personas" list page.

## 2. Necesidad → candidatos
> Add a "Nueva necesidad" page: a textarea for a project need or RFP excerpt; on submit call the Supabase edge function `extract` with `{mode: "requirements", text}` and show the returned `musts`, `nices` and `minAvailabilityPct` as editable chips/inputs (plus max team size, default 3). Then show candidates ranked with `rankIndividuals` from `src/lib/teamBuilder.ts` (do NOT reimplement the logic). Each card shows the person, the line from `explain()`, and per required skill a badge: green "verificada", yellow "autodeclarada", grey "sin evidencia", with the evidence quote on hover. Use `candidateLabel()` for the card label: "cumple" / "candidata para revisar" / "falta evidencia de X".

## 3. Proponer equipo (EL NÚCLEO)
> Add a prominent "Proponer equipo" button. Use `proposeTeam()` and `teamCoverage()` from `src/lib/teamBuilder.ts`. Show two columns side by side: "Top-2 del ranking" (first two of `rankIndividuals`) and "Equipo propuesto", each with a requirement × person coverage matrix where empty cells are red, and a summary "X verificados + Y pendientes + Z sin cubrir". The manager can swap any member (dropdown of eligible people) and everything recalculates live. Add "Generar borrador": an editable text with the team, who covers each requirement, their evidence and any gaps, formatted as the "Equipo propuesto" section of a proposal. Save to `team_proposals`.

## 4. Nota de voz (ElevenLabs)
> On the person profile page add a big "Grabar nota de voz" button: record up to 20 s with MediaRecorder, POST the audio as multipart field `audio` to the edge function `transcribe`, then send the returned text to `extract` with `{mode: "skills", text}`. Show a review screen with each proposed skill, project and literal quote, where the employee can confirm, edit or discard each one. Confirmed ones are inserted into `employee_skills` with status 'autodeclarada' and source 'voice', and appear with a highlight animation. Show the transcript too. Handle errors with a clear message and a "Reintentar" button.

## 5. Verificación del manager
> On a candidate or team member with an 'autodeclarada' skill, add "Verificar con histórico": use `findSupportingRecord()` from `src/lib/teamBuilder.ts` with that person's `project_history`. If a record is found, show it next to the quote and let the manager confirm; that inserts a new `employee_skills` row with status 'verificada', source 'project', `evidence_quote` = record text, and `verified_by` = 'manager'. If no record exists, keep it as pending and say so.

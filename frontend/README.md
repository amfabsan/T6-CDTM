# ORBIT Talent Intelligence

Design and build the visual identity and main screens of "ORBIT AI", an internal staffing intelligence product for NTT DATA managers. Tagline: "Find the talent. Validate the fit. Make the staffing decision." Spanish UI. It must look original and memorable — NOT a generic admin dashboard — while staying enterprise-credible and fast to read.



BACKEND RULE: do NOT create any database, tables, Lovable Cloud backend or edge functions. The backend already exists in an external Supabase project that will be connected later. Build a typed data layer in src/lib/api.ts that, when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set, calls: supabase.functions.invoke('interpret-project') (multipart field "file" with the PDF, or JSON { project_text }; returns { requirements, review, row_template, source_text }; HTTP 422 with error "pdf_sin_texto" if the PDF is scanned), supabase.from('project_requirements').insert(row_template), supabase.rpc('candidatos_proyecto', { p_project_id }) (returns per role { role_index, title, count, n_filtrados, candidates: [{ employee_id, rrf, pos_texto, pos_vector }] }) and supabase.rpc('perfil', { p_employee_id }). When those env vars are missing, fall back to realistic mock data and show a small "Datos simulados" pill. Fit %, teams, scenarios and the voice assistant are always mocked for now (also with the "Datos simulados" pill).



CONCEPT: "the project is the center of gravity". The project sits at the center; people orbit around it; the closer someone orbits, the better they fit. Use the metaphor with restraint as a signature element on key moments; every orbital view has a plain list next to it.



VISUAL SYSTEM: deep space navy background #0B1020 with layered surfaces #121A33 and #1A2447, soft 1px borders #2A3766, generous spacing, 16px radius cards, glass blur only on overlays. Accents with meaning, used consistently: electric cyan #22D3EE = AI interpretation / "ORBIT lo encontró"; lime #A3E635 = "En banca" (available now) and demonstrated evidence; amber #FBBF24 = "Roll-off próximo (<3 meses)", "solo declarada" and pending data ("Por confirmar", "Por estimar"); coral #FB7185 = gaps, missing MUST-HAVE, risks; violet #A78BFA = "Talento oculto" (from another área or sector but with relevant evidence). Typography: Space Grotesk for headings and big numbers, Inter for UI text, tabular numbers. Calm purposeful motion (animated counters, candidates easing into orbit, 150-200 ms hover lift), respect prefers-reduced-motion. AA contrast, never color alone (icon + label), keyboard navigable. Layout: left vertical stepper "1 Necesidad", "2 Talento", "3 Equipos", "4 Decisión"; top bar with project name; floating round "Pregunta a ORBIT" voice orb bottom-right (pulsing cyan ring when active, mocked for now).



THE 5 HERO MOMENTS:

1) De plan a requisitos (step 1): big drop zone "Suelta aquí el plan del proyecto (PDF)" plus "o pega el texto". While interpreting, a scanning animation over the document: "Leyendo el plan…". Results in a split view: left the plan text with highlighted phrases; right one card per role (title, "×N plazas", seniority, years) with MUST-HAVE chips (solid, with min level) and NICE-TO-HAVE chips (outlined, note "suman, nunca excluyen"). Jargon translation: a thin cyan connector from a highlighted phrase to the chip it became (e.g. "orquestación de contenedores" → Kubernetes). A "Revisión" panel lists the review[] items (eliminado / corregido / revisar + reason): make it visible, it is a trust feature. Project chips: client sector, country, modality (remoto / híbrido / presencial), "país exigido". Everything editable. Button "Confirmar y buscar talento". Friendly state for pdf_sin_texto: "Este PDF parece escaneado. Pega el texto del plan y seguimos."

2) El embudo (top of step 2, per role tab): horizontal funnel with big animated numbers "34.003 disponibles" → "{n_filtrados} pasan los requisitos obligatorios" → "200 más parecidos" → "Top {N}", with the rules as small chips under each stage (disponibilidad, años, idioma ≥ B2, certificación, ubicación según modalidad). Make clear that skills never exclude anyone.

3) El mapa orbital (step 2): radial view with the role at the center and candidates as dots; distance = fit, dot color = availability (lime / amber), violet halo = talento oculto; hover preview with name, fit %, availability and top evidence. Next to it the ranked list with "Mostrar: Top 3 / Top 5 / Top 10" and "Encaje mínimo (%)". Candidate card: big fit %, segmented score breakdown bar, evidence chips (skill + nivel + años, project + year, certification), coral "Hueco" chips for missing MUST-HAVE, and a badge "Encontrado por significado" when pos_vector is good but pos_texto is null or much worse. Compare up to 4 side by side.

4) Top 5 equipos (step 3): cards like mission patches with members by role, fit %, estimated cost (tag "supuesto"), start ("Día 0" or "Por confirmar") and a ring gauge "Continuidad tras una baja" with "Si se va {nombre}, quedan {x} de {y} roles · sustituto: {nombre o ninguno}". Sort pills Encaje / Coste / Inicio / Continuidad; filters presupuesto máximo, encaje mínimo, fecha límite, continuidad mínima; "Equipo ideal" badge; pending data in amber sorted last.

5) La decisión (step 4): three tall columns Internal / External / Hybrid, winner elevated with cyan outline and one sentence "Por qué gana"; every number tagged "dato", "supuesto" or "calculado"; assumptions panel slides in from the right with live sliders.



DATA HONESTY: availability text exactly as stored ("En banca", "Roll-off próximo (<3 meses)"), never a date; no money without the "supuesto" tag; never invent certifications ("Sin certificaciones").



DELIVERABLES NOW: the design system on a route "/design" showing all components (tokens, chips, badges, cards, funnel, ring gauge, orbit); the app shell; step 1 complete; step 2 with funnel + orbit map + list. Use mock data for a Spanish bank payments project with roles "Arquitecto cloud senior ×1", "Desarrollador backend Java ×2", "Especialista de seguridad ×1". Keep components reusable.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a90e73f0-77a7-48fb-8512-ba7f783ec672).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

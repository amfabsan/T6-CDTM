# Ideas de Samuel para SkillSonar (propuesta, para comentar)

> Esto **no cambia el plan**: son añadidos sobre `docs/IDEA.md` y `src/lib/teamBuilder.ts`, ordenados por impacto. Cada uno indica dónde encaja y si es HOY o DESPUÉS.

## 1. ⚠️ `proposeTeam` no termina con los datos reales (HOY)
Con el brief de ciberseguridad quedan **766** elegibles (ver `DATA.md`). C(766, 2) ≈ 293.000 parejas, más que `maxCombos = 200_000`: la búsqueda se corta antes de terminar las parejas y **nunca llega a los tríos**. Con los 42 perfiles de la muestra no se nota.

**Solución:** podar antes de combinar.
1. Para cada obligatorio, quedarse con los **K = 15 mejores** que lo cubren (orden: verificada > autodeclarada, después nivel, años y año del último proyecto).
2. Pool = unión sin duplicados (≤ 15 × nº de obligatorios; con 3 obligatorios, ≤ 45 personas).
3. C(45, 3) ≈ 14.000 combinaciones → instantáneo, y sigue siendo exhaustivo **dentro del pool**. Hay que decirlo así en el pitch: "exhaustivo entre los mejores 15 por requisito".

## 2. Equipos por **rol**, sin repetir persona (HOY si da tiempo; es lo que más le interesa a NTT)
El caso dice textualmente: *"for a single brief, propose one ranked list of candidates per role, without repeating the same person in two roles"*. El brief de **core banking** es multi-rol. Ahora mismo `StaffingRequest` tiene `musts` del equipo, pero no roles.
- Añadir `roles: [{nombre, musts, nices}]` al JSON que extrae el LLM.
- Ranking por rol con la lógica actual. Después, asignación global para que nadie salga en dos roles. Con pocos roles, sirve un greedy: primero el rol con menos candidatos válidos (el "más crítico" del caso).

## 3. Cobertura con **calidad**, no solo sí/no (HOY, cambio pequeño)
Ahora una skill a **nivel 1** cubre igual que una a nivel 5. El caso pide distinguir *"experiencia superficial de experiencia relevante"*.
- Umbral mínimo para cubrir un obligatorio: `nivel ≥ 3` **o** demostrada en un proyecto. Por debajo cuenta como "superficial", en ámbar.
- Desempate entre equipos que cubren lo mismo: cobertura graduada con rendimientos decrecientes `cover = 1 − ∏(1 − s)`, con `s` derivado de nivel, años y recencia. Así dos personas que se complementan ganan a dos que repiten lo mismo, también cuando las dos parejas "cubren todo".

## 4. **A quién preguntar por voz**: solo si cambia la decisión (HOY, refuerza ElevenLabs)
En vez de "cualquiera puede grabar una nota", el sistema **elige** a quién pedírsela. La lista "Pedir nota de voz a…" la ordena por cuánto subiría la cobertura del equipo si se confirmara el dato que falta (p. ej. Ana: si confirma Azure, el equipo pasa de 2/3 a 3/3). Es la historia de Ana, pero contada como **algo que propone el sistema**, no como suerte.

## 5. Coste y "contratar o formar" (versión ligera HOY, completa DESPUÉS)
Era una de las ideas iniciales del equipo y responde al 25 % de negocio:
- Tabla de tarifas €/h por `nivel_seniority` × `pais`, **visible y marcada como estimación** (el dataset no trae coste).
- En la propuesta: coste del equipo interno frente a **contratar fuera** (coste de selección + ~3 meses hasta incorporarse).
- Si un obligatorio queda en ⚪ con todo el pool: tarjeta "**Contratar** perfil X" o "**Formar** a <la persona más cercana>" (quien tiene skills relacionadas del mismo área).

## 6. Riesgos por candidato y por equipo (HOY, casi gratis)
El caso pide *"say what risk there is"*. Con los datos de `DATA.md`:
- Persona: nivel y años que no cuadran, `Roll-off próximo`, skill solo declarada, último proyecto con esa skill > 3 años.
- Equipo: **bus factor**, un obligatorio que solo cubre una persona.

## 7. Historial de cambios en la ficha (DESPUÉS, contarlo en el pitch)
Una tabla `eventos(employee_id, campo, valor, fuente, cita, fecha)`: cada nota de voz o verificación queda trazada y se puede deshacer. Los datos tienen caducidad: una disponibilidad de hace más de 30 días se marca para revisar. Es la respuesta a "¿cómo escala a 190k sin recalcularlo todo?": solo se recalcula quien cambia.

## 8. Los 3 briefs de prueba como test (HOY)
Ampliar `scripts/verify_demo.ts` con los tres briefs de NTT:
- **Ciberseguridad:** nadie Asignado ni con < 3 años en el resultado.
- **Retail:** "no imprescindible" no elimina a nadie.
- **Core banking:** se detecta el implícito de banca y nadie sale en dos roles.

Es la prueba que enseñar si el jurado pregunta "¿cómo sabéis que funciona?".

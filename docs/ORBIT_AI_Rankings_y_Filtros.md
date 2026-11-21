# Ranking de perfiles y equipos

> Versión en Markdown de [`ORBIT_AI_Rankings_y_Filtros.pdf`](ORBIT_AI_Rankings_y_Filtros.pdf) (ORBIT AI / Equipo T6 · Especificación funcional · CDTM Valencia Hacks 2026 · Caso NTT DATA).

ORBIT AI · Controles para seleccionar perfiles y comparar las cinco mejores propuestas de un mismo proyecto.

## 1 · Filtrar el ranking de perfiles

**Ubicación.** Mostrar los controles justo después del porcentaje de encaje y encima de la lista de perfiles.

**Controles propuestos.** «Mostrar: Top 3 / Top 5 / Top 10» (Top 5 por defecto) y «Encaje mínimo (%)». Orden inicial por encaje de mayor a menor.

**Comportamiento.** Aplicar primero los requisitos obligatorios. Después, filtrar por el porcentaje mínimo, ordenar por encaje y limitar la lista al Top N. Si hay menos resultados, mostrar cuántos cumplen. Mantener visibles el porcentaje, la evidencia y los requisitos pendientes.

## 2 · Top 5 de equipos para el proyecto

Generar combinaciones que cubran los roles obligatorios con personas distintas y elegibles. Cada tarjeta muestra integrantes por rol, encaje, coste, fecha estimada de inicio y continuidad ante una baja.

| Criterio | Cómo se calcula | Orden y filtro |
|---|---|---|
| **Coste empresarial** | Sumar tarifa interna por hora × horas planificadas por persona para el mismo periodo. Usar supuestos editables cuando falten tarifas. | Menor primero. Presupuesto máximo. |
| **Encaje (%)** | Media de los porcentajes de encaje de los integrantes en sus roles. Ponderar por prioridad del rol únicamente si el proyecto indica pesos. | Mayor primero. Encaje mínimo. Primero: equipo ideal. |
| **Inicio del proyecto** | Primera fecha en la que pueden empezar todos los roles obligatorios, según las disponibilidades confirmadas y la fecha mínima del proyecto. | Más próximo primero. Fecha límite de inicio. |
| **Riesgo ante una baja** | Retirar a cada integrante por turno y comprobar qué roles pueden seguir cubiertos dentro de plazo con sustitutos elegibles. Mostrar el peor caso. | Menor riesgo primero. Umbral de continuidad. |

> **Cómo se actualiza el Top 5.** Aplicad los filtros al conjunto de equipos válidos, ordenad por el criterio elegido y mostrad hasta cinco. El orden inicial es por encaje. En empate, usad mayor encaje y después un ID estable.

## 3 · Medir la continuidad ante una baja

**Simulación.** Retirad a una persona cada vez. Reasignad los roles con las personas restantes y suplentes elegibles antes de la fecha límite. Respetad los mínimos de cada rol y evitad duplicar personas.

**Métrica.** Para cada baja, calculad roles obligatorios cubiertos ÷ total de roles obligatorios × 100. Mostrad la menor cobertura obtenida como «Continuidad tras una baja (%)». A mayor continuidad, menor riesgo.

**Qué debe verse.** Si el peor caso deja 2 de 3 roles cubiertos, mostrad «67 % de continuidad», el rol afectado y si tiene sustituto. El 100 % indica que todos los roles siguen cubiertos en cada escenario probado.

> **Tratamiento de datos pendientes.** Mostrad «Por estimar» si faltan tarifas y «Por confirmar» si falta una fecha. Un roll-off próximo indica una ventana, sin día confirmado. Ordenad los pendientes al final. Si un filtro activo depende de un dato pendiente, mostrad esos equipos aparte.

## 4 · Ejemplo de ordenación

| Equipo | Coste estimado | Encaje | Inicio | Continuidad |
|---|---:|---:|---|---:|
| A · Mayor encaje | 4.600 € | 96 % | Día 6 | 67 % |
| B · Inicio y continuidad | 4.200 € | 92 % | Día 4 | 100 % |
| C · Menor coste | 3.900 € | 89 % | Día 8 | 67 % |

*Ejemplo ilustrativo para un proyecto de tres roles. Los importes y plazos son supuestos.*

## 5 · Pruebas de aceptación

- [ ] **Perfiles.** Top 3 con mínimo del 80 % devuelve hasta tres personas elegibles, ordenadas de mayor a menor encaje.
- [ ] **Equipos.** Con presupuesto máximo de 4.300 € y encaje mínimo del 90 %, el ejemplo deja solo al equipo B.
- [ ] **Continuidad.** Si falla el único perfil capaz de cubrir un rol antes del inicio, aparece el hueco y baja la continuidad calculada.
- [ ] **Consistencia.** Al cambiar el orden se vuelve a consultar el conjunto de equipos válidos. Los equipos pendientes quedan identificados y cada integrante ocupa una sola plaza.

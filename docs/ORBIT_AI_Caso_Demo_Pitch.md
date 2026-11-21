# ORBIT AI · Caso de demo para el pitch

**Migración de un core bancario a Azure.** El reto para el responsable de staffing es cubrir tres plazas con talento interno y decidir si da prioridad al encaje técnico, al coste, al inicio o a la continuidad del proyecto ante una baja.

Todos los perfiles, fechas, tarifas y puntuaciones de esta prueba son **hipotéticos**. Los porcentajes precalculados sirven para probar el ranking y obtener salidas reproducibles. Para probar el matching en ejecución, pegad el briefing e inspeccionad los requisitos y las evidencias que genera ORBIT. Los porcentajes del modelo en esa prueba pueden variar.

## 1. Briefing para pegar en ORBIT

> Tenemos que migrar un core bancario a Microsoft Azure y queremos arrancar entre el 23 y el 27 de noviembre de 2026, lo antes posible. Necesitamos tres personas distintas, una por plaza, con 40 horas cada una para el primer bloque.
>
> Buscamos un arquitecto cloud con al menos cuatro años de experiencia profesional, conocimientos de Azure y experiencia en proyectos de banca. La orquestación de contenedores es deseable. Buscamos también un perfil backend con al menos tres años de experiencia profesional y experiencia en C#, .NET y SQL Server. La experiencia en banca se valora, pero no es esencial para este rol. Por último, necesitamos un especialista de seguridad cloud con al menos cuatro años de experiencia profesional y conocimientos de Azure y gestión de identidades y accesos.
>
> Queremos comparar las propuestas por coste, encaje, fecha de inicio y capacidad de mantener la cobertura si se pierde a un integrante. Para la simulación, necesitamos que el sustituto pueda incorporarse el mismo día de inicio anunciado para ese equipo.

**Validación del briefing.** Debe producir tres roles. `IAM` equivale a «gestión de identidades y accesos». `Kubernetes` puede respaldar la preferencia de «orquestación de contenedores». La experiencia en banca es obligatoria para Arquitectura y deseable para Backend. Los años indicados son de experiencia profesional total.

## 2. Perfiles y evidencias para mostrar

- **Inés (B1)** es Backend de Software Engineering, su sector principal es Seguros y su historial incluye «Migración a la nube de core bancario», donde trabajó con C#, .NET y SQL Server. Abrid ese registro. El historial explica por qué aparece aunque una búsqueda por sector principal «Banca y Finanzas» la perdería.
- **Pablo (B2)** sigue siendo elegible para Backend porque la banca es deseable y cumple los requisitos técnicos.
- **Carlos (X1)** queda excluido de Arquitectura porque está asignado y carece de fecha de disponibilidad confirmada. **Julia (X2)** queda excluida de Backend porque tiene dos años de experiencia y se piden tres. Sus puntuaciones de prueba son altas para que una implementación defectuosa no pueda pasar inadvertida.
- En el ranking Backend, activad **Top 3 y encaje mínimo del 90 %**. El resultado esperado es **B1 (96 %) y B2 (91 %)**. Mostrad ambos sin rellenar la tercera plaza.

## 3. Top 5 de equipos y resultados esperados

Formad todas las combinaciones válidas a partir de los candidatos elegibles por rol. Tres personas por equipo, una plaza por persona. Hay **9 candidatos elegibles y 27 equipos viables** en esta prueba. Aplicad los filtros al conjunto de 27, ordenad y tomad los primeros cinco.

- **Encaje:** media simple de los tres porcentajes por rol. Conservad el valor sin redondear para ordenar. En empate, usad mayor encaje como criterio secundario si procede y el ID de equipo como desempate final. El ID concatena los IDs en el orden Arquitectura, Backend y Seguridad.
- **Coste:** suma de horas × tarifa por integrante, para el mismo bloque de 40 h por plaza.
- **Inicio:** la primera fecha en que las tres personas pueden empezar. Para esta prueba equivale al máximo de sus fechas de disponibilidad y la fecha mínima del briefing.
- **Continuidad:** simulad la ausencia de cada integrante y recalculad cuántas plazas pueden seguir cubiertas con personas distintas y elegibles **a la fecha de inicio original del equipo**. Mostrad el peor resultado, sobre tres plazas. Ordenad de mayor continuidad a menor, con mayor encaje como desempate. El plazo se fija para cada equipo al ejecutar su simulación.

| Orden elegido | Equipo que debe salir primero | Encaje | Coste estimado | Inicio | Peor cobertura ante una baja |
|---|---|---:|---:|---|---:|
| Mayor encaje | A1 + B1 + S1 | 98,33 % | 11.800 € | 24/11 | 2/3 |
| Menor coste | A3 + B3 + S3 | 86,00 % | 7.800 € | 26/11 | 3/3 |
| Inicio más temprano | A1 + B1 + S2 | 95,33 % | 10.800 € | 23/11 | 2/3 |
| Menor riesgo | A2 + B1 + S1 | 96,67 % | 11.000 € | 25/11 | 3/3 |

**Top 5 exacto por cada criterio**

- **Mayor encaje:** `A1+B1+S1`, `A1+B2+S1`, `A2+B1+S1`, `A1+B1+S2`, `A2+B2+S1`.
- **Menor coste:** `A3+B3+S3`, `A3+B2+S3`, `A3+B1+S3`, `A3+B3+S2`, `A3+B2+S2`.
- **Inicio más temprano:** `A1+B1+S2`, `A1+B3+S2`, `A1+B1+S1`, `A1+B2+S1`, `A1+B3+S1`.
- **Menor riesgo:** `A2+B1+S1`, `A2+B2+S1`, `A3+B1+S1`, `A1+B1+S3`, `A2+B1+S2`.

## 4. La decisión central del pitch

1. **Ordenar por mayor encaje.** Sale primero **Alicia + Inés + Sara**, con **98,33 %**, **11.800 €** y arranque el **24/11**. Si Alicia se cae, Marcos, su primer sustituto elegible, está disponible el **25/11**. Se mantienen **2 de 3 plazas** para el arranque anunciado.
2. **Ordenar por menor riesgo.** Sale primero **Marcos + Inés + Sara**, con **96,67 %**, **11.000 €** y arranque el **25/11**. A esa fecha, **Alicia puede cubrir a Marcos**, **Pablo puede cubrir a Inés** y **Diego puede cubrir a Sara**. En cada simulación individual quedan **3 de 3 plazas** cubiertas.
3. **Explicar la elección.** Con un día adicional de margen, esta alternativa mantiene la cobertura ante cualquiera de las tres bajas simuladas y cuesta **800 € menos** en el bloque de prueba. Cede **1,67 puntos porcentuales de encaje**. El equipo más barato cuesta **7.800 €** y el más rápido arranca el **23/11**. La elección depende de la prioridad del responsable.

**Si ya funciona la opción híbrida:** simulad la baja de Alicia con la fecha del 24/11 fija. El escenario interno deja Arquitectura sin cubrir ese día. Con el supuesto de un arquitecto externo elegible el 24/11 a **150 €/h × 40 h**, el híbrido cubre **3 de 3 plazas** por **13.600 €** en total (Inés 3.200 €, Sara 4.400 €, Arquitectura externa 6.000 €). Si la incorporación externa sigue sin confirmarse, mostradlo como escenario condicionado.

## 5. Checklist de aceptación para programadores

| Acción | Resultado esperado |
|---|---|
| Pegar el briefing | Tres roles. IAM se reconoce desde su descripción. Banca se trata como preferencia para Backend. |
| Buscar Backend y filtrar Top 3 con mínimo 90 % | Dos resultados, B1 y B2. X1 y X2 no aparecen en equipos válidos. |
| Abrir la evidencia de B1 | Aparece el proyecto bancario y las tres tecnologías documentadas. |
| Cambiar entre los cuatro órdenes | Cada lista devuelve los cinco equipos esperados y muestra métricas consistentes. |
| Filtrar encaje ≥ 96 % y coste ≤ 11.000 € | Solo `A2+B1+S1`. Los límites son inclusivos. |
| Simular la baja de A1 en el equipo de mayor encaje | Falta Arquitectura el 24/11. Aparece A2 como sustituto tardío, el 25/11. |
| Adelantar A2 al 24/11 y recalcular | `A1+B1+S1` pasa a **3/3** de continuidad y queda primero por menor riesgo. |
| Ofrecer el mismo ID para dos roles en una prueba puntual | Una persona nunca ocupa dos plazas en una propuesta ni en una sustitución. |

## 6. Guion para narrar la demo (80 segundos)

- **0–20 s.** «Pego una necesidad de migración bancaria y ORBIT la convierte en tres puestos. Aquí separa lo obligatorio de lo deseable».
- **20–35 s.** «Inés está en Seguros, pero ORBIT encuentra este proyecto de core bancario y muestra las tecnologías que usó. Ahora puedo revisar y comparar la evidencia».
- **35–70 s.** «Este equipo tiene el mayor encaje. Si perdemos a la arquitecta, su sustituto llega un día tarde. Al ordenar por menor riesgo, sube otra propuesta que permite mantener las tres plazas cubiertas. En este caso simulado, empieza un día después y cuesta 800 euros menos».
- **70–80 s.** «Con el mismo briefing podemos elegir según lo que más importa hoy: encaje, coste, fecha o continuidad». Para la diapositiva de impacto, añadid el tiempo que midáis realmente desde que se pega el briefing hasta que hay una propuesta revisable.

## 7. Datos para importar o sembrar en pruebas

Adaptad los nombres de campos al modelo existente. Usad `fixture_match` como entrada del motor determinista de pruebas, y ejecutad la extracción del briefing y la evidencia por separado para verificar el flujo real.

```json
{
  "metadata": {"scenario":"ORBIT AI — Migración de core bancario","data_kind":"fictional_demo","currency":"EUR","scope":"primer bloque de trabajo","date_policy":"fechas de disponibilidad simuladas","score_policy":"puntuaciones de referencia inyectadas únicamente en prueba determinista"},
  "project": {
    "name": "Migración de core bancario a Azure",
    "earliest_start": "2026-11-23",
    "latest_start": "2026-11-27",
    "roles": [
      {"id":"ARQ","label":"Arquitectura cloud","min_total_years":4,"required_skills":["Azure"],"required_project_sector":"Banca y Finanzas","preferred_skills":["Kubernetes"],"planned_hours":40},
      {"id":"BACK","label":"Backend .NET","min_total_years":3,"required_skills":["C#",".NET","SQL Server"],"preferred_project_sector":"Banca y Finanzas","planned_hours":40},
      {"id":"SEG","label":"Seguridad cloud","min_total_years":4,"required_skills":["Azure","IAM"],"planned_hours":40}
    ]
  },
  "profiles": [
    {"id":"A1","name":"Alicia","candidate_role":"ARQ","primary_sector":"Banca y Finanzas","area":"Cloud","total_years":8,"skills":["Azure","Kubernetes"],"available_on":"2026-11-23","availability":"confirmada","cost_per_hour":105,"fixture_match":99,"project_evidence":{"name":"Migración de pagos","sector":"Banca y Finanzas","skills":["Azure","Kubernetes"]}},
    {"id":"A2","name":"Marcos","candidate_role":"ARQ","primary_sector":"Banca y Finanzas","area":"Cloud","total_years":7,"skills":["Azure","Kubernetes"],"available_on":"2026-11-25","availability":"confirmada","cost_per_hour":85,"fixture_match":94,"project_evidence":{"name":"Plataforma bancaria en Azure","sector":"Banca y Finanzas","skills":["Azure","Kubernetes"]}},
    {"id":"A3","name":"Eva","candidate_role":"ARQ","primary_sector":"Banca y Finanzas","area":"Cloud","total_years":5,"skills":["Azure"],"available_on":"2026-11-26","availability":"confirmada","cost_per_hour":60,"fixture_match":87,"project_evidence":{"name":"Modernización de servicios bancarios","sector":"Banca y Finanzas","skills":["Azure"]}},
    {"id":"B1","name":"Inés","candidate_role":"BACK","primary_sector":"Seguros","area":"Software Engineering","total_years":5,"skills":["C#",".NET","SQL Server"],"available_on":"2026-11-23","availability":"confirmada","cost_per_hour":80,"fixture_match":96,"project_evidence":{"name":"Migración a la nube de core bancario","sector":"Banca y Finanzas","skills":["C#",".NET","SQL Server"]}},
    {"id":"B2","name":"Pablo","candidate_role":"BACK","primary_sector":"Sector Público","area":"Software Engineering","total_years":5,"skills":["C#",".NET","SQL Server"],"available_on":"2026-11-24","availability":"confirmada","cost_per_hour":70,"fixture_match":91,"project_evidence":{"name":"Portal de servicios públicos","sector":"Sector Público","skills":["C#",".NET","SQL Server"]}},
    {"id":"B3","name":"Lucía","candidate_role":"BACK","primary_sector":"Seguros","area":"Software Engineering","total_years":4,"skills":["C#",".NET","SQL Server"],"available_on":"2026-11-23","availability":"confirmada","cost_per_hour":65,"fixture_match":84,"project_evidence":{"name":"Plataforma de siniestros","sector":"Seguros","skills":["C#",".NET","SQL Server"]}},
    {"id":"S1","name":"Sara","candidate_role":"SEG","primary_sector":"Banca y Finanzas","area":"Ciberseguridad","total_years":8,"skills":["Azure","IAM"],"available_on":"2026-11-24","availability":"confirmada","cost_per_hour":110,"fixture_match":100,"project_evidence":{"name":"Control de acceso a pagos","sector":"Banca y Finanzas","skills":["Azure","IAM"]}},
    {"id":"S2","name":"Diego","candidate_role":"SEG","primary_sector":"Seguros","area":"Ciberseguridad","total_years":6,"skills":["Azure","IAM"],"available_on":"2026-11-23","availability":"confirmada","cost_per_hour":85,"fixture_match":91,"project_evidence":{"name":"Identidades en Azure","sector":"Seguros","skills":["Azure","IAM"]}},
    {"id":"S3","name":"Nora","candidate_role":"SEG","primary_sector":"Retail","area":"Ciberseguridad","total_years":5,"skills":["Azure","IAM"],"available_on":"2026-11-26","availability":"confirmada","cost_per_hour":70,"fixture_match":87,"project_evidence":{"name":"Accesos de plataforma retail","sector":"Retail","skills":["Azure","IAM"]}},
    {"id":"X1","name":"Carlos","candidate_role":"ARQ","primary_sector":"Banca y Finanzas","area":"Cloud","total_years":10,"skills":["Azure","Kubernetes"],"available_on":null,"availability":"asignado","cost_per_hour":90,"fixture_match":100,"project_evidence":{"name":"Infraestructura core bancario","sector":"Banca y Finanzas","skills":["Azure","Kubernetes"]}},
    {"id":"X2","name":"Julia","candidate_role":"BACK","primary_sector":"Banca y Finanzas","area":"Software Engineering","total_years":2,"skills":["C#",".NET","SQL Server"],"available_on":"2026-11-23","availability":"confirmada","cost_per_hour":55,"fixture_match":99,"project_evidence":{"name":"Servicios de banca digital","sector":"Banca y Finanzas","skills":["C#",".NET","SQL Server"]}}
  ],
  "external_assumption": {"role":"ARQ","available_on":"2026-11-24","cost_per_hour":150,"planned_hours":40,"confirmed":false}
}
```

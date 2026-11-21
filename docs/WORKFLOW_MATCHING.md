# Workflow propuesto: matching de perfiles y equipos

> **Propuesta, no implementada.** Adapta a nuestro stack (Supabase/Postgres) el flujo que sale de la investigación de casos similares. Encaja con [`AGENTS.md`](../AGENTS.md) §4-5 y con [`ORBIT_AI_Rankings_y_Filtros.pdf`](ORBIT_AI_Rankings_y_Filtros.pdf).
> La investigación recomendaba Python + Parquet + DuckDB + FAISS. Como los datos ya están en Supabase, se mantiene Postgres y se añade **pgvector** (Supabase lo incluye).

## Resumen

```
brief del manager
  → 1. interpret-project (LLM): requisitos por rol con el vocabulario cerrado
  → 2. filtros duros (SQL): solo campos estructurados
  → 3. búsqueda híbrida (SQL): full-text + embeddings, fusionados con RRF → top 200 por rol
  → 4. score determinista (TS, sin LLM) → ranking de perfiles por rol
  → 5. equipos (TS): pool 8-10 por rol, beam search → top 15 → la UI muestra el Top 5
  → 6. explicación (LLM): solo con la evidencia recuperada
```

## 1. Interpretar el brief (LLM)
- Salida por rol del equipo: `roles` (de los 87 del dataset), `seniority`, `mandatory_skills[{name,min_level}]`, `desirable_skills`, `sector_experience`, `languages[{name,level}]`, `certifications`, `min_years_experience`, `count` (cuántas personas).
- Skills **solo** de las 614 de `catalogo_skills`. Así la «otra jerga» del brief se traduce aquí; por ejemplo, «orquestación de contenedores» pasa a Kubernetes.

## 2. Filtros duros y elegibilidad
**Solo excluye lo inequívoco: estar `Asignado`.** Todo lo ambiguo (que falte una skill, años, seniority, idioma, certificación, país) **no excluye**: sale como gap y resta en el score.

- **Elegible** = no Asignado **y** score > mínimo (0 por defecto) **y** al menos una skill pedida. Después se recalculan el ranking y los equipos con los elegibles.
- Cada excluido queda anotado con su motivo y su score (`excluded[rol]`); nadie desaparece sin explicación.
- Un caso concreto puede endurecer filtros (`strict` en `matching/scoring.py`: `min_years`, `seniority`, `languages`, `certifications`, `country`), por ejemplo el caso demo, que pide excluir por años.

| Puede excluir (si se activa) | Columna |
|---|---|
| Disponibilidad: `Asignado` (activo por defecto) | `empleados.disponibilidad` |
| Años mínimos | `empleados.anios_experiencia` |
| País exigido | `empleados.pais` |
| Idiomas con nivel mínimo | `idiomas` (A1 < … < C2 < Nativo) |
| Seniority | `empleados.nivel_seniority` |
| Certificación **obligatoria** | `certificaciones` |

## 3. Búsqueda híbrida dentro de los que pasan el filtro (SQL)
- **Embeddings** `paraphrase-multilingual-MiniLM-L12-v2` (384 dim, multilingüe):
  - se calculan **una vez, offline**, con un script Python, para las 614 skills, los 87 roles y un texto corto por perfil: rol + skills + último proyecto;
  - se guardan en columnas `vector(384)` de pgvector.
- **Vector de la consulta:** la media de los vectores de las skills y los roles pedidos. La edge function no necesita ejecutar el modelo.
- **Full-text:** `tsvector` sobre el mismo texto. En Postgres es `ts_rank_cd`, no BM25 puro; para este vocabulario cerrado basta.
- **Fusión con RRF** (k = 20). Se recuperan 200 por rol y la búsqueda vectorial solo corre sobre los IDs filtrados, que son como mucho 34k: escaneo exacto, sin índice ANN.
- Se entrega como una migración nueva (`003`) con una RPC `buscar_candidatos(...)`.

## 4. Score por candidato y rol (determinista)
Módulo TS puro y testeable, que reutiliza la edge function `match-candidates`.

| Componente | Peso |
|---|---|
| Skills obligatorias (nivel / nivel pedido × confianza) | 35 % |
| Evidencia demostrada en proyectos/experiencia (`demostrada`, `n_proyectos`) | 20 % |
| Sector (`sectores_proyectos`, talento oculto) y rol | 15 % |
| Seniority y años | 10 % |
| Deseables | 10 % |
| Idiomas y certificaciones | 5 % |
| Recencia (`ultimo_anio`) | 5 % |

- **Confianza por skill:**
  - demostrada en ≥ 2 proyectos: 1;
  - demostrada: 0,85;
  - solo declarada: 0,6.
- **Penalización:** ×0,7 si nivel y años no cuadran (≥ 3 años a nivel 1, o nivel ≥ 4 con < 1 año).
- **Salida:** score 0-100 con desglose, más `gaps`, `risks` (Roll-off, solo declarada, incoherencia, uso antiguo, sector, idioma) y `evidence` (proyectos concretos). Esto alimenta el «encaje (%)» y los controles Top N / encaje mínimo de la UI.

## 5. Equipos
- Pool de 8-10 mejores por rol. Beam search hueco a hueco y top 15 equipos; la UI filtra, ordena y muestra 5 según el PDF de rankings.
- Una persona puede repetirse **entre** equipos, pero no en dos roles del **mismo** equipo.
- Encaje del equipo: media del encaje de sus integrantes.
- Coste, inicio y continuidad ante una baja, según el PDF, se calculan sobre esos equipos con supuestos editables. La continuidad reutiliza el pool: al retirar a una persona, se busca un sustituto elegible del mismo rol.

## 6. Explicación (LLM)
El LLM redacta fortalezas y gaps **solo** con `evidence`, `gaps` y `risks`. Se valida que todo proyecto citado existe en el perfil.

## Prueba de aceptación propuesta
Petición: *banco español, app de pagos; 1 arquitecto cloud senior, 2 backend, 1 seguridad; remoto desde España; inglés; Kubernetes deseable*.
- Filtros: disponible, `pais = España`, inglés ≥ B2; para el arquitecto, además, seniority ≥ Senior. «Remoto» no filtra, porque `modalidad_trabajo` es la preferencia del empleado.
- Esperado: ranking por rol con gaps visibles, sector banca puntuando (incluido el talento oculto) y top de equipos sin persona repetida dentro de un equipo.

## Qué cambia en el repo si se aprueba
1. `supabase/migrations/003_busqueda_hibrida.sql`: pgvector, tablas de búsqueda y RPC `buscar_candidatos` / `perfiles`.
2. `scripts/build_embeddings.py`: se relanza tras cada carga.
3. `supabase/functions/_shared/scoring.ts` y `teams.ts`, con tests.
4. `AGENTS.md` §5: actualizar pesos y pipeline de `match-candidates`, porque los pesos actuales (40/20/10/15/5/10) pasan a 35/20/15/10/10/5/5.

Hay un borrador de los cuatro puntos probado en local: la migración, la carga de 34.003 perfiles y los tests del score y del beam search. Se sube en otro PR si el plan se aprueba.

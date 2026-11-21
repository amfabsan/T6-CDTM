# Dataset de NTT DATA: estructura y hallazgos

**Fuente:** `data/profiles.parquet` (30 MB). NTT DATA lo entregó para el caso *AI Talent Matcher* y las reglas están en `case/caso.pdf`.
**Contenido:** 190.000 perfiles **sintéticos**, uno por fila. Ninguno corresponde a un empleado real, así que no hay restricciones de privacidad.

Todas las cifras de este documento salen de consultas DuckDB sobre el Parquet completo.

## Archivos legibles

| Archivo | Qué es |
|---|---|
| [`data/sample/profiles_sample.json`](../data/sample/profiles_sample.json) | **42 perfiles completos** elegidos a propósito, con todos los campos anidados. Cada uno lleva `_por_que_en_muestra`, un campo que **no viene en el original** y explica por qué se eligió. |
| [`data/sample/profiles_sample.csv`](../data/sample/profiles_sample.csv) | Los mismos 42 perfiles aplanados, para abrir en Excel. Skills, proyectos, certificaciones e idiomas van en una columna de texto cada uno. |
| [`data/sample/vocabulario.json`](../data/sample/vocabulario.json) | Catálogos completos: las 614 skills con su número de perfiles y su área más frecuente, roles por área, sectores, las 100 certificaciones, metodologías, idiomas y valores de disponibilidad. Sirve tal cual para el prompt del LLM. |

**Qué incluye la muestra:** 1 perfil aleatorio por área (12) y casos pensados para los 3 briefs de prueba:
- **Ciberseguridad:** 4 que pasan los filtros, y 6 que no pasan por tener menos de 3 años, estar en Roll-off o estar Asignado.
- **Core banking:** cloud con proyectos de banca (4) y Functional Consultant de Banca (2).
- **Talento oculto (4):** perfiles de otra área y otro sector que sí tienen proyectos de banca con skills cloud.
- **IA para retail:** 3 con proyectos de retail y 1 sin ellos.
- **Riesgos:** perfiles con nivel y años que no cuadran (5) y con skills solo declaradas (1).

El script que genera la muestra es `scripts/make_sample.py`. Es local, porque `scripts/` está en `.gitignore`.

## Esquema (28 columnas)

### Identidad
| Columna | Tipo | Ejemplo / valores |
|---|---|---|
| `employee_id` | texto | `NTT0000001` … `NTT0190000` (único) |
| `nombre`, `apellidos`, `nombre_completo` | texto | `Rocco Durante` |
| `email` | texto | `rocco.durante@nttdata.com` (único) |
| `pais` | texto | 15+ países; España 104k, México 12k, Brasil 10k, India 10k… |
| `ciudad` | texto | 63 ciudades |

### Posición
| Columna | Tipo | Valores |
|---|---|---|
| `area` | texto | 12 áreas (ver abajo) |
| `rol` | texto | 87 roles; cada rol pertenece a **una sola** área |
| `nivel_seniority` | texto | Trainee (1,4k) · Junior (31k) · Mid (61k) · Senior (49k) · Lead (29k) · Principal (19k) |
| `puesto_actual` | texto | Seniority + rol, p. ej. `Lead Full Stack Developer` (458 distintos) |

### Carrera
| Columna | Tipo | Valores |
|---|---|---|
| `anios_experiencia` | entero | 0–38, media 7,2. **32.468 perfiles tienen <3** (relevante para el filtro de ciberseguridad) |
| `anios_en_ntt` | decimal | 0–38,5 (hay algún `-0.0`, que equivale a 0) |
| `fecha_incorporacion` | texto ISO | `1988-05-05` … `2026-11-17` |
| `sector_principal` | texto | 10 sectores (ver abajo) |

### Disponibilidad
| Columna | Tipo | Valores |
|---|---|---|
| `disponibilidad` | texto | `Asignado` 156.0k (82 %) · `Roll-off próximo (<3 meses)` 18,7k (10 %) · `En banca` 15,3k (8 %) |
| `modalidad_trabajo` | texto | Híbrido 114k · Presencial 47k · Remoto 28k |
| `movilidad_internacional` | booleano | true 28k (15 %) |

### Skills
| Columna | Tipo | Notas |
|---|---|---|
| `skills` | lista de `{skill, nivel, anios}` | 3–10 por perfil (media 7,5). `nivel` 1–5, `anios` 0–38,5 |
| `skills_texto` | texto | Las mismas skills separadas por comas (redundante con `skills`) |

Distribución de `nivel`: 1 → 60k · 2 → 212k · 3 → 428k · 4 → 460k · 5 → 276k.

### Metodologías y soft skills
| Columna | Tipo | Valores |
|---|---|---|
| `metodologias` | lista de texto | 1–3 de: Scrum, Kanban, SAFe, Lean, DevOps, ITIL, PMBOK, PRINCE2, Design Thinking, Extreme Programming |
| `habilidades_blandas` | lista de texto | 13 valores (Liderazgo, Comunicación efectiva, Negociación…) |

⚠️ Las dos listas están repartidas de forma **uniforme y aleatoria**: cada valor aparece unas 38k o 44k veces. Aportan poca señal real y no conviene que pesen en el ranking.

### Formación
| Columna | Tipo | Notas |
|---|---|---|
| `estudios` | lista de `{nivel, titulo, institucion, anio_inicio, anio_fin}` | 1–3. `nivel`: Grado, Máster, Formación Profesional Superior, Doctorado |
| `certificaciones` | lista de `{nombre, anio}` | 0–4, con 100 certificaciones distintas. **71.236 perfiles no tienen ninguna** («lo que no aparece no se supone») |

### Experiencia
| Columna | Tipo | Notas |
|---|---|---|
| `experiencia` | lista de `{empresa, puesto, inicio, fin, ubicacion, tecnologias[], es_ntt}` | 1–7 puestos. **Todos** tienen el puesto actual en NTT DATA (`fin = "Actual"`, `es_ntt = true`) |
| `proyectos` | lista de `{nombre, cliente_sector, anio, rol, tecnologias[]}` | 1–4 proyectos (media 2,1), de 2018 a 2026. `cliente_sector` usa los mismos 10 sectores |

### Idiomas y texto libre
| Columna | Tipo | Notas |
|---|---|---|
| `idiomas` | lista de `{idioma, nivel}` | 1–4. **Todos tienen inglés.** Niveles: A2, B1, B2, C1, C2, Nativo |
| `resumen` | texto | Plantilla fija: *«{puesto} con {n} años de experiencia en el sector {sector}. Especializado en {3 skills}. Basado en {ciudad} ({país}). Metodologías: …»* |

## Catálogos

**Áreas (12):** Cloud & Infraestructura 35k · Software Engineering 32k · Data & AI 29k · Aplicaciones Empresariales 22k · Consultoría de Negocio 18k · Gestión y Delivery 12k · Ciberseguridad 11k · Calidad y Testing 10k · Corporativo y Comercial 8k · Diseño y Experiencia 6,5k · Automatización y RPA 3,3k · Telecom e IoT 3k.

**Sectores (10):** Banca y Finanzas 45k · Sector Público 24k · Telecomunicaciones y Media 20k · Industria y Automoción 18k · Retail y Consumo 18k · Seguros 18k · Energía y Utilities 16k · Sanidad y Farma 12k · Transporte y Logística 10k · Turismo y Ocio 8k.

**Skills más frecuentes:** SQL, Python, Power BI, Docker, REST APIs, Jira, Terraform, Kubernetes, Análisis funcional, Linux… La lista completa está en `vocabulario.json`.

## Hallazgos que cambian el diseño

1. **El vocabulario de skills está cerrado: 614 skills.** Las tecnologías de `proyectos` y `experiencia` son siempre un **subconjunto** de las `skills` del propio perfil. La «otra jerga» no está en los perfiles, sino **en el brief**. El LLM traduce el brief a skills canónicas (p. ej. «orquestación de contenedores» → Kubernetes, EKS, AKS, GKE; «Azure» → Azure, AKS…) y el matching después es exacto, en SQL, sobre los 190k perfiles.
2. **Evidencia verificable.** El 89 % de las skills declaradas aparece en algún proyecto o puesto: el 67 % en proyectos y el 71 % en experiencia.
   - 🟢 **demostrada:** la skill está en un proyecto o puesto, o tiene certificación.
   - 🟡 **solo declarada:** está en `skills` pero en ningún proyecto o puesto (11 %).
   - ⚪ **sin evidencia.**
3. **Nivel y años no siempre cuadran** (lo avisa el propio caso). Hay 5.154 skills con ≥3 años a nivel 1 y 42.488 skills con nivel ≥4 y menos de 1 año. Son señales de riesgo y no motivos de descarte.
4. **Los requisitos implícitos se detectan con `proyectos[].cliente_sector`.** Por ejemplo, «experiencia en banca» = algún proyecto con `cliente_sector = 'Banca y Finanzas'`, aunque su `sector_principal` sea otro. **20.065 perfiles** tienen proyectos de banca sin ser banca su sector principal.
5. **Talento oculto real.** Ejemplo de la muestra: *Krystyna Kurcz* es Backend Developer .NET (Software Engineering), con sector principal Seguros y **En banca**. Ha trabajado en «Migración a la nube de core bancario» con .NET, SQL Server y Azure. Un buscador por área o por sector no la encontraría.
6. **El filtro de disponibilidad es muy restrictivo:** solo el 18 % no está Asignado.

## Cifras por brief de prueba

| Brief | Filtro duro (código) | Perfiles que quedan |
|---|---|---|
| Ciberseguridad sector público | área Ciberseguridad (11.357) → `En banca` (917) → `anios_experiencia >= 3` | **766** |
| Core banking a cloud | disponibilidad ≠ Asignado + ≥2 skills cloud (AWS, Azure, GCP, Kubernetes, Terraform, EKS/AKS/GKE, Docker) → con proyecto de banca (implícito) | 3.562 → **1.122** |
| Asistente IA retail | disponibilidad ≠ Asignado + rol AI Engineer / ML Engineer / Data Scientist; **retail es deseable y no filtra** | **1.715** (234 con proyectos de retail) |

Las dos últimas filas son aproximaciones con filtros de ejemplo. Las cifras reales dependerán de los requisitos que extraiga el LLM.

## Correspondencia con las reglas de NTT DATA

| Regla del caso | Columna(s) | Dónde se aplica |
|---|---|---|
| Disponibilidad (filtro duro) | `disponibilidad` | SQL / código |
| Años mínimos (filtro duro) | `anios_experiencia` | SQL / código |
| Requisitos implícitos (sector) | `proyectos[].cliente_sector`, `sector_principal` | El LLM los detecta y el código los puntúa |
| Matching por significado | `skills[].skill` (614 canónicas) | El LLM mapea el brief al vocabulario |
| Riesgos por candidato | `skills[].nivel` frente a `anios`, `disponibilidad`, `idiomas`, `modalidad_trabajo`, `movilidad_internacional`, `proyectos[].anio`, `certificaciones` | Código |
| Explicación | `proyectos[].nombre`, `tecnologias` | El LLM redacta y el código valida que lo citado exista |

## En Postgres / Supabase

`scripts/load_profiles.py` aplana el Parquet en las tablas de [`supabase/migrations/001_schema.sql`](../supabase/migrations/001_schema.sql). Tarda ~1 min con los 190k perfiles (probado en Postgres 17).

| Tabla | Filas | Notas |
|---|---|---|
**Fidelidad total:** se cargan todas las columnas y bloques del Parquet tal cual, sin descartar ni corregir nada. Solo se **añaden** campos derivados.

| Tabla | Filas | Notas |
|---|---|---|
| `empleados` | 190.000 | Todas las columnas del Parquet. Añade `sectores_proyectos` (sectores de todos sus proyectos) |
| `empleado_skills` | 1.434.551 | Añade `demostrada` (aparece en algún proyecto o puesto), `n_proyectos` y `ultimo_anio` |
| `proyectos` | 390.651 | |
| `experiencia` | 450.363 | |
| `estudios` | 261.250 | |
| `certificaciones` | 173.783 | Incluye las 189 repetidas del origen |
| `idiomas` | 423.468 | Incluye los 265 perfiles que repiten idioma con niveles distintos (p. ej. Catalán Nativo y A2) |
| `catalogo_skills` | 614 | Vocabulario para el LLM y para autocompletar |

Funciones RPC: `perfil(id)` devuelve el perfil completo en JSON y `buscar_personas(...)` es el buscador paginado con filtros duros y skills; tarda menos de 200 ms sobre los 190k perfiles.

### Tamaño y muestra estratificada
Cada perfil completo ocupa ~3 KB en Postgres (tablas e índices).

| Carga | Perfiles | Tamaño medido |
|---|---|---|
| Completa | 190.000 | 584 MB: no cabe en el plan gratuito de Supabase (500 MB) |
| `--muestra 100000` | 100.167 | 306 MB |
| **`--muestra 50000` (la que usamos)** | **50.169** | **167 MB**: cabe con margen de sobra, también para embeddings más adelante |

`--muestra N` es **estratificada y reproducible**. En cada estrato área × disponibilidad × sector principal (360 estratos) toma la misma proporción, ordenando por hash del id. Siempre salen los mismos perfiles y con la misma distribución que el dataset completo. Al cargar, el script comprueba la cobertura frente al Parquet completo.

### Por qué 50k es significativa (medido)

| | Completo | Muestra 50k |
|---|---|---|
| Roles | 87 | **87** (el más raro tiene 148 personas) |
| Skills | 614 | **614** (la más rara aparece en 105 perfiles) |
| Certificaciones, países, ciudades, sectores, seniorities | 100 / 15 / 63 / 10 / 6 | **todos** |
| Disponibilidad Asignado / En banca / Roll-off | 82,1 / 8,0 / 9,9 % | 81,9 / 8,1 / 9,9 % |
| Mínimo de personas En banca por rol | 46 | 12 |
| Brief ciberseguridad (En banca, ≥3 años) | 766 | **202** |
| Talento oculto en banca (disponible, sector principal ≠ banca) | 3.620 | **989** |
| Perfiles de IA/ML disponibles (brief retail) | 1.715 | **425** |

Con 30k ya salían todos los roles y skills, pero algunas combinaciones rol × disponibilidad se quedaban en 5 personas. 50k es el punto en que cada brief de prueba tiene cientos de candidatos y nada queda vacío. El ejemplo de talento oculto (*Krystyna Kurcz*) está en la muestra.

Las cifras del dataset completo, si hacen falta para el pitch, se calculan offline con DuckDB sobre el Parquet. El caso lo permite: *"Working on the sample is enough. Explaining how your solution would scale … is a plus."* Para escalar a los 190k basta con `python scripts/load_profiles.py` sin `--muestra` en un Postgres mayor: el esquema y el SQL son los mismos.

## Leer el Parquet

```python
# pip install duckdb
import duckdb
duckdb.sql("select * from 'data/profiles.parquet' where disponibilidad = 'En banca' limit 5").df()
# DuckDB 2.x: las lambdas se escriben `lambda x: ...`, no `x -> ...`
duckdb.sql("""select nombre_completo from 'data/profiles.parquet'
              where list_contains(list_transform(proyectos, lambda p: p.cliente_sector), 'Banca y Finanzas')
              limit 5""")
```

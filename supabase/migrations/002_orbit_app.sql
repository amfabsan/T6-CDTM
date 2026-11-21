-- Tablas de la APP ORBIT AI (las escribe la app; las del dataset, en 001_schema.sql, son de solo lectura).
-- Nombres en inglés, como en el brief técnico (docs/ORBIT_AI_Brief_Tecnico_MVP.docx §4.1).
-- Las personas se referencian con employee_id (= profile_id del brief).
-- Seguridad (demo, sin login en el MVP): el navegador puede LEER e INSERTAR, pero no modificar ni borrar.
--   Los supuestos de escenarios se versionan insertando una fila nueva, no editando la anterior.

-- Módulo A · Project Brief: necesidad interpretada por interpret-project y revisada por el manager.
create table if not exists project_requirements (
  id                       uuid primary key default gen_random_uuid(),
  project_name             text,
  description              text not null,                 -- texto libre original del manager
  role                     text,                          -- p. ej. "Senior AI Engineer"
  seniority                text,                          -- Trainee | Junior | Mid | Senior | Lead | Principal
  required_skills          jsonb not null default '[]',   -- [{"name":"Azure","min_level":3}]  (nombres del catalogo_skills)
  desirable_skills         jsonb not null default '[]',   -- [{"name":"RAG"}]  (suman, nunca filtran)
  sector                   jsonb not null default '[]',   -- ["Banca y Finanzas"]  (requisito implícito o explícito)
  languages                jsonb not null default '[]',   -- [{"name":"Inglés","level":"B2"}]
  certifications           jsonb not null default '[]',
  availability_constraints jsonb not null default '{"acceptable":["En banca","Roll-off próximo (<3 meses)"]}',
  min_years_experience     int,                           -- filtro duro (anios_experiencia)
  client_facing            boolean,
  interpretation_raw       jsonb,                         -- salida tal cual del LLM, antes de la edición humana (trazabilidad)
  created_at               timestamptz not null default now()
);

-- El módulo de entrevista de voz se ha descartado: el nivel de cada skill ya está en empleado_skills.
-- Si una versión anterior de esta migración llegó a crear su tabla, se elimina.
drop table if exists candidate_assessments;

-- Módulo C · Staffing Decision Center: supuestos editables (NO vienen del dataset; siempre etiquetados como supuestos).
create table if not exists scenario_assumptions (
  id                          uuid primary key default gen_random_uuid(),
  project_id                  uuid not null references project_requirements(id) on delete cascade,
  internal_cost_rate          numeric,   -- €/día imputado del talento interno
  external_rate               numeric,   -- €/día de un externo
  recruitment_cost            numeric,   -- € de selección por contratación externa
  internal_mobilization_days  int,       -- días hasta incorporar a alguien interno
  hiring_days                 int,       -- días de selección y contratación externa
  onboarding_days             int,
  project_days                int,       -- duración estimada para calcular costes
  weights                     jsonb not null default '{"cost":0.25,"time":0.25,"coverage":0.3,"availability":0.1,"risk":0.1}',
  is_illustrative             boolean not null default true,  -- true = "supuesto ilustrativo" en la UI
  created_at                  timestamptz not null default now()
);
create index if not exists scenario_assumptions_project_idx on scenario_assumptions (project_id, created_at desc);

-- ───────────────────────────── Seguridad (demo) ─────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['project_requirements','scenario_assumptions'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists demo_lectura on %I', t);
    execute format('drop policy if exists demo_insercion on %I', t);
    execute format('create policy demo_lectura on %I for select using (true)', t);
    execute format('create policy demo_insercion on %I for insert with check (true)', t);
  end loop;
end $$;

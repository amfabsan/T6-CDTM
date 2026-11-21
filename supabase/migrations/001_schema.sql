-- Esquema de SkillSonar. Adaptad las columnas de employees/project_history a los datos reales de NTT DATA.
-- ⚠️ Las políticas RLS de abajo son abiertas, SOLO para la demo del hackathon con datos anonimizados o ficticios.

create table if not exists employees (
  id text primary key,
  name text not null,
  role text,
  seniority text,
  location text,
  availability_pct int not null default 0 check (availability_pct between 0 and 100),
  current_project text
);

create table if not exists project_history (
  id uuid primary key default gen_random_uuid(),
  employee_id text not null references employees(id) on delete cascade,
  project text not null,
  client_sector text,
  year int,
  role_in_project text,
  what_they_did text
);

-- Una fila por evidencia. Una persona puede tener varias evidencias de la misma skill (CV, voz, histórico...).
create table if not exists employee_skills (
  id uuid primary key default gen_random_uuid(),
  employee_id text not null references employees(id) on delete cascade,
  skill text not null,
  status text not null check (status in ('verificada', 'autodeclarada')),
  source text not null check (source in ('cv', 'project', 'voice', 'manager')),
  evidence_quote text,
  project text,
  verified_by text,
  created_at timestamptz not null default now()
);
create index if not exists employee_skills_employee_idx on employee_skills(employee_id);

create table if not exists staffing_requests (
  id uuid primary key default gen_random_uuid(),
  raw_text text not null,
  musts text[] not null default '{}',
  nices text[] not null default '{}',
  min_availability_pct int not null default 0,
  max_team_size int not null default 3,
  created_at timestamptz not null default now()
);

create table if not exists team_proposals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references staffing_requests(id) on delete cascade,
  member_ids text[] not null,
  coverage jsonb not null,
  draft text,
  created_at timestamptz not null default now()
);

-- Demo: lectura/escritura abierta (sustituir por políticas reales fuera del hackathon).
do $$
declare t text;
begin
  foreach t in array array['employees','project_history','employee_skills','staffing_requests','team_proposals'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists demo_all on %I', t);
    execute format('create policy demo_all on %I for all using (true) with check (true)', t);
  end loop;
end $$;

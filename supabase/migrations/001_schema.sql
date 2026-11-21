-- Esquema de SkillSonar para el dataset de NTT DATA (data/profiles.parquet, 190.000 perfiles sintéticos).
-- Los nombres de columna son los mismos del Parquet. La estructura se explica en docs/DATA.md.
-- Datos: se cargan con scripts/load_profiles.py; el LLM no escribe aquí.
-- Fidelidad: se guardan TODAS las columnas y bloques del Parquet, sin descartar ni corregir nada.
--   Lo único que se añade son campos derivados (marcados como tales) para el matching.
-- Seguridad: datos sintéticos, así que lectura pública (anon) y SIN escritura desde el navegador.
--   El script de carga usa la conexión directa de Postgres, que no pasa por RLS.

-- ───────────────────────────── Perfil ─────────────────────────────
create table if not exists empleados (
  employee_id              text primary key,             -- NTT0000001 … NTT0190000
  nombre                   text not null,
  apellidos                text not null,
  nombre_completo          text not null,
  email                    text not null,
  pais                     text not null,
  ciudad                   text not null,
  area                     text not null,                -- 12 áreas
  rol                      text not null,                -- 87 roles (cada uno de una sola área)
  nivel_seniority          text not null check (nivel_seniority in ('Trainee','Junior','Mid','Senior','Lead','Principal')),
  puesto_actual            text not null,
  anios_experiencia        int  not null check (anios_experiencia >= 0),   -- FILTRO DURO (años mínimos)
  anios_en_ntt             numeric(4,1) not null,
  fecha_incorporacion      date not null,
  sector_principal         text not null,                -- 10 sectores
  disponibilidad           text not null check (disponibilidad in ('Asignado','Roll-off próximo (<3 meses)','En banca')),  -- FILTRO DURO
  modalidad_trabajo        text not null check (modalidad_trabajo in ('Híbrido','Presencial','Remoto')),
  movilidad_internacional  boolean not null,
  metodologias             text[] not null default '{}', -- ojo: repartidas al azar en el dataset, poca señal
  habilidades_blandas      text[] not null default '{}', -- ídem
  skills_texto             text not null,                -- texto libre: lista de skills
  resumen                  text not null,                -- texto libre: resumen del perfil
  -- Derivado al cargar: sectores de cliente de TODOS sus proyectos (para requisitos implícitos, p. ej. banca).
  sectores_proyectos       text[] not null default '{}'
);

-- Una fila por skill y persona. Sin clave primaria a propósito: el origen no repite skills dentro de un perfil
-- y la PK (employee_id, skill) ocuparía ~60 MB; basta con un índice por persona y otro por skill.
create table if not exists empleado_skills (
  employee_id   text not null references empleados(employee_id) on delete cascade,
  skill         text not null,                            -- vocabulario cerrado de 614 skills
  nivel         smallint not null check (nivel between 1 and 5),
  anios         real not null check (anios >= 0),
  -- Derivados al cargar:
  demostrada    boolean not null,                         -- true = aparece en algún proyecto o puesto; false = solo declarada
  n_proyectos   smallint not null default 0,              -- en cuántos proyectos aparece
  ultimo_anio   smallint                                  -- año del último proyecto que la usa (null si ninguno)
);

create table if not exists proyectos (
  id              bigint generated always as identity primary key,
  employee_id     text not null references empleados(employee_id) on delete cascade,
  orden           smallint not null,                      -- posición en el perfil original
  nombre          text not null,
  cliente_sector  text not null,
  anio            smallint not null,
  rol             text not null,
  tecnologias     text[] not null default '{}'
);

-- experiencia y estudios solo se muestran en la ficha (la evidencia ya está precalculada en empleado_skills).
create table if not exists experiencia (
  id           bigint generated always as identity primary key,
  employee_id  text not null references empleados(employee_id) on delete cascade,
  orden        smallint not null,
  empresa      text not null,
  puesto       text not null,
  inicio       date not null,
  fin          date,                                      -- null = puesto actual ("Actual" en el Parquet)
  es_actual    boolean not null,
  ubicacion    text not null,
  tecnologias  text[] not null default '{}',
  es_ntt       boolean not null
);

create table if not exists estudios (
  id           bigint generated always as identity primary key,
  employee_id  text not null references empleados(employee_id) on delete cascade,
  nivel        text not null,                             -- Grado, Máster, Formación Profesional Superior, Doctorado
  titulo       text not null,
  institucion  text not null,
  anio_inicio  smallint,
  anio_fin     smallint
);

-- Sin clave (employee_id, nombre): hay 189 certificaciones repetidas en el dataset.
create table if not exists certificaciones (
  id           bigint generated always as identity primary key,
  employee_id  text not null references empleados(employee_id) on delete cascade,
  nombre       text not null,
  anio         smallint
);

create table if not exists idiomas (
  employee_id  text not null references empleados(employee_id) on delete cascade,
  idioma       text not null,
  nivel        text not null check (nivel in ('A1','A2','B1','B2','C1','C2','Nativo'))
  -- sin PK: 265 perfiles del origen repiten idioma con niveles distintos (p. ej. Catalán Nativo y A2) y se conservan tal cual
);

-- Vocabulario de skills (para restringir al LLM y para autocompletar en la UI).
create table if not exists catalogo_skills (
  skill           text primary key,
  perfiles        int  not null,
  area_principal  text not null
);

-- ───────────────────────────── Índices ─────────────────────────────
-- Filtros duros primero: disponibilidad + años mínimos.
create index if not exists empleados_filtros_idx  on empleados (disponibilidad, anios_experiencia);
create index if not exists empleados_area_idx     on empleados (area);
create index if not exists empleados_rol_idx      on empleados (rol);
create index if not exists empleados_sectores_gin on empleados using gin (sectores_proyectos);
create index if not exists skills_skill_idx       on empleado_skills (skill, nivel desc);
create index if not exists skills_emp_idx         on empleado_skills (employee_id);
create index if not exists idiomas_emp_idx        on idiomas (employee_id);
create index if not exists proyectos_emp_idx      on proyectos (employee_id);
create index if not exists experiencia_emp_idx    on experiencia (employee_id);
create index if not exists estudios_emp_idx       on estudios (employee_id);
create index if not exists certificaciones_emp_idx on certificaciones (employee_id);

-- ───────────────────────────── Perfil completo en una llamada ─────────────────────────────
-- supabase.rpc('perfil', { p_employee_id: 'NTT0000005' }) → JSON con la misma forma que el Parquet.
create or replace function perfil(p_employee_id text)
returns jsonb
language sql stable
as $$
  select to_jsonb(e) || jsonb_build_object(
    'skills',          coalesce((select jsonb_agg(to_jsonb(s) - 'employee_id' order by s.nivel desc, s.anios desc) from empleado_skills s where s.employee_id = e.employee_id), '[]'),
    'proyectos',       coalesce((select jsonb_agg(to_jsonb(p) - 'employee_id' - 'id' order by p.anio desc) from proyectos p where p.employee_id = e.employee_id), '[]'),
    'experiencia',     coalesce((select jsonb_agg(to_jsonb(x) - 'employee_id' - 'id' order by x.orden) from experiencia x where x.employee_id = e.employee_id), '[]'),
    'estudios',        coalesce((select jsonb_agg(to_jsonb(d) - 'employee_id' - 'id') from estudios d where d.employee_id = e.employee_id), '[]'),
    'certificaciones', coalesce((select jsonb_agg(to_jsonb(c) - 'employee_id' - 'id' order by c.anio desc) from certificaciones c where c.employee_id = e.employee_id), '[]'),
    'idiomas',         coalesce((select jsonb_agg(to_jsonb(i) - 'employee_id') from idiomas i where i.employee_id = e.employee_id), '[]')
  )
  from empleados e
  where e.employee_id = p_employee_id;
$$;

-- ───────────────────────────── Buscador paginado ─────────────────────────────
-- supabase.rpc('buscar_personas', { p_disponibilidad: ['En banca'], p_skills: ['Kubernetes','Terraform'], p_min_nivel: 3 })
-- Devuelve una página de personas y, en cada fila, `total` = nº de coincidencias. Con p_skills exige TODAS las skills.
create or replace function buscar_personas(
  p_disponibilidad text[] default null,
  p_area           text   default null,
  p_rol            text   default null,
  p_sector         text   default null,
  p_min_anios      int    default 0,
  p_skills         text[] default null,
  p_min_nivel      int    default 1,
  p_limit          int    default 50,
  p_offset         int    default 0
)
returns table (employee_id text, nombre_completo text, puesto_actual text, area text, rol text,
               anios_experiencia int, sector_principal text, disponibilidad text, total bigint)
language sql stable
as $$
  select e.employee_id, e.nombre_completo, e.puesto_actual, e.area, e.rol,
         e.anios_experiencia, e.sector_principal, e.disponibilidad, count(*) over () as total
  from empleados e
  where (p_disponibilidad is null or cardinality(p_disponibilidad) = 0 or e.disponibilidad = any(p_disponibilidad))
    and (p_area   is null or e.area = p_area)
    and (p_rol    is null or e.rol = p_rol)
    and (p_sector is null or e.sector_principal = p_sector)
    and e.anios_experiencia >= coalesce(p_min_anios, 0)
    and (p_skills is null or cardinality(p_skills) = 0 or e.employee_id in (
          select s.employee_id from empleado_skills s
          where s.skill = any(p_skills) and s.nivel >= coalesce(p_min_nivel, 1)
          group by s.employee_id
          having count(*) = cardinality(p_skills)))
  order by e.anios_experiencia desc, e.employee_id
  limit least(coalesce(p_limit, 50), 200) offset coalesce(p_offset, 0);
$$;

-- ───────────────────────────── Seguridad (demo) ─────────────────────────────
-- Solo lectura para el navegador. Nadie escribe con la clave anon.
do $$
declare t text;
begin
  foreach t in array array['empleados','empleado_skills','proyectos','experiencia','estudios','certificaciones','idiomas','catalogo_skills'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists lectura_publica on %I', t);
    execute format('create policy lectura_publica on %I for select using (true)', t);
  end loop;
end $$;

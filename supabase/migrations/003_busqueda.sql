-- ORBIT AI · Pasos 5 y 6 del workflow (docs/WORKFLOW_MATCHING.md):
--   5. Filtros duros por rol, SOLO con datos estructurados. Las skills NUNCA descartan a nadie.
--   6. Búsqueda híbrida entre los que pasan el filtro: full-text + embeddings, fusionadas con RRF → ~200 por rol.
-- Requiere pgvector (Supabase lo incluye). Los embeddings los rellena scripts/build_embeddings.py
-- (modelo local paraphrase-multilingual-MiniLM-L12-v2, 384 dim): en ejecución no se llama a ningún modelo,
-- el vector de la consulta es la media de los vectores ya guardados de las skills y roles pedidos.

-- En Supabase las extensiones van en el esquema "extensions"; en un Postgres normal se crea. El search_path cubre los dos casos.
create schema if not exists extensions;
create extension if not exists vector with schema extensions;
set search_path = public, extensions;

-- Firmas de borradores anteriores (sin p_certificaciones_alguna): se eliminan para que no queden sobrecargas ambiguas.
drop function if exists buscar_candidatos(text[],text[],text[],text[],int,text,jsonb,text[],text,text,text,boolean,int,int);
drop function if exists filtrar_candidatos(text[],int,text,jsonb,text[],text,text,text,boolean);

-- ───────────────────────────── Campos del proyecto que usan los filtros ─────────────────────────────
alter table project_requirements add column if not exists modality         text check (modality in ('remoto','hibrido','presencial'));
alter table project_requirements add column if not exists country_required boolean not null default false; -- true = el país es exigido, no solo preferido
alter table project_requirements add column if not exists city             text;
alter table project_requirements add column if not exists client_sector    text;   -- uno de los 10 sectores (puntúa, no filtra)
alter table project_requirements add column if not exists source_text      text;   -- texto extraído del plan (PDF o pegado)
alter table project_requirements add column if not exists validation_review jsonb not null default '[]'; -- lo que el código eliminó o marcó para revisar

-- ───────────────────────────── Índice de búsqueda por perfil ─────────────────────────────
-- Una fila por persona con TODA la información textual del perfil, para full-text y embeddings.
-- Se reconstruye con refrescar_busqueda() tras cada carga (no modifica las tablas del dataset).
create table if not exists perfil_busqueda (
  employee_id text primary key references empleados(employee_id) on delete cascade,
  texto       text not null,       -- texto plano que se embebe (rol, skills, proyectos, experiencia, formación…)
  tsv         tsvector not null,   -- full-text ponderado: A skills · B rol/puesto · C proyectos/experiencia/certs · D resto
  embedding   vector(384)          -- null hasta ejecutar scripts/build_embeddings.py
);
create index if not exists perfil_busqueda_tsv_gin on perfil_busqueda using gin (tsv);

create table if not exists skill_embeddings (
  skill     text primary key,      -- las 614 de catalogo_skills
  embedding vector(384) not null
);
create table if not exists rol_embeddings (
  rol       text primary key,      -- los 87 roles de empleados.rol
  embedding vector(384) not null
);

-- Orden de las escalas categóricas del dataset.
create or replace function orden_seniority(s text) returns int language sql immutable as $$
  select array_position(array['Trainee','Junior','Mid','Senior','Lead','Principal'], s)
$$;
create or replace function orden_nivel_idioma(n text) returns int language sql immutable as $$
  select array_position(array['A1','A2','B1','B2','C1','C2','Nativo'], n)
$$;

-- Reconstruye perfil_busqueda a partir de TODAS las tablas del perfil. Conserva los embeddings ya calculados.
create or replace function refrescar_busqueda() returns int
language plpgsql
set search_path = public, extensions
as $$
declare n int;
begin
  with base as (
    select e.employee_id,
      -- A · skills con nivel y años (la lista estructurada y el texto libre original)
      coalesce((select string_agg(s.skill, ' ' order by s.nivel desc) from empleado_skills s where s.employee_id = e.employee_id), '')
        || ' ' || coalesce(e.skills_texto, '')                                                              as a_txt,
      -- B · rol y puesto
      concat_ws(' ', e.rol, e.puesto_actual, e.area, e.nivel_seniority)                                     as b_txt,
      -- C · proyectos, experiencia y certificaciones
      concat_ws(' ',
        (select string_agg(concat_ws(' ', p.nombre, p.rol, p.cliente_sector, array_to_string(p.tecnologias, ' ')), ' ') from proyectos p where p.employee_id = e.employee_id),
        (select string_agg(concat_ws(' ', x.puesto, x.empresa, array_to_string(x.tecnologias, ' ')), ' ') from experiencia x where x.employee_id = e.employee_id),
        (select string_agg(c.nombre, ' ') from certificaciones c where c.employee_id = e.employee_id))      as c_txt,
      -- D · sector, formación, metodologías, idiomas y resumen
      concat_ws(' ', e.sector_principal, array_to_string(e.sectores_proyectos, ' '),
        (select string_agg(concat_ws(' ', d.nivel, d.titulo), ' ') from estudios d where d.employee_id = e.employee_id),
        array_to_string(e.metodologias, ' '),
        (select string_agg(i.idioma, ' ') from idiomas i where i.employee_id = e.employee_id),
        e.resumen)                                                                                          as d_txt,
      -- Texto para el embedding: frases cortas con lo más informativo primero (el modelo trunca a ~128 tokens)
      concat_ws('. ',
        e.puesto_actual || ' (' || e.area || ')',
        'Skills: ' || coalesce((select string_agg(s.skill, ', ' order by s.nivel desc, s.anios desc) from empleado_skills s where s.employee_id = e.employee_id), ''),
        'Proyectos: ' || coalesce((select string_agg(p.nombre || ' (' || p.cliente_sector || ')', '; ' order by p.anio desc) from proyectos p where p.employee_id = e.employee_id), ''),
        'Sector: ' || e.sector_principal,
        'Certificaciones: ' || coalesce((select string_agg(c.nombre, ', ') from certificaciones c where c.employee_id = e.employee_id), 'ninguna')
      )                                                                                                     as emb_txt
    from empleados e
  )
  insert into perfil_busqueda (employee_id, texto, tsv)
  select employee_id, emb_txt,
         setweight(to_tsvector('spanish', a_txt), 'A') || setweight(to_tsvector('spanish', b_txt), 'B')
      || setweight(to_tsvector('spanish', c_txt), 'C') || setweight(to_tsvector('spanish', d_txt), 'D')
  from base
  on conflict (employee_id) do update
    set texto = excluded.texto, tsv = excluded.tsv,
        embedding = case when perfil_busqueda.texto = excluded.texto then perfil_busqueda.embedding end;  -- si cambia el texto, hay que re-embeber
  get diagnostics n = row_count;
  delete from perfil_busqueda pb where not exists (select 1 from empleados e where e.employee_id = pb.employee_id);
  return n;
end $$;

-- ───────────────────────────── Paso 5 · filtros duros (solo datos estructurados) ─────────────────────────────
-- p_idiomas = [{"name":"Inglés","level":"B2"}]  ·  p_modalidad ∈ remoto | hibrido | presencial | null
-- Ubicación: presencial → misma ciudad, mismo país o movilidad internacional; híbrido → mismo país;
--            remoto → el país solo filtra si p_pais_exigido. Sin modalidad, el país filtra solo si es exigido.
create or replace function filtrar_candidatos(
  p_disponibilidad  text[]  default array['En banca','Roll-off próximo (<3 meses)'],
  p_min_anios       int     default null,
  p_seniority_min   text    default null,
  p_idiomas         jsonb   default '[]',
  p_certificaciones text[]  default null,
  p_modalidad       text    default null,
  p_pais            text    default null,
  p_ciudad          text    default null,
  p_pais_exigido    boolean default false,
  p_certificaciones_alguna text[] default null      -- alternativas: basta con UNA ("CISSP o CEH")
) returns table (employee_id text)
language sql stable
set search_path = public, extensions
as $$
  select e.employee_id
  from empleados e
  where e.disponibilidad = any(case when p_disponibilidad is null or cardinality(p_disponibilidad) = 0
                                    then array['En banca','Roll-off próximo (<3 meses)'] else p_disponibilidad end)
    and (p_min_anios is null or e.anios_experiencia >= p_min_anios)
    and (p_seniority_min is null or orden_seniority(e.nivel_seniority) >= orden_seniority(p_seniority_min))
    -- cada idioma pedido con nivel mínimo (si el origen repite idioma, cuenta el nivel más alto)
    and not exists (
      select 1 from jsonb_array_elements(coalesce(p_idiomas, '[]')) req
      where not exists (
        select 1 from idiomas i
        where i.employee_id = e.employee_id and i.idioma = req->>'name'
          and orden_nivel_idioma(i.nivel) >= coalesce(orden_nivel_idioma(req->>'level'), 1)))
    -- todas las certificaciones obligatorias (nombre exacto del catálogo)
    and (p_certificaciones is null or cardinality(p_certificaciones) = 0 or not exists (
      select 1 from unnest(p_certificaciones) cert
      where not exists (select 1 from certificaciones c where c.employee_id = e.employee_id and c.nombre = cert)))
    and (p_certificaciones_alguna is null or cardinality(p_certificaciones_alguna) = 0 or exists (
      select 1 from certificaciones c where c.employee_id = e.employee_id and c.nombre = any(p_certificaciones_alguna)))
    -- ubicación según la modalidad
    and case
      when p_modalidad = 'presencial' then
        (p_ciudad is null and p_pais is null)
        or (p_ciudad is not null and e.ciudad = p_ciudad)
        or (p_pais is not null and e.pais = p_pais)
        or e.movilidad_internacional
      when p_modalidad = 'hibrido' then p_pais is null or e.pais = p_pais
      else not coalesce(p_pais_exigido, false) or p_pais is null or e.pais = p_pais   -- remoto o sin modalidad
    end
$$;

-- ───────────────────────────── Paso 6 · búsqueda híbrida con RRF ─────────────────────────────
-- Entre los que pasan filtrar_candidatos, ordena por:
--   · full-text: ts_rank_cd del perfil frente a skills (obligatorias y deseables) y roles pedidos;
--   · significado: distancia coseno al vector medio de esas skills y roles (obligatorias con doble peso);
-- y fusiona con RRF: Σ 1 / (k + posición). Devuelve hasta p_limit candidatos con sus dos posiciones.
create or replace function buscar_candidatos(
  p_skills_obligatorias text[]  default '{}',
  p_skills_deseables    text[]  default '{}',
  p_roles               text[]  default '{}',
  p_disponibilidad      text[]  default array['En banca','Roll-off próximo (<3 meses)'],
  p_min_anios           int     default null,
  p_seniority_min       text    default null,
  p_idiomas             jsonb   default '[]',
  p_certificaciones     text[]  default null,
  p_modalidad           text    default null,
  p_pais                text    default null,
  p_ciudad              text    default null,
  p_pais_exigido        boolean default false,
  p_certificaciones_alguna text[] default null,
  p_limit               int     default 200,
  p_k                   int     default 20
) returns table (employee_id text, rrf double precision, pos_texto int, pos_vector int, n_filtrados bigint)
language plpgsql stable
set search_path = public, extensions
as $$
declare
  q       tsquery;
  term    text;
  qvec    vector(384);
  pool    int := greatest(coalesce(p_limit, 200) * 2, 400);
begin
  -- tsquery OR con todos los términos pedidos (las skills tienen símbolos: C#, .NET, CI/CD → plainto por término)
  foreach term in array coalesce(p_skills_obligatorias, '{}') || coalesce(p_skills_deseables, '{}') || coalesce(p_roles, '{}') loop
    if numnode(plainto_tsquery('spanish', term)) > 0 then
      q := case when q is null then plainto_tsquery('spanish', term) else q || plainto_tsquery('spanish', term) end;
    end if;
  end loop;

  -- vector de la consulta = media ponderada de vectores ya calculados (obligatorias ×2, deseables ×1, roles ×1)
  select avg(v.embedding) into qvec from (
    select se.embedding from skill_embeddings se, unnest(coalesce(p_skills_obligatorias, '{}')) t where se.skill = t
    union all
    select se.embedding from skill_embeddings se, unnest(coalesce(p_skills_obligatorias, '{}')) t where se.skill = t
    union all
    select se.embedding from skill_embeddings se, unnest(coalesce(p_skills_deseables, '{}')) t where se.skill = t
    union all
    select re.embedding from rol_embeddings re, unnest(coalesce(p_roles, '{}')) t where re.rol = t
  ) v;

  return query
  with filtrados as (
    select f.employee_id from filtrar_candidatos(p_disponibilidad, p_min_anios, p_seniority_min, p_idiomas,
                                                 p_certificaciones, p_modalidad, p_pais, p_ciudad, p_pais_exigido,
                                                 p_certificaciones_alguna) f
  ),
  total as (select count(*) as n from filtrados),
  por_texto as (
    select pb.employee_id, row_number() over (order by ts_rank_cd(pb.tsv, q) desc, pb.employee_id)::int as pos
    from perfil_busqueda pb join filtrados using (employee_id)
    where q is not null and pb.tsv @@ q
    order by pos limit pool
  ),
  por_vector as (
    select pb.employee_id, row_number() over (order by pb.embedding <=> qvec, pb.employee_id)::int as pos
    from perfil_busqueda pb join filtrados using (employee_id)
    where qvec is not null and pb.embedding is not null
    order by pos limit pool
  ),
  fusion as (
    select coalesce(t.employee_id, v.employee_id) as employee_id,
           coalesce(1.0 / (p_k + t.pos), 0) + coalesce(1.0 / (p_k + v.pos), 0) as rrf,
           t.pos as pos_texto, v.pos as pos_vector
    from por_texto t full join por_vector v using (employee_id)
  )
  select fu.employee_id, fu.rrf::double precision, fu.pos_texto, fu.pos_vector, (select n from total)
  from fusion fu
  order by fu.rrf desc, fu.employee_id
  limit coalesce(p_limit, 200);
end $$;

-- Pasos 5+6 para un proyecto guardado: aplica los filtros y la búsqueda a CADA rol de project_requirements.roles.
-- supabase.rpc('candidatos_proyecto', { p_project_id }) → [{ role_index, title, count, n_filtrados, candidates: [...] }]
create or replace function candidatos_proyecto(p_project_id uuid, p_limit int default 200)
returns jsonb
language plpgsql stable
set search_path = public, extensions
as $$
declare
  pr  project_requirements;
  r   jsonb;
  idx int := 0;
  out jsonb := '[]';
  cands jsonb;
  nf bigint;
begin
  select * into pr from project_requirements where id = p_project_id;
  if not found then raise exception 'project_requirements % no existe', p_project_id; end if;

  for r in select * from jsonb_array_elements(pr.roles) loop
    select coalesce(jsonb_agg(jsonb_build_object(
             'employee_id', b.employee_id, 'rrf', round(b.rrf::numeric, 5),
             'pos_texto', b.pos_texto, 'pos_vector', b.pos_vector) order by b.rrf desc), '[]'),
           max(b.n_filtrados)
      into cands, nf
    from buscar_candidatos(
      p_skills_obligatorias => array(select x->>'name' from jsonb_array_elements(coalesce(r->'mandatory_skills', '[]')) x),
      p_skills_deseables    => array(select x->>'name' from jsonb_array_elements(coalesce(r->'desirable_skills', '[]')) x),
      p_roles               => array(select jsonb_array_elements_text(coalesce(r->'matching_roles', '[]'))),
      p_disponibilidad      => coalesce(array(select jsonb_array_elements_text(pr.availability_constraints->'acceptable')),
                                        array['En banca','Roll-off próximo (<3 meses)']),
      p_min_anios           => nullif(r->>'min_years_experience', '')::int,
      p_seniority_min       => nullif(r->>'seniority_min', ''),
      p_idiomas             => coalesce(r->'languages', '[]'),
      p_certificaciones     => array(select jsonb_array_elements_text(coalesce(r->'certifications', '[]'))),
      p_modalidad           => pr.modality,
      p_pais                => pr.country,
      p_ciudad              => pr.city,
      p_pais_exigido        => pr.country_required,
      p_certificaciones_alguna => array(select jsonb_array_elements_text(coalesce(r->'certification_options', '[]'))),
      p_limit               => p_limit
    ) b;

    out := out || jsonb_build_array(jsonb_build_object(
      'role_index', idx, 'title', r->>'title', 'count', coalesce((r->>'count')::int, 1),
      'n_filtrados', coalesce(nf, 0), 'candidates', cands));
    idx := idx + 1;
  end loop;
  return out;
end $$;

-- Vocabulario cerrado del dataset para el LLM y para validar su salida (paso 2 y 3).
create or replace function vocabulario_orbit() returns jsonb
language sql stable
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'skills',          (select jsonb_agg(skill order by skill) from catalogo_skills),
    'roles',           (select jsonb_agg(distinct rol) from empleados),
    'sectores',        (select jsonb_agg(distinct sector_principal) from empleados),
    'certificaciones', (select jsonb_agg(distinct nombre) from certificaciones),
    'idiomas',         (select jsonb_agg(distinct idioma) from idiomas),
    'paises',          (select jsonb_agg(distinct pais) from empleados),
    'ciudades',        (select jsonb_agg(distinct ciudad) from empleados),
    'niveles_idioma',  '["A1","A2","B1","B2","C1","C2","Nativo"]'::jsonb,
    'seniorities',     '["Trainee","Junior","Mid","Senior","Lead","Principal"]'::jsonb,
    'modalidades',     '["remoto","hibrido","presencial"]'::jsonb,
    'disponibilidades','["En banca","Roll-off próximo (<3 meses)"]'::jsonb
  )
$$;

-- ───────────────────────────── Seguridad ─────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['perfil_busqueda','skill_embeddings','rol_embeddings'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists lectura_publica on %I', t);
    execute format('create policy lectura_publica on %I for select using (true)', t);
  end loop;
end $$;

-- ORBIT AI · Correcciones del quality check (2026-11-21, caso core bancario con datos reales):
-- 1. El top 200 de RRF dejaba fuera, en silencio, a personas con TODAS las obligatorias (805 de 996 en Arquitectura).
--    Ahora todo disponible con al menos una skill obligatoria entra SIEMPRE (búsqueda exacta por índice) y el RRF solo
--    añade perfiles parecidos sin skill exacta. Cada candidato lleva `exacto` para saber por qué entró.
-- 2. Ambigüedad de vocabulario ("IAM" en el dataset es AWS IAM, no gestión de identidades):
--    - roles[].mandatory_any_of: obligatorias alternativas ("una de"), también recuperan candidatos;
--    - vocabulario_orbit() devuelve el área principal de cada skill para que el LLM elija la acepción correcta;
--    - skills_afines(): afinidad por CO-OCURRENCIA en los perfiles (Jaccard). No se usan los embeddings de nombres de skill
--      para esto: en el QC daban parejas sin sentido (Kubernetes ~ Bizagi 0,85; IAM ~ eTOM 0,83).
set search_path = public, extensions;

drop function if exists buscar_candidatos(text[],text[],text[],text[],int,text,jsonb,text[],text,text,text,boolean,text[],int,int);

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
  p_limit               int     default 200,     -- cuántos parecidos SIN skill exacta añade el RRF
  p_k                   int     default 20,
  p_max_exactos         int     default 2000     -- tope de candidatos con skill exacta (se ordenan por nº de obligatorias y nivel)
) returns table (employee_id text, rrf double precision, pos_texto int, pos_vector int, n_filtrados bigint, exacto boolean)
language plpgsql stable
set search_path = public, extensions
as $$
declare
  q       tsquery;
  term    text;
  qvec    vector(384);
  pool    int := greatest(coalesce(p_limit, 200) * 2, 400);
begin
  foreach term in array coalesce(p_skills_obligatorias, '{}') || coalesce(p_skills_deseables, '{}') || coalesce(p_roles, '{}') loop
    if numnode(plainto_tsquery('spanish', term)) > 0 then
      q := case when q is null then plainto_tsquery('spanish', term) else q || plainto_tsquery('spanish', term) end;
    end if;
  end loop;

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
  with filtrados as materialized (
    select f.employee_id from filtrar_candidatos(p_disponibilidad, p_min_anios, p_seniority_min, p_idiomas,
                                                 p_certificaciones, p_modalidad, p_pais, p_ciudad, p_pais_exigido,
                                                 p_certificaciones_alguna) f
  ),
  total as (select count(*) as n from filtrados),
  exactos as (
    select s.employee_id
    from empleado_skills s join filtrados using (employee_id)
    where s.skill = any(coalesce(p_skills_obligatorias, '{}'))
    group by s.employee_id
    order by count(distinct s.skill) desc, sum(s.nivel) desc, s.employee_id
    limit coalesce(p_max_exactos, 2000)
  ),
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
  ),
  parecidos as (  -- solo los que NO tienen ninguna obligatoria exacta, hasta p_limit
    select fu.* from fusion fu where fu.employee_id not in (select ex.employee_id from exactos ex)
    order by fu.rrf desc, fu.employee_id limit coalesce(p_limit, 200)
  )
  select ex.employee_id, coalesce(fu.rrf, 0)::double precision, fu.pos_texto, fu.pos_vector, (select n from total), true
  from exactos ex left join fusion fu using (employee_id)
  union all
  select pa.employee_id, pa.rrf::double precision, pa.pos_texto, pa.pos_vector, (select n from total), false
  from parecidos pa
  order by 6 desc, 2 desc, 1;
end $$;

-- Pasos 5+6 por rol (con la comprobación de 006: solo requisitos confirmados). Las alternativas de mandatory_any_of
-- también recuperan candidatos.
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
  if pr.status is distinct from 'confirmado' then
    raise exception 'Requisitos sin revisar: un responsable debe confirmarlos (confirmar_requisitos) antes de buscar candidatos';
  end if;

  for r in select * from jsonb_array_elements(pr.roles) loop
    select coalesce(jsonb_agg(jsonb_build_object(
             'employee_id', b.employee_id, 'rrf', round(b.rrf::numeric, 5),
             'pos_texto', b.pos_texto, 'pos_vector', b.pos_vector, 'exacto', b.exacto) order by b.exacto desc, b.rrf desc), '[]'),
           max(b.n_filtrados)
      into cands, nf
    from buscar_candidatos(
      p_skills_obligatorias => array(
        select x->>'name' from jsonb_array_elements(coalesce(r->'mandatory_skills', '[]')) x
        union
        select o from jsonb_array_elements(coalesce(r->'mandatory_any_of', '[]')) g,
                      jsonb_array_elements_text(coalesce(g->'options', '[]')) o),
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

-- Skills afines por co-ocurrencia en los perfiles: Jaccard = perfiles con ambas / perfiles con alguna.
-- supabase.rpc('skills_afines', { p_skills: ['Gestión de identidades'] }) → [{skill, afin, sim}]
create or replace function skills_afines(p_skills text[], p_min real default 0.5, p_top int default 5)
returns table (skill text, afin text, sim real)
language sql stable
as $$
  with n as (select s.skill, count(*) c from empleado_skills s group by s.skill),
  p as (
    select a.skill a, b.skill b, count(*) ab
    from empleado_skills a join empleado_skills b on a.employee_id = b.employee_id and a.skill <> b.skill
    where a.skill = any(p_skills)
    group by 1, 2
  ),
  j as (
    select p.a, p.b, (p.ab::real / (na.c + nb.c - p.ab)) as sim,
           row_number() over (partition by p.a order by p.ab::real / (na.c + nb.c - p.ab) desc, p.b) as rk
    from p join n na on na.skill = p.a join n nb on nb.skill = p.b
  )
  select a, b, round(sim::numeric, 3)::real from j where sim >= p_min and rk <= p_top order by a, sim desc;
$$;

-- Vocabulario con el área principal de cada skill, para que el LLM distinga acepciones ("IAM" → Cloud & Infraestructura).
create or replace function vocabulario_orbit() returns jsonb
language sql stable
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'skills',          (select jsonb_agg(skill order by skill) from catalogo_skills),
    'skills_area',     (select jsonb_object_agg(skill, area_principal) from catalogo_skills),
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

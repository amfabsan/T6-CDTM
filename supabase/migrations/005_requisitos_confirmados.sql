-- ORBIT AI · Paso 4 obligatorio: los filtros y la búsqueda (pasos 5-6) solo se aplican a requisitos CONFIRMADOS por una persona.
-- - Toda fila nueva de project_requirements entra como 'borrador', aunque el cliente intente insertarla confirmada.
-- - Solo confirmar_requisitos(id, revisor) la pasa a 'confirmado' y deja quién y cuándo.
-- - candidatos_proyecto() se niega a ejecutar sobre un borrador. El servicio Python (/match) comprueba lo mismo.
-- Las filas no se editan (RLS solo permite insertar): para cambiar requisitos ya confirmados se inserta una fila nueva.
set search_path = public, extensions;

alter table project_requirements add column if not exists status      text not null default 'borrador'
  check (status in ('borrador', 'confirmado'));
alter table project_requirements add column if not exists reviewed_by text;          -- quién revisó (nombre o email del manager)
alter table project_requirements add column if not exists reviewed_at timestamptz;

-- Una fila nueva nunca nace confirmada: la confirmación es un acto aparte y trazable.
create or replace function project_requirements_nace_borrador() returns trigger language plpgsql as $$
begin
  new.status := 'borrador';
  new.reviewed_by := null;
  new.reviewed_at := null;
  return new;
end $$;
drop trigger if exists project_requirements_nace_borrador on project_requirements;
create trigger project_requirements_nace_borrador before insert on project_requirements
  for each row execute function project_requirements_nace_borrador();

-- supabase.rpc('confirmar_requisitos', { p_project_id, p_reviewed_by }): la llama la UI al pulsar «Confirmar y buscar talento».
-- security definer: el navegador no puede hacer UPDATE (RLS), solo a través de esta función, y solo de borrador → confirmado.
create or replace function confirmar_requisitos(p_project_id uuid, p_reviewed_by text)
returns project_requirements
language plpgsql security definer
set search_path = public
as $$
declare pr project_requirements;
begin
  if coalesce(trim(p_reviewed_by), '') = '' then
    raise exception 'Hace falta indicar quién revisa los requisitos';
  end if;
  update project_requirements
     set status = 'confirmado', reviewed_by = trim(p_reviewed_by), reviewed_at = now()
   where id = p_project_id and status = 'borrador'
  returning * into pr;
  if not found then
    raise exception 'project_requirements % no existe o ya está confirmado', p_project_id;
  end if;
  return pr;
end $$;

-- Pasos 5+6 para un proyecto: igual que en 003, pero SOLO si los requisitos están confirmados.
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

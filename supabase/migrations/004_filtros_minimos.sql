-- ORBIT AI · Paso 5 con filtros mínimos (decisión del equipo, 2026-11-21):
-- solo excluye lo inequívoco: no estar disponible (Asignado) y, si el plan lo EXIGE, estar fuera del país.
-- Años, seniority, idiomas, certificaciones y ciudad/modalidad ya NO excluyen: el score (matching/) los trata como
-- gaps o riesgos y deja anotado el motivo. Misma firma que en 003, así buscar_candidatos y candidatos_proyecto no cambian.
set search_path = public, extensions;

create or replace function filtrar_candidatos(
  p_disponibilidad  text[]  default array['En banca','Roll-off próximo (<3 meses)'],
  p_min_anios       int     default null,   -- ignorado (puntúa en matching/)
  p_seniority_min   text    default null,   -- ignorado
  p_idiomas         jsonb   default '[]',   -- ignorado
  p_certificaciones text[]  default null,   -- ignorado
  p_modalidad       text    default null,   -- ignorado: la ubicación es riesgo salvo país exigido
  p_pais            text    default null,
  p_ciudad          text    default null,   -- ignorado
  p_pais_exigido    boolean default false,
  p_certificaciones_alguna text[] default null  -- ignorado
) returns table (employee_id text)
language sql stable
set search_path = public, extensions
as $$
  select e.employee_id
  from empleados e
  where e.disponibilidad = any(case when p_disponibilidad is null or cardinality(p_disponibilidad) = 0
                                    then array['En banca','Roll-off próximo (<3 meses)'] else p_disponibilidad end)
    and (not coalesce(p_pais_exigido, false) or p_pais is null or e.pais = p_pais)
$$;

-- Perfiles completos de varios IDs en una llamada (para puntuar los ~200 candidatos por rol de candidatos_proyecto).
create or replace function perfiles(p_ids text[])
returns jsonb
language sql stable
as $$
  select coalesce(jsonb_agg(x) filter (where x is not null), '[]') from (select perfil(id) x from unnest(p_ids) id) t;  -- IDs inexistentes se omiten
$$;

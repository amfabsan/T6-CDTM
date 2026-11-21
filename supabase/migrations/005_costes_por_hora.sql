-- 005 · Costes en €/hora (decisión del equipo, 21-11-2026).
-- matching/teams.py calcula: coste persona = tarifa €/h × horas; coste equipo = suma.
-- 002 definía tarifas en €/día; no se edita (puede estar aplicada): se añaden columnas por hora
-- y las de €/día quedan marcadas como obsoletas. Idempotente.

alter table scenario_assumptions
  add column if not exists internal_rate_per_hour  numeric,  -- €/h imputado del talento interno (si no hay tarifa por seniority)
  add column if not exists rates_by_seniority      jsonb,    -- €/h por nivel_seniority, por defecto los de matching/pipeline.py: {"Trainee":20,"Junior":30,"Mid":45,"Senior":60,"Lead":75,"Principal":90}
  add column if not exists external_rate_per_hour  numeric,  -- €/h de un externo
  add column if not exists hours_per_person        numeric,  -- horas por persona si el plan no trae planned_hours (por defecto 160 = un mes)
  add column if not exists rolloff_days            int;      -- días supuestos hasta que alguien en «Roll-off próximo» queda libre (por defecto 45)

comment on column scenario_assumptions.internal_cost_rate is 'OBSOLETA (€/día). Usar internal_rate_per_hour o rates_by_seniority (€/h).';
comment on column scenario_assumptions.external_rate      is 'OBSOLETA (€/día). Usar external_rate_per_hour (€/h).';
comment on column scenario_assumptions.project_days       is 'Solo para plazos. El coste usa hours_per_person (h).';

-- cala.studio · Genera las sesiones del calendario
-- Martes y Jueves · Mat 9:00–9:50 · Sculpt 10:00–10:50 · aforo 8
-- Desde HOY hasta el 31 ago 2026. Idempotente (re-ejecutable sin duplicar).

insert into public.class_sessions (class_slug, starts_at, ends_at, capacity)
select
  t.slug,
  ((g.d::date || ' ' || t.start_local)::timestamp at time zone 'Europe/Madrid'),
  ((g.d::date || ' ' || t.start_local)::timestamp at time zone 'Europe/Madrid')
    + (t.dur || ' minutes')::interval,
  8
from generate_series(current_date, date '2026-08-31', interval '1 day') g(d)
cross join (values
  ('mat',    '09:00', 50),
  ('sculpt', '10:00', 50)
) t(slug, start_local, dur)
where extract(dow from g.d) in (2, 4)   -- 2 = martes, 4 = jueves
on conflict (class_slug, starts_at) do nothing;

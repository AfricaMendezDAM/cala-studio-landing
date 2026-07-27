-- cala.studio · Parrilla de AGOSTO 2026 · añade dos grupos nuevos
--   Lunes     · Flow   9:00–9:50 · Sculpt 10:00–10:50
--   Martes    · Mat    9:00–9:50 · Sculpt 10:00–10:50  (ya sembrado en 0003)
--   Miércoles · Flow   9:00–9:50 · Sculpt 10:00–10:50
--   Jueves    · Mat    9:00–9:50 · Sculpt 10:00–10:50  (ya sembrado en 0003)
-- Idempotente (re-ejecutable sin duplicar).

-- ── 1) Nueva modalidad en el catálogo ───────────────────────────────────
insert into public.class_types (slug, name, name_em, meta, duration_min, sort_order) values
  ('flow', 'Pilates', 'Flow', 'Fluidez · Todos los niveles', 50, 2)
on conflict (slug) do nothing;

-- Sculpt pasa detrás de Flow en el orden del catálogo
update public.class_types set sort_order = 3 where slug = 'sculpt';

-- ── 2) Sesiones de lunes y miércoles, del 1 al 31 de agosto ─────────────
-- Arranca como pronto hoy: no crea sesiones en el pasado si se corre en septiembre.
insert into public.class_sessions (class_slug, starts_at, ends_at, capacity)
select
  t.slug,
  ((g.d::date || ' ' || t.start_local)::timestamp at time zone 'Europe/Madrid'),
  ((g.d::date || ' ' || t.start_local)::timestamp at time zone 'Europe/Madrid')
    + (t.dur || ' minutes')::interval,
  8
from generate_series(
       greatest(current_date, date '2026-08-01')::timestamp,
       date '2026-08-31',
       interval '1 day') g(d)
cross join (values
  ('flow',   '09:00', 50),
  ('sculpt', '10:00', 50)
) t(slug, start_local, dur)
where extract(dow from g.d) in (1, 3)   -- 1 = lunes, 3 = miércoles
on conflict (class_slug, starts_at) do nothing;

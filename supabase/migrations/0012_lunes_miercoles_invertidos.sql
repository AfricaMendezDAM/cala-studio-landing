-- cala.studio · Lunes y miércoles se dan la vuelta: Sculpt a las 9 y Flow a las 10
--
-- Hasta ahora los lunes y miércoles eran Flow 9:00 · Sculpt 10:00. Pasan a ser
-- Sculpt 9:00 · Flow 10:00, con UNA excepción: el lunes 10 de agosto se queda
-- como estaba (Flow 9:00 · Sculpt 10:00).
--
-- Lo que cambia es la modalidad de cada hora, NO la hora: quien ya esté apuntada
-- a las 9:00 sigue a las 9:00, haciendo Sculpt. Martes y jueves no se tocan.
-- Tampoco se toca el pasado: solo las clases que aún no han empezado.
--
-- Correr DESPUÉS de 0001-0011. Idempotente: al re-ejecutarlo ya no queda ningún
-- Flow a las 9 de un lunes o miércoles, así que no vuelve a darles la vuelta.

-- ── 1) Las 9:00 pasan a ser Sculpt ───────────────────────────────────────
update public.class_sessions
   set class_slug = 'sculpt'
 where category   = 'clase'
   and class_slug = 'flow'
   and starts_at  > now()
   and extract(dow from (starts_at at time zone 'Europe/Madrid')) in (1, 3)   -- lunes y miércoles
   and (starts_at at time zone 'Europe/Madrid')::time = time '09:00'
   and (starts_at at time zone 'Europe/Madrid')::date <> date '2026-08-10';   -- el lunes 10 se queda igual

-- ── 2) Las 10:00 pasan a ser Flow ────────────────────────────────────────
update public.class_sessions
   set class_slug = 'flow'
 where category   = 'clase'
   and class_slug = 'sculpt'
   and starts_at  > now()
   and extract(dow from (starts_at at time zone 'Europe/Madrid')) in (1, 3)
   and (starts_at at time zone 'Europe/Madrid')::time = time '10:00'
   and (starts_at at time zone 'Europe/Madrid')::date <> date '2026-08-10';

-- ── 3) Comprobación: así queda la parrilla de lunes y miércoles ──────────
-- (el resultado sale en el SQL Editor; el lunes 10 debe seguir con Flow a las 9)
select (starts_at at time zone 'Europe/Madrid')::date as dia,
       to_char(starts_at at time zone 'Europe/Madrid', 'HH24:MI') as hora,
       class_slug
from public.class_sessions
where category = 'clase'
  and starts_at > now()
  and extract(dow from (starts_at at time zone 'Europe/Madrid')) in (1, 3)
order by starts_at;

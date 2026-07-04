-- cala.studio · Cómo añadir un EVENTO al calendario
-- (hasta que exista el panel de gestión en la Fase 4).
-- Ajusta título, descripción, fecha/hora y aforo, y córrelo en Supabase → SQL Editor.
-- Aparecerá en el calendario con un punto AZUL (las clases son amarillas).

insert into public.class_sessions (category, titulo, descripcion, starts_at, ends_at, capacity)
values (
  'evento',
  'Pilates & Wine',
  'Masterclass de pilates, paseo por la viña y picoteo con vino de la zona en Viña do Grobe',
  timestamp '2026-08-15 19:00' at time zone 'Europe/Madrid',
  timestamp '2026-08-15 21:00' at time zone 'Europe/Madrid',
  12
);

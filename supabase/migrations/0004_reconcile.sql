-- cala.studio · Reconciliación: porta los datos VIVOS del esquema antiguo
-- (classes + bookings_legacy, creados por schema.sql) al modelo sessions.
-- Correr DESPUÉS de 0001→0002→0003. Idempotente y sin pérdida de datos.
-- Los DROP de lo antiguo se dejan comentados: hacerlos en una migración
-- posterior SOLO tras verificar que el nuevo flujo funciona.

-- ── Portar clases antiguas → class_sessions ─────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'classes') then
    insert into public.class_sessions (category, class_slug, starts_at, ends_at, capacity)
    select 'clase', c.tipo, c.starts_at, c.ends_at, c.capacity
    from public.classes c
    on conflict (class_slug, starts_at) do nothing;
  end if;
end $$;

-- ── Portar reservas antiguas → bookings ─────────────────────────────────
-- Mapea cada reserva legacy a su sesión nueva por (tipo, starts_at) y enriquece
-- nombre/email/teléfono desde profiles + auth.users. El índice único evita duplicados.
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'bookings_legacy') then
    insert into public.bookings (session_id, user_id, nombre, email, telefono, status, source, created_at)
    select s.id,
           bl.user_id,
           coalesce(p.nombre, '(sin nombre)'),
           coalesce(u.email, 'sin-email@cala.studio'),
           p.telefono,
           'confirmed', 'self', bl.created_at
    from public.bookings_legacy bl
    join public.classes       c on c.id = bl.class_id
    join public.class_sessions s on s.class_slug = c.tipo and s.starts_at = c.starts_at
    left join auth.users       u on u.id = bl.user_id
    left join public.profiles  p on p.id = bl.user_id
    on conflict do nothing;
  end if;
end $$;

-- ── Limpieza DIFERIDA (ejecutar en una migración futura, ya validado) ───
-- drop function if exists public.book_class(uuid);
-- drop function if exists public.availability();
-- drop table    if exists public.bookings_legacy;
-- drop table    if exists public.classes cascade;

-- cala.studio · Eventos en el calendario + "agotado" + lista de espera con email
--
-- Tres cosas:
--   1. Cada evento del sitio (#/evento/<slug>) se ata a su sesión por `evento_slug`,
--      así la página sabe si quedan plazas y a qué lista de espera apuntar.
--   2. `sold_out`: la dueña marca un evento (o una clase) como COMPLETO cuando
--      quiera, sin tocar el aforo. De cara al público sale "Agotado"; en gestión
--      sigue pudiendo apuntar gente a mano si aún caben.
--   3. La lista de espera guarda también el EMAIL (nombre y apellidos, teléfono
--      y email) para poder avisar de una plaza libre o de la próxima fecha.
--
-- Correr DESPUÉS de 0001-0009. Idempotente: puede re-ejecutarse sin romper nada.

-- ── 1) Columnas nuevas ───────────────────────────────────────────────────
alter table public.class_sessions add column if not exists evento_slug text;
alter table public.class_sessions add column if not exists sold_out boolean not null default false;
create unique index if not exists class_sessions_evento_slug_uidx
  on public.class_sessions (evento_slug) where evento_slug is not null;

alter table public.session_waitlist add column if not exists email text;

-- ── 2) Vista de disponibilidad: expone el slug y el "completo" ───────────
-- `spots_left` sigue siendo SOLO aforo (gestión lo necesita para saber si aún
-- caben personas). `is_full` es lo que ve el público: aforo lleno O marcado.
drop view if exists public.session_availability;
create view public.session_availability as
select
  s.id                                as session_id,
  s.category,
  s.class_slug,
  s.evento_slug,
  coalesce(ct.name,    s.titulo)      as name,
  coalesce(ct.name_em, '')            as name_em,
  coalesce(ct.meta,    s.descripcion) as meta,
  s.titulo,
  s.descripcion,
  coalesce(ct.duration_min,
           (extract(epoch from (s.ends_at - s.starts_at)) / 60)::int) as duration_min,
  s.starts_at,
  s.ends_at,
  s.capacity,
  s.requires_entitlement,
  s.reservadas,
  s.sold_out,
  greatest(s.capacity - s.reservadas, 0)              as spots_left,
  (s.reservadas >= s.capacity or s.sold_out)          as is_full,
  (select count(*) from public.session_waitlist w where w.session_id = s.id)::int as waitlist_count
from public.class_sessions s
left join public.class_types ct on ct.slug = s.class_slug
where s.published;
grant select on public.session_availability to anon, authenticated;

-- ── 3) RPC: marcar / desmarcar como completo (requiere PIN) ──────────────
create or replace function public.admin_set_sold_out(
  p_session_id uuid, p_sold_out boolean, p_pin text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check_pin(p_pin) then raise exception 'PIN_INCORRECTO'; end if;
  update public.class_sessions
     set sold_out = coalesce(p_sold_out, false)
   where id = p_session_id;
end; $$;
grant execute on function public.admin_set_sold_out(uuid, boolean, text) to anon, authenticated;

-- ── 4) RPC: cambiar el nº de plazas (requiere PIN) ───────────────────────
-- Para los eventos, donde el aforo se cierra más tarde. Nunca por debajo de la
-- gente ya apuntada: primero se quita a alguien y luego se baja el aforo.
create or replace function public.admin_set_capacity(
  p_session_id uuid, p_capacity int, p_pin text
) returns void
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if not public.admin_check_pin(p_pin) then raise exception 'PIN_INCORRECTO'; end if;
  if p_capacity is null or p_capacity < 1 then raise exception 'AFORO_INVALIDO'; end if;

  select count(*) into v_count from public.session_guests where session_id = p_session_id;
  if p_capacity < v_count then raise exception 'AFORO_MENOR_QUE_APUNTADAS'; end if;

  update public.class_sessions
     set capacity = least(p_capacity, 200)
   where id = p_session_id;
end; $$;
grant execute on function public.admin_set_capacity(uuid, int, text) to anon, authenticated;

-- ── 5) Lista de espera con email ─────────────────────────────────────────
-- Self-signup público (sin PIN): nombre y apellidos, teléfono y email.
drop function if exists public.waitlist_join(uuid, text, text);
create or replace function public.waitlist_join(
  p_session_id uuid, p_nombre text, p_telefono text default null, p_email text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_starts timestamptz; v_nombre text; v_tel text; v_email text; v_id uuid;
begin
  v_nombre := trim(coalesce(p_nombre, ''));
  if v_nombre = '' then raise exception 'NOMBRE_REQUERIDO'; end if;
  v_nombre := left(v_nombre, 120);
  v_tel    := nullif(trim(coalesce(p_telefono, '')), '');
  v_email  := nullif(lower(trim(coalesce(p_email, ''))), '');

  select starts_at into v_starts from public.class_sessions where id = p_session_id;
  if not found         then raise exception 'SESSION_NOT_FOUND'; end if;
  if v_starts <= now() then raise exception 'SESSION_CLOSED';    end if;

  -- Doble-click / reenvío: no dupliques a la misma persona en la misma sesión.
  -- Con email, el email manda; sin email, cae al par nombre + teléfono.
  if v_email is not null then
    select id into v_id from public.session_waitlist
     where session_id = p_session_id and lower(email) = v_email
     limit 1;
  else
    select id into v_id from public.session_waitlist
     where session_id = p_session_id
       and lower(nombre) = lower(v_nombre)
       and coalesce(telefono, '') = coalesce(v_tel, '')
     limit 1;
  end if;
  if v_id is not null then return v_id; end if;

  insert into public.session_waitlist (session_id, nombre, telefono, email, source)
  values (p_session_id, v_nombre, v_tel, v_email, 'self')
  returning id into v_id;
  return v_id;
end; $$;
grant execute on function public.waitlist_join(uuid, text, text, text) to anon, authenticated;

-- Listar la espera (requiere PIN) — ahora devuelve también el email
drop function if exists public.admin_list_waitlist(uuid, text);
create or replace function public.admin_list_waitlist(p_session_id uuid, p_pin text)
returns table (id uuid, nombre text, telefono text, email text, source text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check_pin(p_pin) then raise exception 'PIN_INCORRECTO'; end if;
  return query
    select w.id, w.nombre, w.telefono, w.email, w.source, w.created_at
    from public.session_waitlist w
    where w.session_id = p_session_id
    order by w.created_at;
end; $$;
grant execute on function public.admin_list_waitlist(uuid, text) to anon, authenticated;

-- Alta manual en la espera (requiere PIN) — con email
drop function if exists public.admin_add_waitlist(uuid, text, text, text);
create or replace function public.admin_add_waitlist(
  p_session_id uuid, p_nombre text, p_telefono text, p_email text, p_pin text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.admin_check_pin(p_pin) then raise exception 'PIN_INCORRECTO'; end if;
  if coalesce(trim(p_nombre), '') = '' then raise exception 'NOMBRE_REQUERIDO'; end if;
  insert into public.session_waitlist (session_id, nombre, telefono, email, source)
  values (p_session_id, trim(p_nombre), nullif(trim(p_telefono), ''),
          nullif(lower(trim(p_email)), ''), 'admin')
  returning id into v_id;
  return v_id;
end; $$;
grant execute on function public.admin_add_waitlist(uuid, text, text, text, text) to anon, authenticated;

-- ── 6) El evento de agosto, en el calendario y en gestión ────────────────
-- Si ya existía una fila "Pilates & Wine" (la de ejemplo_evento.sql), la adopta
-- en vez de duplicarla: le pone el slug y la fecha buena y respeta su aforo.
-- El aforo arranca en 12 y se cambia desde el panel cuando esté decidido.
do $$
declare v_id uuid;
begin
  select id into v_id from public.class_sessions where evento_slug = 'pilates-and-wine';
  if v_id is null then
    select id into v_id from public.class_sessions
     where category = 'evento' and titulo = 'Pilates & Wine' and evento_slug is null
     order by starts_at limit 1;
  end if;

  if v_id is null then
    insert into public.class_sessions
      (category, titulo, descripcion, evento_slug, starts_at, ends_at, capacity)
    values (
      'evento',
      'Pilates & Wine',
      'Masterclass entre viñas, paseo por la bodega y una copa para brindar',
      'pilates-and-wine',
      timestamp '2026-08-08 10:30' at time zone 'Europe/Madrid',
      timestamp '2026-08-08 13:00' at time zone 'Europe/Madrid',
      12
    );
  else
    update public.class_sessions set
      category    = 'evento',
      titulo      = 'Pilates & Wine',
      descripcion = 'Masterclass entre viñas, paseo por la bodega y una copa para brindar',
      evento_slug = 'pilates-and-wine',
      starts_at   = timestamp '2026-08-08 10:30' at time zone 'Europe/Madrid',
      ends_at     = timestamp '2026-08-08 13:00' at time zone 'Europe/Madrid'
    where id = v_id;   -- el aforo NO se toca: manda lo que haya puesto el panel
  end if;
end $$;

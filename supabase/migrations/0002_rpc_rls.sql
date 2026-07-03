-- cala.studio · Vista de disponibilidad, RPCs de reserva/cancelación y RLS
-- Ejecutar DESPUÉS de 0001_schema.sql.

-- ── Vista pública de disponibilidad (solo agregados, nunca identidades) ──
-- Owner = postgres → agrega sobre bookings saltándose RLS, pero SOLO expone
-- conteos; nombres/emails/teléfonos nunca salen de la BD.
create or replace view public.session_availability as
select
  s.id            as session_id,
  s.class_slug,
  ct.name,
  ct.name_em,
  ct.meta,
  ct.duration_min,
  s.starts_at,
  s.ends_at,
  s.capacity,
  count(b.id) filter (where b.status = 'confirmed')                          as confirmed_count,
  greatest(s.capacity - count(b.id) filter (where b.status = 'confirmed'), 0) as spots_left,
  (count(b.id) filter (where b.status = 'confirmed') >= s.capacity)          as is_full
from public.class_sessions s
join public.class_types ct on ct.slug = s.class_slug
left join public.bookings b on b.session_id = s.id
group by s.id, ct.slug;

-- ── RPC: reservar con aforo atómico ─────────────────────────────────────
create or replace function public.book_session(
  p_session_id uuid,
  p_nombre     text,
  p_email      text,
  p_telefono   text,
  p_message    text default null
) returns table (booking_id uuid, status text, spots_left int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity  int;
  v_confirmed int;
  v_status    text;
  v_starts    timestamptz;
  v_id        uuid;
begin
  if coalesce(trim(p_nombre),   '') = ''
     or coalesce(trim(p_email),    '') = ''
     or coalesce(trim(p_telefono), '') = '' then
    raise exception 'missing_fields';
  end if;

  -- Bloquea la fila de la sesión: serializa la "última plaza".
  -- Dos reservas simultáneas para la misma sesión se ordenan aquí, así que
  -- la segunda ve la primera ya insertada y solo una gana la última plaza.
  select capacity, starts_at into v_capacity, v_starts
  from public.class_sessions
  where id = p_session_id
  for update;

  if not found          then raise exception 'session_not_found'; end if;
  if v_starts <= now()  then raise exception 'session_closed';    end if;

  -- Rechaza doble reserva activa del mismo email
  if exists (
    select 1 from public.bookings
    where session_id = p_session_id
      and lower(email) = lower(p_email)
      and status in ('confirmed','waitlist')
  ) then
    raise exception 'already_booked';
  end if;

  select count(*) into v_confirmed
  from public.bookings
  where session_id = p_session_id and status = 'confirmed';

  v_status := case when v_confirmed < v_capacity then 'confirmed' else 'waitlist' end;

  insert into public.bookings (session_id, user_id, nombre, email, telefono, message, status)
  values (
    p_session_id, auth.uid(),
    trim(p_nombre), lower(trim(p_email)), trim(p_telefono),
    nullif(trim(p_message), ''), v_status
  )
  returning id into v_id;

  return query
    select v_id, v_status,
           greatest(v_capacity - (v_confirmed + (v_status = 'confirmed')::int), 0);
end;
$$;

-- ── RPC: cancelar (solo el dueño logueado de la reserva) ────────────────
create or replace function public.cancel_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.bookings
  set status = 'cancelled', cancelled_at = now()
  where id = p_booking_id
    and user_id = auth.uid()
    and status in ('confirmed','waitlist');
  if not found then raise exception 'not_allowed'; end if;
end;
$$;

-- ── Permisos de ejecución de las funciones ──────────────────────────────
revoke all on function public.book_session(uuid,text,text,text,text) from public;
grant execute on function public.book_session(uuid,text,text,text,text) to anon, authenticated;

revoke all on function public.cancel_booking(uuid) from public;
grant execute on function public.cancel_booking(uuid) to authenticated;

-- ── Row Level Security ──────────────────────────────────────────────────
alter table public.class_types    enable row level security;
alter table public.class_sessions enable row level security;
alter table public.bookings       enable row level security;
alter table public.profiles       enable row level security;

-- Horario público (solo lectura)
drop policy if exists class_types_read    on public.class_types;
drop policy if exists class_sessions_read on public.class_sessions;
create policy class_types_read    on public.class_types    for select using (true);
create policy class_sessions_read on public.class_sessions for select using (true);

-- Reservas: NADIE inserta/actualiza/borra directo (solo vía RPC security definer).
revoke insert, update, delete on public.bookings from anon, authenticated;
-- El usuario logueado ve solo SUS reservas.
drop policy if exists bookings_own_read on public.bookings;
create policy bookings_own_read on public.bookings
  for select to authenticated using (user_id = auth.uid());

-- Perfiles: cada usuario gestiona el suyo.
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Vista agregada: lectura para todos (anon incluido) — solo conteos.
grant select on public.session_availability to anon, authenticated;

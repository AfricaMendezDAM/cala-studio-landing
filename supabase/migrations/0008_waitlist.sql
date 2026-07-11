-- cala.studio · Lista de espera por clase (self-signup público + alta manual)
-- Cuando una clase está COMPLETA, la persona se apunta ella misma con su nombre
-- y apellidos (teléfono opcional). La dueña también puede apuntar a alguien a
-- mano desde el panel de gestión. La lista de espera NO cuenta para el aforo:
-- es una cola aparte que aparece en gestión bajo su día y clase.
-- Correr DESPUÉS de 0001-0007. Idempotente: puede re-ejecutarse sin romper nada.

-- ── 1) Tabla de lista de espera ──────────────────────────────────────────
create table if not exists public.session_waitlist (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  nombre     text not null,                                   -- nombre y apellidos
  telefono   text,
  source     text not null default 'self' check (source in ('self','admin')),
  created_at timestamptz not null default now()
);
create index if not exists session_waitlist_session_idx
  on public.session_waitlist (session_id, created_at);

-- RLS activada y SIN políticas de tabla → nadie lee/escribe la tabla directo.
-- El self-signup y la gestión van por las funciones SECURITY DEFINER de abajo.
alter table public.session_waitlist enable row level security;

-- ── 2) Vista de disponibilidad: añade el nº en lista de espera ───────────
-- Recreamos la vista para exponer waitlist_count junto a spots_left/is_full,
-- así el calendario y el panel muestran "N en lista de espera".
drop view if exists public.session_availability;
create view public.session_availability as
select
  s.id                                as session_id,
  s.category,
  s.class_slug,
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
  greatest(s.capacity - s.reservadas, 0) as spots_left,
  (s.reservadas >= s.capacity)           as is_full,
  (select count(*) from public.session_waitlist w where w.session_id = s.id)::int as waitlist_count
from public.class_sessions s
left join public.class_types ct on ct.slug = s.class_slug
where s.published;
grant select on public.session_availability to anon, authenticated;

-- ── 3) RPC público: apuntarse a la lista de espera (SIN PIN) ─────────────
-- Cualquiera se apunta con su nombre y apellidos cuando la clase está completa.
-- Idempotente ante doble-envío: si ya está esa misma persona (mismo nombre y
-- mismo teléfono) en esa clase, devuelve su fila sin duplicar.
create or replace function public.waitlist_join(
  p_session_id uuid, p_nombre text, p_telefono text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_starts timestamptz; v_nombre text; v_tel text; v_id uuid;
begin
  v_nombre := trim(coalesce(p_nombre, ''));
  if v_nombre = '' then raise exception 'NOMBRE_REQUERIDO'; end if;
  v_nombre := left(v_nombre, 120);
  v_tel := nullif(trim(coalesce(p_telefono, '')), '');

  select starts_at into v_starts from public.class_sessions where id = p_session_id;
  if not found        then raise exception 'SESSION_NOT_FOUND'; end if;
  if v_starts <= now() then raise exception 'SESSION_CLOSED';    end if;

  -- Doble-click / reenvío: no dupliques a la misma persona en la misma clase.
  select id into v_id from public.session_waitlist
   where session_id = p_session_id
     and lower(nombre) = lower(v_nombre)
     and coalesce(telefono, '') = coalesce(v_tel, '')
   limit 1;
  if found then return v_id; end if;

  insert into public.session_waitlist (session_id, nombre, telefono, source)
  values (p_session_id, v_nombre, v_tel, 'self')
  returning id into v_id;
  return v_id;
end; $$;
grant execute on function public.waitlist_join(uuid, text, text) to anon, authenticated;

-- ── 4) RPC: listar la lista de espera de una sesión (requiere PIN) ───────
create or replace function public.admin_list_waitlist(p_session_id uuid, p_pin text)
returns table (id uuid, nombre text, telefono text, source text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check_pin(p_pin) then raise exception 'PIN_INCORRECTO'; end if;
  return query
    select w.id, w.nombre, w.telefono, w.source, w.created_at
    from public.session_waitlist w
    where w.session_id = p_session_id
    order by w.created_at;
end; $$;
grant execute on function public.admin_list_waitlist(uuid, text) to anon, authenticated;

-- ── 5) RPC: apuntar a alguien a la lista de espera a mano (requiere PIN) ──
create or replace function public.admin_add_waitlist(
  p_session_id uuid, p_nombre text, p_telefono text, p_pin text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.admin_check_pin(p_pin) then raise exception 'PIN_INCORRECTO'; end if;
  if coalesce(trim(p_nombre), '') = '' then raise exception 'NOMBRE_REQUERIDO'; end if;
  insert into public.session_waitlist (session_id, nombre, telefono, source)
  values (p_session_id, trim(p_nombre), nullif(trim(p_telefono), ''), 'admin')
  returning id into v_id;
  return v_id;
end; $$;
grant execute on function public.admin_add_waitlist(uuid, text, text, text) to anon, authenticated;

-- ── 6) RPC: quitar a alguien de la lista de espera (requiere PIN) ────────
create or replace function public.admin_remove_waitlist(p_waitlist_id uuid, p_pin text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check_pin(p_pin) then raise exception 'PIN_INCORRECTO'; end if;
  delete from public.session_waitlist where id = p_waitlist_id;
end; $$;
grant execute on function public.admin_remove_waitlist(uuid, text) to anon, authenticated;

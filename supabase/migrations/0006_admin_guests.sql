-- cala.studio · Lista de personas confirmadas por clase (modelo WhatsApp + PIN)
-- La dueña apunta en el panel de gestión el nombre y el teléfono de cada persona
-- que le confirma una plaza. El aforo (`reservadas`) pasa a ser el NÚMERO de
-- personas apuntadas: imposible que el contador y la lista se descuadren.
-- Correr DESPUÉS de 0001-0005. Idempotente: puede re-ejecutarse sin romper nada.

-- ── 1) Tabla de personas apuntadas por sesión ───────────────────────────
create table if not exists public.session_guests (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  nombre     text not null,
  telefono   text,
  created_at timestamptz not null default now()
);
create index if not exists session_guests_session_idx on public.session_guests (session_id);

-- RLS activada y SIN políticas → nadie lee/escribe la tabla directamente.
-- Solo las funciones SECURITY DEFINER de abajo (validando el PIN) la tocan.
alter table public.session_guests enable row level security;

-- ── 2) El aforo `reservadas` se mantiene solo = nº de personas apuntadas ──
-- Así la vista pública (session_availability) y el calendario del cliente
-- siguen funcionando igual, sin depender de un contador manual aparte.
create or replace function public.sync_session_reservadas()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_sid uuid;
begin
  v_sid := coalesce(new.session_id, old.session_id);
  update public.class_sessions
     set reservadas = (select count(*) from public.session_guests where session_id = v_sid)
   where id = v_sid;
  return null;
end; $$;

drop trigger if exists session_guests_sync on public.session_guests;
create trigger session_guests_sync
  after insert or delete on public.session_guests
  for each row execute function public.sync_session_reservadas();

-- ── 3) Backfill: conserva el aforo que ya llevabas con el contador ───────
-- Por cada plaza contada a mano y todavía sin nombre, crea una fila "Sin
-- nombre" que puedes editar (quitar y volver a apuntar con el nombre real).
-- Idempotente: si el nº de personas ya cuadra con `reservadas`, no hace nada.
insert into public.session_guests (session_id, nombre)
select s.id, 'Sin nombre'
from public.class_sessions s
cross join lateral generate_series(
  1,
  greatest(s.reservadas - (select count(*) from public.session_guests g where g.session_id = s.id), 0)
) as gs
where s.reservadas > (select count(*) from public.session_guests g where g.session_id = s.id);

-- ── 4) RPC: listar las personas de una sesión (requiere PIN) ─────────────
create or replace function public.admin_list_guests(p_session_id uuid, p_pin text)
returns table (id uuid, nombre text, telefono text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check_pin(p_pin) then raise exception 'PIN_INCORRECTO'; end if;
  return query
    select g.id, g.nombre, g.telefono, g.created_at
    from public.session_guests g
    where g.session_id = p_session_id
    order by g.created_at;
end; $$;
grant execute on function public.admin_list_guests(uuid, text) to anon, authenticated;

-- ── 5) RPC: apuntar una persona (requiere PIN; respeta el aforo) ─────────
create or replace function public.admin_add_guest(
  p_session_id uuid, p_nombre text, p_telefono text, p_pin text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_cap int; v_count int; v_id uuid;
begin
  if not public.admin_check_pin(p_pin) then raise exception 'PIN_INCORRECTO'; end if;
  if coalesce(trim(p_nombre), '') = '' then raise exception 'NOMBRE_REQUERIDO'; end if;

  -- LOCK de la sesión: serializa el aforo (imposible pasarse de plazas)
  select capacity into v_cap from public.class_sessions where id = p_session_id for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;

  select count(*) into v_count from public.session_guests where session_id = p_session_id;
  if v_count >= v_cap then raise exception 'AFORO_COMPLETO'; end if;

  insert into public.session_guests (session_id, nombre, telefono)
  values (p_session_id, trim(p_nombre), nullif(trim(p_telefono), ''))
  returning id into v_id;
  return v_id;
end; $$;
grant execute on function public.admin_add_guest(uuid, text, text, text) to anon, authenticated;

-- ── 6) RPC: editar una persona (requiere PIN) ───────────────────────────
create or replace function public.admin_update_guest(
  p_guest_id uuid, p_nombre text, p_telefono text, p_pin text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check_pin(p_pin) then raise exception 'PIN_INCORRECTO'; end if;
  if coalesce(trim(p_nombre), '') = '' then raise exception 'NOMBRE_REQUERIDO'; end if;
  update public.session_guests
     set nombre = trim(p_nombre), telefono = nullif(trim(p_telefono), '')
   where id = p_guest_id;
end; $$;
grant execute on function public.admin_update_guest(uuid, text, text, text) to anon, authenticated;

-- ── 7) RPC: quitar una persona (requiere PIN) ───────────────────────────
create or replace function public.admin_remove_guest(p_guest_id uuid, p_pin text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check_pin(p_pin) then raise exception 'PIN_INCORRECTO'; end if;
  delete from public.session_guests where id = p_guest_id;
end; $$;
grant execute on function public.admin_remove_guest(uuid, text) to anon, authenticated;

-- ── 8) Retira el contador +/- antiguo: ahora el aforo lo llevan los nombres
drop function if exists public.set_reservadas(uuid, int, text);

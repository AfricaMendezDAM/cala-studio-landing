-- cala.studio · Vista de disponibilidad, RPCs y RLS. Correr DESPUÉS de 0001.

-- ── Vista pública del horario (plazas por el contador manual `reservadas`) ──
-- Modelo WhatsApp: el aforo lo lleva la dueña con la columna class_sessions.reservadas.
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
  (s.reservadas >= s.capacity)           as is_full
from public.class_sessions s
left join public.class_types ct on ct.slug = s.class_slug
where s.published;

grant select on public.session_availability to anon, authenticated;

-- ── RPC: reservar (self-serve, aforo atómico) ───────────────────────────
-- La identidad SIEMPRE se deriva de la cuenta (nunca del cliente) → cierra el
-- vector de spam (no se puede reservar poniendo el email de otra persona).
create or replace function public.book_session(
  p_session_id uuid,
  p_message    text default null
) returns table (booking_id uuid, spots_left int)
language plpgsql security definer set search_path = public as $$
declare
  v_cap int; v_conf int; v_starts timestamptz; v_req boolean;
  v_email text; v_nombre text; v_tel text; v_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select u.email into v_email from auth.users u where u.id = auth.uid();
  select p.nombre, p.telefono into v_nombre, v_tel
  from public.profiles p where p.id = auth.uid();
  if coalesce(trim(v_nombre), '') = '' then raise exception 'PROFILE_INCOMPLETE'; end if;

  -- LOCK de la sesión: serializa la última plaza (imposible sobrevender)
  select capacity, starts_at, requires_entitlement
    into v_cap, v_starts, v_req
  from public.class_sessions where id = p_session_id for update;
  if not found        then raise exception 'SESSION_NOT_FOUND'; end if;
  if v_starts <= now() then raise exception 'SESSION_CLOSED';    end if;

  -- Fase 3 activará aquí el gating por bono/mensual/autorización
  -- (requires_entitlement es false en Fase 1, así que se salta).

  if exists (select 1 from public.bookings
             where session_id = p_session_id and lower(email) = lower(v_email)
               and status = 'confirmed')
  then raise exception 'ALREADY_BOOKED'; end if;

  select count(*) into v_conf from public.bookings
   where session_id = p_session_id and status = 'confirmed';
  if v_conf >= v_cap then raise exception 'SESSION_FULL'; end if;

  insert into public.bookings (session_id, user_id, nombre, email, telefono, message, status, source)
  values (p_session_id, auth.uid(), v_nombre, lower(v_email),
          nullif(trim(v_tel), ''), nullif(trim(p_message), ''), 'confirmed', 'self')
  returning id into v_id;

  return query select v_id, greatest(v_cap - (v_conf + 1), 0);
end; $$;

revoke all on function public.book_session(uuid, text) from public;
grant execute on function public.book_session(uuid, text) to authenticated;

-- ── RPC: cancelar (dueño de la reserva con 12h, o admin siempre) ────────
create or replace function public.cancel_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_starts timestamptz; v_owner uuid;
begin
  select s.starts_at, b.user_id into v_starts, v_owner
  from public.bookings b join public.class_sessions s on s.id = b.session_id
  where b.id = p_booking_id and b.status = 'confirmed';
  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.is_admin() and v_owner is distinct from auth.uid() then
    raise exception 'NOT_ALLOWED';
  end if;
  if not public.is_admin() and v_starts <= now() + interval '12 hours' then
    raise exception 'TOO_LATE';
  end if;

  update public.bookings set status = 'cancelled', cancelled_at = now()
   where id = p_booking_id;
end; $$;

revoke all on function public.cancel_booking(uuid) from public;
grant execute on function public.cancel_booking(uuid) to authenticated;

-- ── Perfil automático al registrarse: vuelca nombre/teléfono del metadata ─
-- Así, al volver del magic-link, el perfil ya está completo y NO aparece la
-- segunda pantalla de "completa tu perfil".
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nombre, telefono)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'nombre',   ''),
    nullif(new.raw_user_meta_data->>'telefono', '')
  )
  on conflict (id) do update
    set nombre   = coalesce(excluded.nombre,   public.profiles.nombre),
        telefono = coalesce(excluded.telefono, public.profiles.telefono);
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Row Level Security ──────────────────────────────────────────────────
alter table public.class_types    enable row level security;
alter table public.class_sessions enable row level security;
alter table public.bookings       enable row level security;
alter table public.profiles       enable row level security;

-- Catálogo: lectura pública
drop policy if exists class_types_read on public.class_types;
create policy class_types_read on public.class_types for select using (true);

-- Sesiones: lectura pública de las publicadas; admin ve/gestiona todo
drop policy if exists class_sessions_read        on public.class_sessions;
drop policy if exists class_sessions_admin_write on public.class_sessions;
create policy class_sessions_read on public.class_sessions
  for select using (published or public.is_admin());
create policy class_sessions_admin_write on public.class_sessions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Reservas: NADIE escribe directo (solo por RPC security definer). SELECT: propia o admin.
revoke insert, update, delete on public.bookings from anon, authenticated;
drop policy if exists bookings_read on public.bookings;
create policy bookings_read on public.bookings
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Perfiles: cada quien el suyo; admin lee todos.
drop policy if exists profiles_self        on public.profiles;   -- policy antigua (schema.sql)
drop policy if exists profiles_self_read   on public.profiles;
drop policy if exists profiles_self_insert on public.profiles;
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_read on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_self_insert on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy profiles_self_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- El candado de is_admin va por trigger (robusto, no rompe el guardado del perfil):
-- un usuario normal no puede ponerse/quitarse admin; el SQL editor (auth.uid NULL) sí.
create or replace function public.freeze_is_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.is_admin := coalesce(
      (select p.is_admin from public.profiles p where p.id = new.id), false);
  end if;
  return new;
end; $$;
drop trigger if exists profiles_freeze_admin on public.profiles;
create trigger profiles_freeze_admin
  before insert or update on public.profiles
  for each row execute function public.freeze_is_admin();

-- ── Permisos de TABLA ────────────────────────────────────────────────────
-- La RLS filtra las FILAS, pero hace falta el GRANT base a la tabla o da
-- "permission denied for table ...". Supabase no siempre lo concede solo al
-- crear tablas por SQL. Las escrituras de bookings van por RPC (definer).
grant select on public.class_types, public.class_sessions to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.bookings to authenticated;

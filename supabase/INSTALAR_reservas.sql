-- cala.studio · INSTALACIÓN COMPLETA DE RESERVAS
-- Abre ESTE archivo, selecciona todo (Ctrl+A), copia y pégalo en
-- Supabase → SQL Editor → Run. Es todo de una vez, en orden.
-- Es seguro re-ejecutarlo (idempotente).

-- cala.studio · Esquema de reservas (sessions) — FUENTE ÚNICA
-- Reconcilia el esquema antiguo (classes/book_class de schema.sql) hacia el
-- modelo sessions. Correr en el SQL Editor de Supabase en orden: 0001→0002→0003→0004.
-- Idempotente: puede re-ejecutarse sin romper nada.

-- ── 0) Guard: aparta la tabla `bookings` ANTIGUA (la de class_id) para poder
--        crear la nueva sin colisión. Solo se ejecuta una vez.
do $$
begin
  if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'bookings' and column_name = 'class_id')
     and not exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'bookings_legacy')
  then
    alter table public.bookings rename to bookings_legacy;
  end if;
end $$;

-- ── 1) Catálogo de clases (labels del calendario) ───────────────────────
create table if not exists public.class_types (
  slug         text primary key,           -- 'mat' | 'sculpt'
  name         text not null,              -- 'Pilates'
  name_em      text not null,              -- 'Mat' | 'Sculpt'
  meta         text not null,              -- 'Suelo · Todos los niveles'
  duration_min int  not null default 50,
  sort_order   int  not null default 0
);

-- ── 2) Sesiones: clases recurrentes Y eventos puntuales, misma tabla ─────
create table if not exists public.class_sessions (
  id          uuid primary key default gen_random_uuid(),
  category    text not null default 'clase' check (category in ('clase','evento')),
  class_slug  text references public.class_types(slug),   -- clases; NULL en eventos
  titulo      text,                                       -- eventos (Pilates & Wine)
  descripcion text,                                       -- eventos
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  capacity    smallint not null default 8,
  requires_entitlement boolean not null default false,    -- Fase 3 lo pone true en clases
  published   boolean not null default true,              -- borrador vs visible
  created_at  timestamptz not null default now(),
  constraint class_sessions_shape check (
    (category = 'clase'  and class_slug is not null) or
    (category = 'evento' and titulo is not null)
  ),
  unique (class_slug, starts_at)   -- clases recurrentes idempotentes (NULLs no colisionan)
);
create index if not exists class_sessions_starts_at_idx on public.class_sessions (starts_at);

-- ── 3) Reservas (self-serve autenticado + invitado dado de alta por admin) ─
create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.class_sessions(id) on delete cascade,
  user_id       uuid references auth.users(id),          -- NULL = invitado (alta manual)
  nombre        text not null,
  email         text not null,
  telefono      text,
  message       text,
  status        text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  source        text not null default 'self' check (source in ('self','admin')),
  created_by    uuid references auth.users(id),          -- admin que dio de alta al invitado
  entitlement_id uuid,                                   -- FK a entitlements en Fase 3
  created_at    timestamptz not null default now(),
  cancelled_at  timestamptz
);
create index if not exists bookings_session_idx on public.bookings (session_id);
create index if not exists bookings_user_idx    on public.bookings (user_id);

-- Una sola reserva ACTIVA por email en cada sesión (evita duplicados self + admin)
create unique index if not exists bookings_one_active_per_email
  on public.bookings (session_id, lower(email))
  where status = 'confirmed';

-- ── 4) Perfil (prefill de usuarios logueados) + flag admin ──────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text,
  telefono   text,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- ── 5) Helper de rol admin (SECURITY DEFINER: lee profiles sin recursión RLS)
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false)
$$;

-- ── 6) Semilla de tipos de clase ────────────────────────────────────────
insert into public.class_types (slug, name, name_em, meta, duration_min, sort_order) values
  ('mat',    'Pilates', 'Mat',    'Suelo · Todos los niveles',       50, 1),
  ('sculpt', 'Pilates', 'Sculpt', 'Resistencia · Todos los niveles', 50, 2)
on conflict (slug) do nothing;
-- cala.studio · Vista de disponibilidad, RPCs y RLS. Correr DESPUÉS de 0001.

-- ── Vista pública de disponibilidad (solo agregados, nunca identidades) ──
create or replace view public.session_availability as
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
  count(b.id) filter (where b.status = 'confirmed')                          as confirmed_count,
  greatest(s.capacity - count(b.id) filter (where b.status = 'confirmed'), 0) as spots_left,
  (count(b.id) filter (where b.status = 'confirmed') >= s.capacity)          as is_full
from public.class_sessions s
left join public.class_types ct on ct.slug = s.class_slug
left join public.bookings    b  on b.session_id = s.id
where s.published
group by s.id, ct.slug;

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

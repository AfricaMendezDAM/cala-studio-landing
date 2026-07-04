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

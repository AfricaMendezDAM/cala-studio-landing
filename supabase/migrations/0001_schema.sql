-- cala.studio · Esquema de reservas
-- Ejecutar UNA vez en el editor SQL de Supabase (o con `supabase db push`).

-- ── Tipos de clase (fuente única de labels del calendario) ──────────────
create table if not exists public.class_types (
  slug         text primary key,           -- 'mat' | 'sculpt'
  name         text not null,              -- 'Pilates'
  name_em      text not null,              -- 'Mat' | 'Sculpt'
  meta         text not null,              -- 'Suelo · Todos los niveles'
  duration_min int  not null default 50,
  sort_order   int  not null default 0
);

-- ── Sesiones concretas (fecha + clase + hora) ───────────────────────────
create table if not exists public.class_sessions (
  id         uuid primary key default gen_random_uuid(),
  class_slug text not null references public.class_types(slug),
  starts_at  timestamptz not null,         -- instante canónico en UTC
  ends_at    timestamptz not null,
  capacity   smallint not null default 8,
  created_at timestamptz not null default now(),
  unique (class_slug, starts_at)
);
create index if not exists class_sessions_starts_at_idx
  on public.class_sessions (starts_at);

-- ── Reservas ────────────────────────────────────────────────────────────
create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.class_sessions(id) on delete cascade,
  user_id      uuid references auth.users(id),   -- NULL para invitados
  nombre       text not null,
  email        text not null,
  telefono     text not null,
  message      text,
  status       text not null default 'confirmed'
               check (status in ('confirmed','waitlist','cancelled')),
  created_at   timestamptz not null default now(),
  cancelled_at timestamptz
);
create index if not exists bookings_session_idx on public.bookings (session_id);
create index if not exists bookings_user_idx    on public.bookings (user_id);

-- Una sola reserva ACTIVA por email en cada sesión (evita duplicados)
create unique index if not exists bookings_one_active_per_email
  on public.bookings (session_id, lower(email))
  where status in ('confirmed','waitlist');

-- ── Perfil opcional (prefill de usuarios logueados) ─────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text,
  telefono   text,
  created_at timestamptz not null default now()
);

-- ── Semilla de tipos de clase ───────────────────────────────────────────
insert into public.class_types (slug, name, name_em, meta, duration_min, sort_order) values
  ('mat',    'Pilates', 'Mat',    'Suelo · Todos los niveles',       50, 1),
  ('sculpt', 'Pilates', 'Sculpt', 'Resistencia · Todos los niveles', 50, 2)
on conflict (slug) do nothing;

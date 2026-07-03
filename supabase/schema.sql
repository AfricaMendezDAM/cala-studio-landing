-- ============================================================
-- cala.studio · reservas · esquema inicial
-- Pega TODO esto en el SQL Editor de Supabase y pulsa "Run".
-- Es idempotente: puedes ejecutarlo más de una vez sin romper nada.
-- ============================================================

-- 1) TABLAS ---------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text,
  telefono   text,
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id         uuid primary key default gen_random_uuid(),
  tipo       text not null check (tipo in ('mat','sculpt')),
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  capacity   int  not null default 8,
  created_at timestamptz not null default now(),
  unique (tipo, starts_at)
);

create table if not exists public.bookings (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id) on delete cascade,
  user_id    uuid not null references auth.users(id)     on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, user_id)
);

-- 2) SEGURIDAD (RLS) -----------------------------------------
alter table public.profiles enable row level security;
alter table public.classes  enable row level security;
alter table public.bookings enable row level security;

drop policy if exists "perfil: ver propio"    on public.profiles;
drop policy if exists "perfil: crear propio"  on public.profiles;
drop policy if exists "perfil: editar propio" on public.profiles;
create policy "perfil: ver propio"    on public.profiles for select using (auth.uid() = id);
create policy "perfil: crear propio"  on public.profiles for insert with check (auth.uid() = id);
create policy "perfil: editar propio" on public.profiles for update using (auth.uid() = id);

drop policy if exists "clases: leer" on public.classes;
create policy "clases: leer" on public.classes for select using (true);

drop policy if exists "reservas: ver propias"     on public.bookings;
drop policy if exists "reservas: cancelar propia" on public.bookings;
create policy "reservas: ver propias" on public.bookings for select using (auth.uid() = user_id);
-- cancelar: solo la propia y con >= 12h de antelación
create policy "reservas: cancelar propia" on public.bookings for delete using (
  auth.uid() = user_id
  and (select starts_at from public.classes c where c.id = bookings.class_id) > now() + interval '12 hours'
);
-- (no hay policy de INSERT: reservar se hace por la función book_class, con control de aforo)

-- 3) DISPONIBILIDAD (cuenta de plazas, sin exponer quién ha reservado)
create or replace function public.availability()
returns table (
  class_id uuid, tipo text, starts_at timestamptz, ends_at timestamptz,
  capacity int, booked int, free int
)
language sql stable security definer set search_path = public as $$
  select c.id, c.tipo, c.starts_at, c.ends_at, c.capacity,
         count(b.id)::int as booked,
         greatest(c.capacity - count(b.id), 0)::int as free
  from public.classes c
  left join public.bookings b on b.class_id = c.id
  group by c.id
  order by c.starts_at;
$$;
grant execute on function public.availability() to anon, authenticated;

-- 4) RESERVAR (atómico: bloquea la clase → imposible sobrevender)
create or replace function public.book_class(_class_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare _cap int; _cnt int; _starts timestamptz;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select capacity, starts_at into _cap, _starts
  from public.classes where id = _class_id for update;   -- lock de la fila
  if not found then raise exception 'CLASS_NOT_FOUND'; end if;
  if _starts <= now() then raise exception 'CLASS_PAST'; end if;

  select count(*) into _cnt from public.bookings where class_id = _class_id;
  if _cnt >= _cap then raise exception 'CLASS_FULL'; end if;

  insert into public.bookings (class_id, user_id)
  values (_class_id, auth.uid())
  on conflict (class_id, user_id) do nothing;
end; $$;
grant execute on function public.book_class(uuid) to authenticated;

-- 5) PERFIL AUTOMÁTICO al registrarse ------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6) SEMILLA de clases · Martes y Jueves · Mat 9:00 · Sculpt 10:00 · hasta 31 ago
insert into public.classes (tipo, starts_at, ends_at, capacity)
select s.tipo,
       (g.d::date + s.t_start) at time zone 'Europe/Madrid',
       (g.d::date + s.t_end)   at time zone 'Europe/Madrid',
       8
from generate_series(current_date::timestamp, timestamp '2026-08-31', interval '1 day') as g(d)
cross join (values
  ('mat',    time '09:00', time '09:50'),
  ('sculpt', time '10:00', time '10:50')
) as s(tipo, t_start, t_end)
where extract(dow from g.d) in (2, 4)   -- 2 = martes, 4 = jueves
on conflict (tipo, starts_at) do nothing;

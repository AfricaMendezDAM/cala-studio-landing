-- cala.studio · Bonos y recuperaciones de clase (panel de gestión)
--
--   · BONOS: quién compró un bono, cuántas clases lleva gastadas y cuántas le
--     quedan. Cada clase consumida se apunta con su fecha (y una nota si quieres
--     acordarte de cuál fue), así siempre se sabe qué consume cada quien.
--   · RECUPERACIONES: quién tiene una clase pendiente de recuperar porque le
--     cambiaste la hora (o por lo que sea) y cuándo la recupera.
--
-- Las dos tablas van con RLS activada y SIN políticas: nadie las toca desde el
-- navegador. Todo pasa por las funciones SECURITY DEFINER de abajo, que piden
-- el PIN del panel — el mismo modelo que las reservas y los pagos.
--
-- Correr DESPUÉS de 0001-0010. Idempotente: puede re-ejecutarse sin romper nada.

-- ── 0) Pilates & Wine se mueve al sábado 15 de agosto ────────────────────
update public.class_sessions
   set starts_at = timestamp '2026-08-15 10:30' at time zone 'Europe/Madrid',
       ends_at   = timestamp '2026-08-15 13:00' at time zone 'Europe/Madrid'
 where evento_slug = 'pilates-and-wine';

-- ── 1) Bonos ─────────────────────────────────────────────────────────────
create table if not exists public.class_packs (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  telefono   text,
  email      text,
  concepto   text not null,                                  -- 'Bono 10 clases'
  total      smallint not null check (total between 1 and 100),
  caduca     date,
  nota       text,
  created_at timestamptz not null default now()
);
create index if not exists class_packs_nombre_idx on public.class_packs (lower(nombre));
alter table public.class_packs enable row level security;

-- Cada clase gastada de un bono, con su fecha
create table if not exists public.pack_uses (
  id         uuid primary key default gen_random_uuid(),
  pack_id    uuid not null references public.class_packs(id) on delete cascade,
  session_id uuid references public.class_sessions(id) on delete set null,
  usado_en   date not null default ((now() at time zone 'Europe/Madrid')::date),
  nota       text,
  created_at timestamptz not null default now()
);
create index if not exists pack_uses_pack_idx on public.pack_uses (pack_id, usado_en);
alter table public.pack_uses enable row level security;

-- ── 2) Recuperaciones ────────────────────────────────────────────────────
create table if not exists public.makeup_classes (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  telefono      text,
  perdida_en    date,                                        -- la clase que no pudo hacer
  motivo        text not null default 'Cambio de horario',
  estado        text not null default 'pendiente' check (estado in ('pendiente','recuperada')),
  recuperada_en date,
  nota          text,
  created_at    timestamptz not null default now()
);
create index if not exists makeup_classes_estado_idx on public.makeup_classes (estado, perdida_en);
alter table public.makeup_classes enable row level security;

-- ── 3) RPCs de bonos ─────────────────────────────────────────────────────
create or replace function public.admin_list_packs(p_pin text)
returns table (
  id uuid, nombre text, telefono text, email text, concepto text,
  total int, usadas int, restantes int, caduca date, nota text, created_at timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check_pin(p_pin) then raise exception 'PIN_INCORRECTO'; end if;
  return query
    select p.id, p.nombre, p.telefono, p.email, p.concepto,
           p.total::int,
           u.usadas,
           greatest(p.total - u.usadas, 0) as restantes,
           p.caduca, p.nota, p.created_at
    from public.class_packs p
    cross join lateral (
      select count(*)::int as usadas from public.pack_uses x where x.pack_id = p.id
    ) u
    -- primero los que aún tienen clases, luego por caducidad más cercana
    order by (greatest(p.total - u.usadas, 0) = 0), p.caduca nulls last, lower(p.nombre);
end; $$;
grant execute on function public.admin_list_packs(text) to anon, authenticated;

create or replace function public.admin_add_pack(
  p_nombre text, p_telefono text, p_email text, p_concepto text,
  p_total int, p_caduca date, p_nota text, p_pin text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.admin_check_pin(p_pin) then raise exception 'PIN_INCORRECTO'; end if;
  if coalesce(trim(p_nombre), '')   = '' then raise exception 'NOMBRE_REQUERIDO';   end if;
  if coalesce(trim(p_concepto), '') = '' then raise exception 'CONCEPTO_REQUERIDO'; end if;
  if p_total is null or p_total < 1 or p_total > 100 then raise exception 'TOTAL_INVALIDO'; end if;

  insert into public.class_packs (nombre, telefono, email, concepto, total, caduca, nota)
  values (trim(p_nombre), nullif(trim(p_telefono), ''), nullif(lower(trim(p_email)), ''),
          trim(p_concepto), p_total, p_caduca, nullif(trim(p_nota), ''))
  returning id into v_id;
  return v_id;
end; $$;
grant execute on function public.admin_add_pack(text, text, text, text, int, date, text, text) to anon, authenticated;

create or replace function public.admin_update_pack(
  p_id uuid, p_nombre text, p_telefono text, p_email text, p_concepto text,
  p_total int, p_caduca date, p_nota text, p_pin text
) returns void
language plpgsql security definer set search_path = public as $$
declare v_usadas int;
begin
  if not public.admin_check_pin(p_pin) then raise exception 'PIN_INCORRECTO'; end if;
  if coalesce(trim(p_nombre), '') = '' then raise exception 'NOMBRE_REQUERIDO'; end if;
  if p_total is null or p_total < 1 or p_total > 100 then raise exception 'TOTAL_INVALIDO'; end if;

  -- No se puede dejar el bono en menos clases de las que ya se han gastado
  select count(*) into v_usadas from public.pack_uses where pack_id = p_id;
  if p_total < v_usadas then raise exception 'TOTAL_MENOR_QUE_USADAS'; end if;

  update public.class_packs set
    nombre   = trim(p_nombre),
    telefono = nullif(trim(p_telefono), ''),
    email    = nullif(lower(trim(p_email)), ''),
    concepto = coalesce(nullif(trim(p_concepto), ''), concepto),
    total    = p_total,
    caduca   = p_caduca,
    nota     = nullif(trim(p_nota), '')
  where id = p_id;
end; $$;
grant execute on function public.admin_update_pack(uuid, text, text, text, text, int, date, text, text) to anon, authenticated;

create or replace function public.admin_remove_pack(p_id uuid, p_pin text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check_pin(p_pin) then raise exception 'PIN_INCORRECTO'; end if;
  delete from public.class_packs where id = p_id;   -- los usos caen con él (cascade)
end; $$;
grant execute on function public.admin_remove_pack(uuid, text) to anon, authenticated;

-- Gastar una clase del bono. Bloquea la fila del bono: imposible pasarse aunque
-- se pulse dos veces seguidas.
create or replace function public.admin_use_pack(
  p_pack_id uuid, p_usado_en date, p_nota text, p_pin text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_total int; v_usadas int; v_id uuid;
begin
  if not public.admin_check_pin(p_pin) then raise exception 'PIN_INCORRECTO'; end if;

  select total into v_total from public.class_packs where id = p_pack_id for update;
  if not found then raise exception 'BONO_NO_ENCONTRADO'; end if;

  select count(*) into v_usadas from public.pack_uses where pack_id = p_pack_id;
  if v_usadas >= v_total then raise exception 'BONO_AGOTADO'; end if;

  insert into public.pack_uses (pack_id, usado_en, nota)
  values (p_pack_id,
          coalesce(p_usado_en, (now() at time zone 'Europe/Madrid')::date),
          nullif(trim(p_nota), ''))
  returning id into v_id;
  return v_id;
end; $$;
grant execute on function public.admin_use_pack(uuid, date, text, text) to anon, authenticated;

create or replace function public.admin_list_pack_uses(p_pack_id uuid, p_pin text)
returns table (id uuid, usado_en date, nota text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check_pin(p_pin) then raise exception 'PIN_INCORRECTO'; end if;
  return query
    select u.id, u.usado_en, u.nota, u.created_at
    from public.pack_uses u
    where u.pack_id = p_pack_id
    order by u.usado_en desc, u.created_at desc;
end; $$;
grant execute on function public.admin_list_pack_uses(uuid, text) to anon, authenticated;

create or replace function public.admin_remove_pack_use(p_use_id uuid, p_pin text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check_pin(p_pin) then raise exception 'PIN_INCORRECTO'; end if;
  delete from public.pack_uses where id = p_use_id;
end; $$;
grant execute on function public.admin_remove_pack_use(uuid, text) to anon, authenticated;

-- ── 4) RPCs de recuperaciones ────────────────────────────────────────────
create or replace function public.admin_list_makeups(p_pin text)
returns table (
  id uuid, nombre text, telefono text, perdida_en date, motivo text,
  estado text, recuperada_en date, nota text, created_at timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check_pin(p_pin) then raise exception 'PIN_INCORRECTO'; end if;
  return query
    select m.id, m.nombre, m.telefono, m.perdida_en, m.motivo,
           m.estado, m.recuperada_en, m.nota, m.created_at
    from public.makeup_classes m
    -- pendientes arriba, y dentro de cada grupo la clase perdida más antigua primero
    order by (m.estado = 'recuperada'), m.perdida_en nulls last, m.created_at;
end; $$;
grant execute on function public.admin_list_makeups(text) to anon, authenticated;

create or replace function public.admin_add_makeup(
  p_nombre text, p_telefono text, p_perdida_en date, p_motivo text, p_nota text, p_pin text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.admin_check_pin(p_pin) then raise exception 'PIN_INCORRECTO'; end if;
  if coalesce(trim(p_nombre), '') = '' then raise exception 'NOMBRE_REQUERIDO'; end if;

  insert into public.makeup_classes (nombre, telefono, perdida_en, motivo, nota)
  values (trim(p_nombre), nullif(trim(p_telefono), ''), p_perdida_en,
          coalesce(nullif(trim(p_motivo), ''), 'Cambio de horario'),
          nullif(trim(p_nota), ''))
  returning id into v_id;
  return v_id;
end; $$;
grant execute on function public.admin_add_makeup(text, text, date, text, text, text) to anon, authenticated;

-- Marcar como recuperada (con la fecha en la que la recupera) o devolverla a
-- pendiente si te equivocaste.
create or replace function public.admin_set_makeup_estado(
  p_id uuid, p_estado text, p_recuperada_en date, p_pin text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check_pin(p_pin) then raise exception 'PIN_INCORRECTO'; end if;
  if p_estado not in ('pendiente', 'recuperada') then raise exception 'ESTADO_INVALIDO'; end if;

  update public.makeup_classes set
    estado        = p_estado,
    recuperada_en = case
                      when p_estado = 'recuperada'
                      then coalesce(p_recuperada_en, (now() at time zone 'Europe/Madrid')::date)
                      else null
                    end
  where id = p_id;
end; $$;
grant execute on function public.admin_set_makeup_estado(uuid, text, date, text) to anon, authenticated;

create or replace function public.admin_remove_makeup(p_id uuid, p_pin text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check_pin(p_pin) then raise exception 'PIN_INCORRECTO'; end if;
  delete from public.makeup_classes where id = p_id;
end; $$;
grant execute on function public.admin_remove_makeup(uuid, text) to anon, authenticated;

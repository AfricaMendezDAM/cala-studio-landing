-- cala.studio · Registro de pagos (panel de gestión, PIN)
-- Un libro de cobros aparte de las reservas: por PERSONA y por QUÉ compró
-- (mensualidad, bono, clase suelta), con su importe y si está pagado o pendiente.
-- No toca el aforo ni las sesiones; es una lista independiente.
-- Correr DESPUÉS de 0001-0006. Idempotente: puede re-ejecutarse sin romper nada.

-- ── 1) Tabla de pagos ────────────────────────────────────────────────────
create table if not exists public.payments (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  telefono   text,
  concepto   text not null,                 -- qué compró (Mensual 1/sem, Bono 5…)
  importe    numeric(8,2) not null default 0,
  metodo     text check (metodo in ('efectivo','bizum','transferencia')),
  nota       text,
  estado     text not null default 'pendiente' check (estado in ('pendiente','pagado')),
  created_at timestamptz not null default now(),
  paid_at    timestamptz                     -- cuándo se marcó pagado (NULL si pendiente)
);
create index if not exists payments_estado_idx on public.payments (estado, created_at);

-- RLS activada y SIN políticas → nadie lee/escribe la tabla directamente.
-- Solo las funciones SECURITY DEFINER de abajo (validando el PIN) la tocan.
alter table public.payments enable row level security;

-- ── 2) RPC: listar todos los pagos (requiere PIN) ────────────────────────
-- Pendientes primero (los que hay que cobrar), y dentro, los más recientes arriba.
create or replace function public.admin_list_payments(p_pin text)
returns table (
  id uuid, nombre text, telefono text, concepto text,
  importe numeric, metodo text, nota text, estado text,
  created_at timestamptz, paid_at timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check_pin(p_pin) then raise exception 'PIN_INCORRECTO'; end if;
  return query
    select p.id, p.nombre, p.telefono, p.concepto, p.importe, p.metodo,
           p.nota, p.estado, p.created_at, p.paid_at
    from public.payments p
    order by (p.estado = 'pendiente') desc, p.created_at desc;
end; $$;
grant execute on function public.admin_list_payments(text) to anon, authenticated;

-- ── 3) RPC: apuntar un pago (requiere PIN) ───────────────────────────────
create or replace function public.admin_add_payment(
  p_nombre text, p_telefono text, p_concepto text, p_importe numeric,
  p_metodo text, p_nota text, p_estado text, p_pin text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_estado text; v_id uuid;
begin
  if not public.admin_check_pin(p_pin) then raise exception 'PIN_INCORRECTO'; end if;
  if coalesce(trim(p_nombre),   '') = '' then raise exception 'NOMBRE_REQUERIDO'; end if;
  if coalesce(trim(p_concepto), '') = '' then raise exception 'CONCEPTO_REQUERIDO'; end if;

  v_estado := coalesce(nullif(trim(p_estado), ''), 'pendiente');
  if v_estado not in ('pendiente','pagado') then raise exception 'ESTADO_INVALIDO'; end if;

  insert into public.payments (nombre, telefono, concepto, importe, metodo, nota, estado, paid_at)
  values (
    trim(p_nombre),
    nullif(trim(p_telefono), ''),
    trim(p_concepto),
    coalesce(p_importe, 0),
    nullif(trim(p_metodo), ''),
    nullif(trim(p_nota), ''),
    v_estado,
    case when v_estado = 'pagado' then now() else null end
  )
  returning id into v_id;
  return v_id;
end; $$;
grant execute on function public.admin_add_payment(text, text, text, numeric, text, text, text, text) to anon, authenticated;

-- ── 4) RPC: editar un pago (requiere PIN) ────────────────────────────────
create or replace function public.admin_update_payment(
  p_id uuid, p_nombre text, p_telefono text, p_concepto text, p_importe numeric,
  p_metodo text, p_nota text, p_pin text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check_pin(p_pin) then raise exception 'PIN_INCORRECTO'; end if;
  if coalesce(trim(p_nombre),   '') = '' then raise exception 'NOMBRE_REQUERIDO'; end if;
  if coalesce(trim(p_concepto), '') = '' then raise exception 'CONCEPTO_REQUERIDO'; end if;
  update public.payments
     set nombre   = trim(p_nombre),
         telefono = nullif(trim(p_telefono), ''),
         concepto = trim(p_concepto),
         importe  = coalesce(p_importe, 0),
         metodo   = nullif(trim(p_metodo), ''),
         nota     = nullif(trim(p_nota), '')
   where id = p_id;
end; $$;
grant execute on function public.admin_update_payment(uuid, text, text, text, numeric, text, text, text) to anon, authenticated;

-- ── 5) RPC: marcar pagado / pendiente (requiere PIN) ─────────────────────
create or replace function public.admin_set_payment_estado(p_id uuid, p_estado text, p_pin text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check_pin(p_pin) then raise exception 'PIN_INCORRECTO'; end if;
  if p_estado not in ('pendiente','pagado') then raise exception 'ESTADO_INVALIDO'; end if;
  update public.payments
     set estado  = p_estado,
         paid_at = case when p_estado = 'pagado' then now() else null end
   where id = p_id;
end; $$;
grant execute on function public.admin_set_payment_estado(uuid, text, text) to anon, authenticated;

-- ── 6) RPC: borrar un pago (requiere PIN) ────────────────────────────────
create or replace function public.admin_remove_payment(p_id uuid, p_pin text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check_pin(p_pin) then raise exception 'PIN_INCORRECTO'; end if;
  delete from public.payments where id = p_id;
end; $$;
grant execute on function public.admin_remove_payment(uuid, text) to anon, authenticated;

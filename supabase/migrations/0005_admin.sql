-- cala.studio · Panel de aforo (modelo WhatsApp) — PIN + RPCs de escritura
-- Correr DESPUÉS de 0001-0004. Idempotente.

-- ── Ajustes privados (PIN de gestión) ───────────────────────────────────
create table if not exists public.admin_settings (
  id  int  primary key default 1,
  pin text not null,
  constraint admin_settings_singleton check (id = 1)
);
-- RLS activada y SIN políticas → nadie lee/escribe la tabla directamente.
-- Solo las funciones SECURITY DEFINER de abajo la consultan.
alter table public.admin_settings enable row level security;

-- La dueña fija su PIN una vez (cámbialo por el tuyo):
--   insert into public.admin_settings (id, pin) values (1, 'TU-PIN')
--   on conflict (id) do update set pin = excluded.pin;

-- ── Verificar PIN (no expone el PIN, solo devuelve true/false) ───────────
create or replace function public.admin_check_pin(p_pin text)
returns boolean
language sql security definer set search_path = public as $$
  select exists (select 1 from public.admin_settings where id = 1 and pin = p_pin);
$$;
grant execute on function public.admin_check_pin(text) to anon, authenticated;

-- ── Fijar el aforo manual de una sesión (requiere PIN correcto) ──────────
create or replace function public.set_reservadas(p_session_id uuid, p_reservadas int, p_pin text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check_pin(p_pin) then
    raise exception 'PIN_INCORRECTO';
  end if;
  update public.class_sessions
     set reservadas = greatest(0, least(p_reservadas, capacity))
   where id = p_session_id;
end; $$;
grant execute on function public.set_reservadas(uuid, int, text) to anon, authenticated;

-- cala.studio · Cambiar el PIN del panel desde el propio panel
--
-- Hasta ahora el PIN solo se cambiaba a mano por SQL. Con esto, desde
-- #/gestion → "Cambiar PIN" se pone uno nuevo sin tocar la base.
--
-- Para cambiarlo hay que saber el actual: la función lo comprueba antes de
-- nada, así que el botón solo sirve a quien ya ha entrado con el PIN bueno.
--
-- Correr DESPUÉS de 0001-0012. Idempotente.

create or replace function public.admin_set_pin(p_old_pin text, p_new_pin text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_new text;
begin
  if not public.admin_check_pin(p_old_pin) then raise exception 'PIN_INCORRECTO'; end if;

  v_new := trim(coalesce(p_new_pin, ''));
  if length(v_new) < 4  then raise exception 'PIN_CORTO';  end if;
  if length(v_new) > 32 then raise exception 'PIN_LARGO';  end if;

  update public.admin_settings set pin = v_new where id = 1;
end; $$;
grant execute on function public.admin_set_pin(text, text) to anon, authenticated;

-- Si alguna vez te quedas fuera del panel, el PIN se repone por SQL:
--   insert into public.admin_settings (id, pin) values (1, 'TU-PIN-NUEVO')
--   on conflict (id) do update set pin = excluded.pin;

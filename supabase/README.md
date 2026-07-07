# cala.studio · Backend de reservas (Supabase)

Sistema de reservas real: plazas que se restan de verdad para todos, lista de
espera, login opcional y email al dueño en cada reserva. **Aforo = 8** por clase.

El frontend sigue siendo estático; Supabase pone la base de datos, el login y el
envío de email. Sigue estos pasos **una vez**.

---

## 1. Crear el proyecto Supabase
1. Entra en <https://supabase.com> → **New project** (plan gratuito).
2. Cuando esté listo: **Project Settings → API** y copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
3. Crea el archivo `.env` en la raíz del proyecto (copia de `.env.example`) y pega esos dos valores.
   > Son claves públicas: no pasa nada porque acaben en el frontend. La seguridad la dan las políticas RLS.

## 2. Crear las tablas y la lógica
En el panel de Supabase → **SQL Editor** → pega y ejecuta, en orden:
1. `migrations/0001_schema.sql`  (tablas + tipos de clase)
2. `migrations/0002_rpc_rls.sql`  (vista de disponibilidad + reservar/cancelar + seguridad)
3. `migrations/0003_seed_sessions.sql`  (genera las clases Mar/Jue hasta el 31 ago 2026)
4. `migrations/0004_reconcile.sql` · `0005_admin.sql` · `0006_admin_guests.sql`  (panel de aforo + PIN)
5. `migrations/0007_admin_payments.sql`  (registro de pagos: quién debe / quién ha pagado y el qué)

*Comprobación:* `select count(*) from class_sessions;` debe devolver un número > 0.

> El **PIN** del panel se fija una vez (ver comentario en `0005_admin.sql`):
> `insert into public.admin_settings (id, pin) values (1, 'TU-PIN') on conflict (id) do update set pin = excluded.pin;`

## 3. Activar el login por email (magic link)
**Authentication → Providers → Email**: deja activado **Email**.
**Authentication → URL Configuration → Site URL**: pon tu dominio de producción
(y añade `http://localhost:5173` en *Redirect URLs* para desarrollo).

## 4. Email al dueño en cada reserva (Resend)
1. Crea cuenta en <https://resend.com> y una **API Key**.
   - Para empezar puedes usar el remitente de pruebas `onboarding@resend.dev`.
   - Para producción, verifica tu dominio y define `FROM_EMAIL` (ej. `reservas@tudominio.com`).
2. Despliega la función y sus secretos (necesitas la [CLI de Supabase](https://supabase.com/docs/guides/cli)):
   ```bash
   supabase login
   supabase link --project-ref TU-REF-DE-PROYECTO
   supabase functions deploy notify-booking
   supabase secrets set RESEND_API_KEY=re_xxx OWNER_EMAIL=tu@email.com
   # opcional, si verificas dominio:  FROM_EMAIL="cala.studio <reservas@tudominio.com>"
   ```
3. **Database → Webhooks → Create a new hook**:
   - Tabla: `bookings` · Evento: **INSERT**
   - Tipo: **Supabase Edge Functions** → `notify-booking`
   - Guardar. A partir de ahí, cada reserva te manda un email.

## 5. Producción (Vercel)
En el proyecto de Vercel → **Settings → Environment Variables** añade
`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (los mismos del `.env`). Redeploy.

---

## Qué me tienes que pasar a mí (para conectar el frontend)
- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (paso 1).
- Con eso conecto el calendario en vivo, el flujo de reserva y el login.
- El `RESEND_API_KEY` y el `OWNER_EMAIL` van solo en los secretos de la función (paso 4): **nunca en el frontend**, así que esos configúralos tú en Supabase.

## Notas
- **Aforo atómico:** reservar pasa siempre por la función `book_session`, que bloquea la
  fila de la sesión — es imposible que dos personas cojan la última plaza a la vez.
- **Lista de espera:** al llegar a 8, las siguientes reservas quedan en `waitlist`. La
  promoción (pasar a alguien de la lista a confirmado si se libera plaza) es **manual** por ahora.
- **Cancelar:** por ahora solo cancela quien está logueado y es dueño de su reserva; los
  invitados cancelan escribiéndote.
- **Fin de temporada:** no hay sesiones después del 31 ago 2026, así que el calendario se vacía solo.

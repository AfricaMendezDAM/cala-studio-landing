// cala.studio · notify-booking
// Envía un email al dueño en cada reserva nueva.
// Se dispara con un Database Webhook (INSERT en public.bookings) → esta función.
// Secretos (supabase secrets set): RESEND_API_KEY, OWNER_EMAIL, FROM_EMAIL (opcional).
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los aporta Supabase automáticamente.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const OWNER_EMAIL     = Deno.env.get("OWNER_EMAIL")!;
// Mientras no verifiques tu dominio en Resend, usa el remitente de pruebas:
const FROM_EMAIL      = Deno.env.get("FROM_EMAIL") ?? "cala.studio <onboarding@resend.dev>";
const SUPABASE_URL    = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

const fmt = new Intl.DateTimeFormat("es-ES", {
  weekday: "long", day: "numeric", month: "long",
  hour: "2-digit", minute: "2-digit",
  timeZone: "Europe/Madrid",
});

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    // Database Webhook → { type, table, record, old_record, schema }
    const booking = payload.record ?? payload;
    if (!booking?.session_id) {
      return new Response("sin reserva", { status: 200 });
    }

    // Detalles de la sesión (nombre de clase, hora, plazas restantes)
    const { data: sess } = await admin
      .from("session_availability")
      .select("name, name_em, starts_at, spots_left")
      .eq("session_id", booking.session_id)
      .single();

    const clase   = sess ? `${sess.name} ${sess.name_em}` : "Clase";
    const cuando  = sess ? fmt.format(new Date(sess.starts_at)) : "—";
    const espera  = booking.status === "waitlist";
    const badge   = espera ? "⏳ LISTA DE ESPERA" : "✅ CONFIRMADA";

    const subject = `Nueva reserva — ${clase} · ${cuando} [${espera ? "LISTA DE ESPERA" : "CONFIRMADA"}]`;
    const html = `
      <div style="font-family:system-ui,Arial,sans-serif;max-width:520px">
        <h2 style="margin:0 0 4px">Nueva reserva ${badge}</h2>
        <p style="font-size:16px;margin:0 0 16px"><strong>${clase}</strong><br>${cuando}</p>
        <table style="font-size:14px;line-height:1.7">
          <tr><td><strong>Nombre</strong></td><td>&nbsp;${booking.nombre ?? ""}</td></tr>
          <tr><td><strong>Email</strong></td><td>&nbsp;${booking.email ?? ""}</td></tr>
          <tr><td><strong>Teléfono</strong></td><td>&nbsp;${booking.telefono ?? ""}</td></tr>
        </table>
        ${booking.message ? `<p style="font-size:14px"><strong>Mensaje:</strong> ${booking.message}</p>` : ""}
        ${sess ? `<p style="font-size:13px;color:#666">Plazas libres tras esta reserva: ${sess.spots_left}</p>` : ""}
        ${espera ? `<p style="font-size:13px;color:#b45309"><em>En lista de espera. Si se libera una plaza, confírmala manualmente.</em></p>` : ""}
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [OWNER_EMAIL],
        reply_to: booking.email,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      console.error("Resend error:", await res.text());
      return new Response("email failed", { status: 500 });
    }
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response("error", { status: 500 });
  }
});

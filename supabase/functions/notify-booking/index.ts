// cala.studio · notify-booking
// Un solo Database Webhook en public.bookings cubre los 3 casos:
//   - INSERT confirmada  → aviso a la dueña + confirmación al cliente
//   - UPDATE a cancelled → aviso a la dueña de la cancelación
// Cubre reserva self-serve, alta manual de invitado y presencial (todas son un INSERT).
// Secretos (supabase secrets set): RESEND_API_KEY, OWNER_EMAIL, FROM_EMAIL (opcional), STUDIO_ADDRESS (opcional).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const OWNER_EMAIL    = Deno.env.get("OWNER_EMAIL")!;
const FROM_EMAIL     = Deno.env.get("FROM_EMAIL") ?? "cala.studio <onboarding@resend.dev>";
const STUDIO_ADDRESS = Deno.env.get("STUDIO_ADDRESS")
  ?? "Terraza Restaurante Meloxeira Praia · San Vicente do Mar, O Grove";
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

const fmt = new Intl.DateTimeFormat("es-ES", {
  weekday: "long", day: "numeric", month: "long",
  hour: "2-digit", minute: "2-digit",
  timeZone: "Europe/Madrid",
});

async function sendEmail(to: string, subject: string, html: string, replyTo?: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], reply_to: replyTo, subject, html }),
  });
  if (!res.ok) console.error("Resend error:", await res.text());
  return res.ok;
}

const wrap = (inner: string) =>
  `<div style="font-family:system-ui,Arial,sans-serif;max-width:520px;color:#1a1a1a">${inner}</div>`;

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    // Database Webhook → { type, table, record, old_record, schema }
    const b   = payload.record ?? payload;
    const old = payload.old_record ?? null;
    const type = payload.type ?? "INSERT";
    if (!b?.session_id) return new Response("sin reserva", { status: 200 });

    const isCancel = type === "UPDATE" && b.status === "cancelled" && old?.status !== "cancelled";
    const isNew    = type === "INSERT" && b.status === "confirmed";
    if (!isNew && !isCancel) return new Response("ignorado", { status: 200 });

    // Detalles de la sesión (nombre de clase/evento, hora, plazas restantes)
    const { data: sess } = await admin
      .from("session_availability")
      .select("name, name_em, starts_at, spots_left")
      .eq("session_id", b.session_id)
      .single();

    const clase  = sess ? `${sess.name}${sess.name_em ? " " + sess.name_em : ""}` : "Sesión";
    const cuando = sess ? fmt.format(new Date(sess.starts_at)) : "—";

    if (isCancel) {
      await sendEmail(
        OWNER_EMAIL,
        `Reserva cancelada · ${clase} · ${cuando}`,
        wrap(`
          <h2 style="margin:0 0 4px">Reserva cancelada</h2>
          <p style="font-size:16px;margin:0 0 12px"><strong>${clase}</strong><br>${cuando}</p>
          <p style="font-size:14px">${b.nombre ?? ""} — ${b.email ?? ""}</p>
          ${sess ? `<p style="font-size:13px;color:#666">Ahora quedan ${sess.spots_left} plazas libres</p>` : ""}
        `),
        b.email,
      );
      return new Response("ok", { status: 200 });
    }

    // isNew → aviso a la dueña
    await sendEmail(
      OWNER_EMAIL,
      `Nueva reserva · ${clase} · ${cuando}`,
      wrap(`
        <h2 style="margin:0 0 4px">Nueva reserva</h2>
        <p style="font-size:16px;margin:0 0 12px"><strong>${clase}</strong><br>${cuando}</p>
        <table style="font-size:14px;line-height:1.7">
          <tr><td><strong>Nombre</strong></td><td>&nbsp;${b.nombre ?? ""}</td></tr>
          <tr><td><strong>Email</strong></td><td>&nbsp;${b.email ?? ""}</td></tr>
          <tr><td><strong>Teléfono</strong></td><td>&nbsp;${b.telefono ?? "—"}</td></tr>
          ${b.source === "admin" ? `<tr><td><strong>Origen</strong></td><td>&nbsp;alta manual (presencial)</td></tr>` : ""}
        </table>
        ${sess ? `<p style="font-size:13px;color:#666">Quedan ${sess.spots_left} plazas libres</p>` : ""}
      `),
      b.email,
    );

    // isNew → confirmación al cliente
    if (b.email) {
      const saludo = b.source === "admin"
        ? `${b.nombre ?? "Hola"}, te hemos guardado plaza en`
        : `Hola ${b.nombre ?? ""}<br>Tienes plaza en`;
      await sendEmail(
        b.email,
        `Tu plaza está reservada · ${clase} ${cuando}`,
        wrap(`
          <p style="font-size:16px;margin:0 0 12px">${saludo} <strong>${clase}</strong><br>${cuando}</p>
          <p style="font-size:14px;line-height:1.6">Nos vemos en cala.studio<br>${STUDIO_ADDRESS}</p>
          <p style="font-size:13px;color:#555;line-height:1.6">
            La reserva aparta tu hueco — el pago es en persona o por Bizum<br>
            Si no puedes venir, cancela desde la web hasta 12&nbsp;h antes de la clase
          </p>
          <p style="font-size:14px;margin-top:16px">Un abrazo<br>cala.studio</p>
        `),
      );
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response("error", { status: 500 });
  }
});

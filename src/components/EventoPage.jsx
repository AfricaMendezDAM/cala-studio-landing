import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "../lib/supabase.js";
import { getEvento, CONTACT, EVENTO_AGOTADO } from "../data.js";

const WA_NUMBER = CONTACT.phoneHref.replace(/\D/g, "");
const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Cada línea del texto (voz sin puntos) se separa con salto de línea.
function MultiLine({ text, className }) {
  const lines = (text || "").split("\n");
  if (lines.length === 1 && lines[0] === "") return null;
  return (
    <p className={className}>
      {lines.map((l, i, a) => (
        <span key={i}>{l}{i < a.length - 1 && <br />}</span>
      ))}
    </p>
  );
}

/* ── Iconos de compartir (trazo, al tono del resto del sitio) ──────────── */
const svgProps = {
  viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true",
};
const IconWhatsApp = () => (
  <svg {...svgProps}><path d="M21 11.5a8.4 8.4 0 0 1-12.6 7.3L3 20.5l1.7-5.4A8.4 8.4 0 1 1 21 11.5z" /><path d="M8.7 9c.3 1.4 1.3 2.9 2.5 4 .9.8 2 1.4 3.1 1.7" /></svg>
);
const IconInstagram = () => (
  <svg {...svgProps}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="3.6" /><circle cx="17.2" cy="6.8" r=".9" fill="currentColor" stroke="none" /></svg>
);
const IconLink = () => (
  <svg {...svgProps}><path d="M10 13a5 5 0 0 0 7.5.5l2-2A5 5 0 0 0 12.5 4.5l-1.2 1.2" /><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2A5 5 0 0 0 11.5 19.5l1.2-1.2" /></svg>
);

// Copia al portapapeles con caída atrás para contextos sin permiso/https
async function copiar(texto) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch { /* seguimos con el plan B */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = texto;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:-1000px;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

// Compartir el evento: WhatsApp abre el selector de contacto, Instagram no tiene
// enlace directo a un chat, así que dejamos el enlace copiado y abrimos Direct
// (en móvil, la hoja nativa de compartir ya ofrece Instagram).
function ShareRow({ url, texto, onAviso }) {
  const waHref = `https://wa.me/?text=${encodeURIComponent(`${texto}\n${url}`)}`;

  const instagram = () => {
    if (navigator.share) {
      navigator.share({ title: texto.split("\n")[0], text: texto, url }).catch(() => {});
      return;
    }
    copiar(url).then(ok => onAviso(ok ? "Enlace copiado · pégalo en tu Direct" : "Copia el enlace de la barra del navegador"));
    window.open("https://www.instagram.com/direct/inbox/", "_blank", "noopener");
  };

  const enlace = async () => {
    const ok = await copiar(url);
    onAviso(ok ? "Enlace copiado" : "No se pudo copiar, hazlo desde la barra del navegador");
  };

  return (
    <div className="ev-share">
      <span className="ev-share-k">Compartir</span>
      <div className="ev-share-row">
        <a className="ev-share-b" href={waHref} target="_blank" rel="noopener">
          <IconWhatsApp />WhatsApp
        </a>
        <button type="button" className="ev-share-b" onClick={instagram}>
          <IconInstagram />Instagram
        </button>
        <button type="button" className="ev-share-b" onClick={enlace}>
          <IconLink />Copiar enlace
        </button>
      </div>
    </div>
  );
}

// Evento completo → en lugar de reservar, deja tu contacto. Va a Supabase
// (waitlist_join) y aparece en el panel de gestión bajo ese evento.
function ListaEspera({ sessionId }) {
  const c = EVENTO_AGOTADO;
  const [open, setOpen]           = useState(false);
  const [nombre, setNombre]       = useState("");
  const [apellidos, setApellidos] = useState("");
  const [tel, setTel]             = useState("");
  const [email, setEmail]         = useState("");
  const [state, setState]         = useState("idle");   // idle | sending | done | error

  const ready = nombre.trim() && apellidos.trim() && tel.trim() && EMAIL_RE.test(email.trim());

  const submit = async (e) => {
    e.preventDefault();
    if (!ready || state === "sending") return;
    setState("sending");
    const { error } = await supabase.rpc("waitlist_join", {
      p_session_id: sessionId,
      p_nombre: `${nombre.trim()} ${apellidos.trim()}`,
      p_telefono: tel.trim(),
      p_email: email.trim(),
    });
    setState(error ? "error" : "done");
  };

  if (state === "done") {
    return (
      <p className="ev-wl-done">{c.esperaOk}<span>{c.esperaOkNota}</span></p>
    );
  }

  if (!open) {
    return (
      <button type="button" className="ev-cta ev-cta-ghost" onClick={() => setOpen(true)}>
        {c.esperaAbrir}<span className="ev-cta-arw" aria-hidden="true" />
      </button>
    );
  }

  return (
    <form className="ev-wl" onSubmit={submit}>
      <span className="ev-wl-title">{c.esperaTitulo}</span>
      <MultiLine text={c.esperaLede} className="ev-wl-lede" />
      <div className="ev-wl-fields">
        <input className="ev-wl-f" placeholder="Nombre" autoComplete="given-name"
               value={nombre} onChange={e => setNombre(e.target.value)} />
        <input className="ev-wl-f" placeholder="Apellidos" autoComplete="family-name"
               value={apellidos} onChange={e => setApellidos(e.target.value)} />
        <input className="ev-wl-f" type="tel" inputMode="tel" placeholder="Teléfono"
               autoComplete="tel" value={tel} onChange={e => setTel(e.target.value)} />
        <input className="ev-wl-f wide" type="email" inputMode="email" placeholder="Email"
               autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <button className="ev-wl-b" disabled={!ready || state === "sending"}>
        {state === "sending" ? "…" : c.esperaBoton}
      </button>
      {state === "error" && <span className="ev-wl-err">{c.esperaError}</span>}
    </form>
  );
}

export default function EventoPage({ slug }) {
  const ev = getEvento(slug);
  const [posterFailed, setPosterFailed] = useState(false);
  const [ses, setSes]     = useState(undefined);   // undefined = cargando · null = sin sesión en el calendario
  const [aviso, setAviso] = useState("");
  const avisoTimer = useRef(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Estado real del evento (aforo y "completo") desde el calendario de Supabase.
  // Si la sesión aún no existe o falla la consulta, la página se comporta como
  // siempre: botón de reservar por WhatsApp.
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("session_availability").select("*").eq("evento_slug", slug).limit(1);
      if (!alive) return;
      setSes(error || !data || !data.length ? null : data[0]);
    })();
    return () => { alive = false; };
  }, [slug]);

  const toast = useCallback((m) => {
    setAviso(m);
    clearTimeout(avisoTimer.current);
    avisoTimer.current = setTimeout(() => setAviso(""), 2800);
  }, []);
  useEffect(() => () => clearTimeout(avisoTimer.current), []);

  const goHome = (e) => { e.preventDefault(); window.location.hash = ""; };

  // Volver a la sección Eventos de la home. Como la home aún no está montada
  // al pulsar, el ancla nativa no encuentra #eventos; fijamos el hash y luego
  // hacemos scroll en cuanto la sección aparece en el DOM.
  const goEventos = (e) => {
    e.preventDefault();
    window.location.hash = "eventos";
    let tries = 0;
    const tick = () => {
      const el = document.getElementById("eventos");
      if (el) { el.scrollIntoView(); return; }
      if (tries++ < 30) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  // Evento inexistente → mensaje sobrio con vuelta al estudio
  if (!ev) {
    return (
      <main className="evento-page ev-404">
        <div className="ev-404-in">
          <span className="ev-eyebrow">Evento</span>
          <h1 className="ev-404-title">Este evento no está disponible</h1>
          <a href="#" className="ev-cta" onClick={goHome}>Volver al estudio</a>
        </div>
      </main>
    );
  }

  const waHref = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(ev.reservaMsg || "")}`;
  const nombre = ev.nombre || "";
  const tituloBase = ev.nombreEm && nombre.endsWith(ev.nombreEm)
    ? nombre.slice(0, nombre.length - ev.nombreEm.length).trim()
    : nombre;

  // Enlace absoluto de esta página — es lo que se comparte
  const pageUrl = typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname}#/evento/${ev.slug}`
    : "";
  const shareText = ev.compartirMsg || `${ev.nombre} · ${ev.cuando}`;

  // Completo: lo dice el calendario (aforo lleno o marcado a mano en gestión).
  // Un evento ya celebrado no se marca como agotado: su CTA ya mira al siguiente.
  const cargando = ses === undefined;
  const yaPasado = ses ? new Date(ses.starts_at).getTime() <= Date.now() : false;
  const agotado  = !!ses && !yaPasado && ses.is_full;

  // Tema por evento → variables CSS que tiñen la página al son de su cartel
  const t = ev.tema || {};
  const themeVars = { "--ev-accent": t.accent, "--ev-accent-deep": t.accentDeep };

  return (
    <main className="evento-page" style={themeVars}>
      {/* Columna del cartel — protagonista, entero sobre su propia crema */}
      <aside className="ev-visual">
        <div className="ev-visual-top">
          <div className="ev-brand">
            <img className="ev-mark" src="assets/cala-isotipo.svg" alt="" />
            <span className="ev-word">cala<span className="d">.</span>studio</span>
          </div>
          <a href="#eventos" className="ev-back" onClick={goEventos}>‹ Volver</a>
        </div>

        <div className="ev-poster-wrap">
          {posterFailed ? (
            <div className="ev-poster ev-poster-ph" role="img" aria-label={`Cartel de ${ev.nombre} — próximamente`}>
              <span className="ev-ph-eyebrow">{ev.eyebrow}</span>
              <span className="ev-ph-title">{ev.nombre}</span>
              <span className="ev-ph-when">{ev.cuando}</span>
              <span className="ev-ph-note">Cartel próximamente</span>
            </div>
          ) : (
            <img className="ev-poster" src={ev.poster} alt={`Cartel de ${ev.nombre}`}
                 onError={() => setPosterFailed(true)} />
          )}
        </div>
      </aside>

      {/* Columna de acompañamiento + CTA de reserva */}
      <section className="ev-panel">
        <div className="ev-panel__in">
          <header className="ev-head">
            <span className="ev-eyebrow">{ev.eyebrow}</span>
            <h1 className="ev-title">
              {tituloBase} {ev.nombreEm && <em>{ev.nombreEm}</em>}
            </h1>
            <MultiLine text={ev.lede} className="ev-lede" />
          </header>

          <MultiLine text={ev.descripcion} className="ev-descr" />

          {/* Esenciales — un eco breve del cartel, sin repetirlo entero */}
          <ul className="ev-meta">
            <li><span className="ev-meta-k">Cuándo</span><span className="ev-meta-v">{ev.cuando} · {ev.hora}</span></li>
            <li><span className="ev-meta-k">Dónde</span><span className="ev-meta-v">{ev.lugar}</span></li>
            {ev.programa && <li><span className="ev-meta-k">Plan</span><span className="ev-meta-v">{ev.programa}</span></li>}
            <li><span className="ev-meta-k">Nivel</span><span className="ev-meta-v">{ev.nivel} · {ev.aforo}</span></li>
          </ul>

          {/* CTA — reservar si quedan plazas, lista de espera si está agotado,
              avisar de la próxima edición si el evento ya se celebró */}
          <div className={"ev-reserva" + (agotado ? " is-agotado" : "")}>
            {ev.precio && (
              <span className="ev-precio">
                {ev.precio}<span className="ev-precio-k">{ev.precioNota || "por persona"}</span>
              </span>
            )}

            {agotado ? (
              <>
                <div className="ev-agotado">
                  <span className="ev-agotado-tag">{EVENTO_AGOTADO.tag}</span>
                  <span className="ev-agotado-nota">{EVENTO_AGOTADO.nota}</span>
                </div>
                <ListaEspera sessionId={ses.session_id} />
              </>
            ) : (
              <>
                {/* Mientras se comprueba el aforo el botón espera: así nadie se va
                    a WhatsApp a reservar un evento que está agotado */}
                <a className={"ev-cta" + (cargando ? " is-cargando" : "")} href={waHref}
                   target="_blank" rel="noopener" aria-disabled={cargando || undefined}
                   onClick={e => { if (cargando) e.preventDefault(); }}>
                  {cargando ? "Comprobando plazas…" : (ev.ctaLabel || "Reservar por WhatsApp")}
                  <span className="ev-cta-arw" aria-hidden="true" />
                </a>
                <p className="ev-fine">{ev.fine || "Plazas limitadas"}</p>
              </>
            )}

            <ShareRow url={pageUrl} texto={shareText} onAviso={toast} />
          </div>
        </div>
      </section>

      {aviso && <div className="ev-toast" role="status">{aviso}</div>}
    </main>
  );
}

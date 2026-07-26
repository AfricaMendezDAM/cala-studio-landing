import { useEffect, useState } from "react";
import { getEvento, CONTACT } from "../data.js";

const WA_NUMBER = CONTACT.phoneHref.replace(/\D/g, "");

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

export default function EventoPage({ slug }) {
  const ev = getEvento(slug);
  const [posterFailed, setPosterFailed] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);
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

  // Tema por evento → variables CSS que tiñen la página al son de su cartel
  const t = ev.tema || {};
  const themeVars = {
    "--ev-accent": t.accent, "--ev-accent-deep": t.accentDeep,
    "--ev-bg": t.bg, "--ev-bg-2": t.bg2, "--ev-panel": t.panel,
  };

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

          {/* Esenciales — un eco breve del cartel, sin repetirlo entero */}
          <ul className="ev-meta">
            <li><span className="ev-meta-k">Cuándo</span><span className="ev-meta-v">{ev.cuando} · {ev.hora}</span></li>
            <li><span className="ev-meta-k">Dónde</span><span className="ev-meta-v">{ev.lugar}</span></li>
            {ev.programa && <li><span className="ev-meta-k">Plan</span><span className="ev-meta-v">{ev.programa}</span></li>}
            <li><span className="ev-meta-k">Nivel</span><span className="ev-meta-v">{ev.nivel} · {ev.aforo}</span></li>
          </ul>

          {/* CTA de reserva — la acción de la página */}
          <div className="ev-reserva">
            {ev.precio && <span className="ev-precio">{ev.precio}<span className="ev-precio-k">por persona</span></span>}
            <a className="ev-cta" href={waHref} target="_blank" rel="noopener">
              Reservar por WhatsApp<span className="ev-cta-arw" aria-hidden="true" />
            </a>
            <p className="ev-fine">Plazas limitadas · Sin pago online</p>
          </div>
        </div>
      </section>
    </main>
  );
}

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

  return (
    <main className="evento-page">
      {/* Columna del cartel — protagonista, entero sobre fondo cálido */}
      <aside className="ev-visual">
        <span className="ev-grain" aria-hidden="true" />
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
              <span className="ev-ph-when">{ev.when}</span>
              <span className="ev-ph-note">Cartel próximamente</span>
            </div>
          ) : (
            <img className="ev-poster" src={ev.poster} alt={`Cartel de ${ev.nombre}`}
                 onError={() => setPosterFailed(true)} />
          )}
        </div>

        <div className="ev-visual-foot">
          <span className="ev-dot"><i /></span>{ev.place} · {ev.when}
        </div>
      </aside>

      {/* Columna de detalle + CTA de reserva */}
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

          <ul className="ev-facts">
            <li className="ev-fact">
              <span className="ev-fact-k">Cuándo</span>
              <span className="ev-fact-v">{ev.when}</span>
              {ev.whenNota && <span className="ev-fact-note">{ev.whenNota}</span>}
            </li>
            <li className="ev-fact">
              <span className="ev-fact-k">Dónde</span>
              <span className="ev-fact-v">{ev.place}</span>
              {ev.placeNota && <span className="ev-fact-note">{ev.placeNota}</span>}
            </li>
            <li className="ev-fact">
              <span className="ev-fact-k">Nivel</span>
              <span className="ev-fact-v">{ev.nivel}</span>
            </li>
            <li className="ev-fact">
              <span className="ev-fact-k">Aforo</span>
              <span className="ev-fact-v">{ev.aforo}</span>
            </li>
          </ul>

          {ev.incluye?.length > 0 && (
            <div className="ev-incluye">
              <span className="ev-incluye-k">Qué incluye</span>
              <ul className="ev-incluye-list">
                {ev.incluye.map((it, i) => <li key={i}>{it}</li>)}
              </ul>
            </div>
          )}

          {/* CTA de reserva — el corazón de la página */}
          <div className="ev-reserva">
            <div className="ev-reserva-copy">
              <span className="ev-reserva-ey">Reserva tu plaza</span>
              <p className="ev-reserva-lead">Te confirmamos la fecha y tu plaza al momento</p>
            </div>
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

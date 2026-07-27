import { useState } from "react";
import Section from "./Section.jsx";
import { EVENT_CARDS } from "../data.js";

// Evento con cartel: el cartel manda, y tanto el cartel como el botón
// llevan al detalle (no se pueden anidar enlaces, van por separado).
// Si el cartel no carga, el marco desaparece entero: nunca un hueco vacío.
function EventCard({ e }) {
  const [posterOk, setPosterOk] = useState(true);
  const href = `#/evento/${e.slug}`;
  return (
    <article className="evt-card">
      {e.poster && posterOk && (
        <a className="evt-card__poster" href={href} aria-label={`Ver detalle de ${e.name}`}>
          <img src={e.poster} alt={`Cartel de ${e.name}`} loading="lazy"
               onError={() => setPosterOk(false)} />
        </a>
      )}

      <div className="evt-card__body">
        <span className="evt-card__when">{e.when}</span>
        <h3 className="evt-card__name"><a href={href}>{e.name}</a></h3>
        {e.place && <span className="evt-card__place">{e.place}</span>}
        <p className="evt-card__desc">{e.desc}</p>

        <a className="evt-card__btn" href={href}>
          Ver detalle<span className="arw" aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

// Fecha aún sin cerrar: una banda baja, sin hueco de cartel vacío
function ProximamenteBand({ e }) {
  return (
    <div className="evt-soon">
      <span className="evt-soon__k">Próximamente</span>
      <span className="evt-soon__when">{e.when}</span>
      <p className="evt-soon__desc">{e.desc}</p>
    </div>
  );
}

export default function Eventos() {
  const conCartel = EVENT_CARDS.filter(e => !e.proximamente);
  const pendiente = EVENT_CARDS.find(e => e.proximamente);

  return (
    <Section
      id="eventos"
      num="III · Eventos"
      title={<>Fuera del <em>estudio</em></>}
      right={<>
        Encuentros de verano abiertos a todo el mundo, vengas o no a clase<br />
        Entra en cada cartel para ver el plan completo
      </>}
    >
      <div className="evt-grid">
        {conCartel.map(e => <EventCard key={e.slug} e={e} />)}
      </div>
      {pendiente && <ProximamenteBand e={pendiente} />}
    </Section>
  );
}

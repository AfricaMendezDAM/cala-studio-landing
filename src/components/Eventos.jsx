import { useState } from "react";
import Section from "./Section.jsx";
import { EVENT_CARDS } from "../data.js";

const CHIP = {
  proximo:   "Próximo",
  celebrado: "Ya celebrado",
  soon:      "Fecha por confirmar",
};

function Poster({ src, alt }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <span className="evt-card__ph">Cartel próximamente</span>;
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}

function EventCard({ e }) {
  const linkable = Boolean(e.slug);
  return (
    <article className={"evt-card is-" + e.estado}>
      <div className="evt-card__poster">
        <Poster src={e.poster} alt={`Cartel de ${e.name}`} />
      </div>

      <div className="evt-card__body">
        <div className="evt-card__top">
          <span className="evt-card__chip">{CHIP[e.estado]}</span>
          <span className="evt-card__when">{e.when}</span>
        </div>
        <h3 className="evt-card__name">{e.name}</h3>
        {e.place && <span className="evt-card__place">{e.place}</span>}
        <p className="evt-card__desc">{e.desc}</p>

        {linkable ? (
          <a className="evt-card__btn" href={`#/evento/${e.slug}`}>
            Ver detalle<span className="arw" aria-hidden="true" />
          </a>
        ) : (
          <span className="evt-card__btn is-off">Muy pronto</span>
        )}
      </div>
    </article>
  );
}

export default function Eventos() {
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
        {EVENT_CARDS.map((e, i) => <EventCard key={e.slug || i} e={e} />)}
      </div>
    </Section>
  );
}

import Section from "./Section.jsx";
import { EVENT_TEASERS, LOCATION } from "../data.js";

function EventsCard() {
  return (
    <div className="events-card">
      <span className="badge"><span className="y"></span>Coming soon</span>
      <h3>Eventos de <em>verano</em></h3>
      <p>
        Estamos cerrando las fechas. Apúntate a la lista de espera y serás
        de los primeros en recibir el calendario.
      </p>
      <div className="teasers">
        {EVENT_TEASERS.map((e, i) => (
          <div key={i} className="teaser">
            <span className="when">{e.when}</span>
            <span className="name">{e.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MapCard() {
  const { mapSrc, directionsHref, address } = LOCATION;
  return (
    <div id="ubicacion" className="map-card">
      <iframe title="Ubicación de Cala Studio" src={mapSrc} loading="lazy"></iframe>
      <div className="overlay">
        <div className="addr">
          <div className="k"></div>
          <div className="v">
            <strong>{address.street}</strong><br/>
            {address.city}
          </div>
          <a href={directionsHref} target="_blank" rel="noopener" className="dir-btn">
            Abrir en Maps →
          </a>
        </div>
        <div className="pin">
          <span className="y"></span>cala · studio
        </div>
      </div>
    </div>
  );
}

export default function EventosUbicacion() {
  return (
    <Section
      id="eventos"
      num="III · Agenda & Ubicación"
      title={<>Eventos <em></em></>}
      right={<>
      
      </>}
    >
      <div className="row-info">
        <EventsCard />
        <MapCard />
      </div>
    </Section>
  );
}

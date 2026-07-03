import Section from "./Section.jsx";
import { EVENT_TEASERS, LOCATION } from "../data.js";

function EventsCard() {
  return (
    <div className="events-card">
      <span className="badge"><span className="y"></span>Agenda verano</span>
      <h3>Eventos de <em>verano</em></h3>
      <p>
        Estamos cerrando las fechas. Apúntate a la lista de espera y serás
        de los primeros en recibir el calendario.
      </p>
      <div className="teasers">
        {EVENT_TEASERS.map((e, i) => (
          <div key={i} className={"teaser" + (e.place ? " teaser-confirmed" : "")}>
            <div className="teaser-left">
              <span className="when">{e.when}</span>
              {e.place && <span className="place">{e.place}</span>}
            </div>
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

function VenueLockup() {
  const { partner } = LOCATION;
  return (
    <div className="venue-lockup">
      <span className="venue-eyebrow">Nuestra casa este verano</span>
      <div className="venue-marks">
        <span className="v-cala">cala<span className="dot">.</span>studio</span>
        <span className="v-x">×</span>
        <img className="v-melox" src={partner.logo} alt={partner.name} loading="lazy" />
      </div>
      <p className="venue-sub">
        Todas las clases se celebran en la <strong>Terraza Restaurante Meloxeira Praia</strong>,
        frente al mar.
      </p>
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
      <VenueLockup />
    </Section>
  );
}

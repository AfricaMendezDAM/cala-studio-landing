import CallButton from "./CallButton.jsx";
import { CONTACT, LOCATION } from "../data.js";

const BOTTOM = ["© 2026 - cala.studio", "Edición Verano", "Made on the Atlantic"];

// La ubicación cierra la página: mapa, dirección y la casa que nos acoge.
function Ubicacion() {
  const { mapSrc, directionsHref, address, partner } = LOCATION;
  return (
    <div id="ubicacion" className="foot-loc">
      <div className="foot-loc__info">
        <h4>Dónde estamos</h4>
        <p className="foot-addr">
          <strong>{address.street}</strong><br />
          {address.city}
        </p>
        <a href={directionsHref} target="_blank" rel="noopener" className="foot-dir">
          Abrir en Maps<span className="arw" aria-hidden="true" />
        </a>

        <div className="foot-venue">
          <span className="foot-venue__eyebrow">Nuestra casa este verano</span>
          <div className="foot-venue__marks">
            <span className="v-cala">cala<span className="dot">.</span>studio</span>
            <span className="v-x">×</span>
            <img className="v-melox" src={partner.logo} alt={partner.name} loading="lazy" />
          </div>
        </div>
      </div>

      <div className="foot-map">
        <iframe title="Ubicación de cala.studio" src={mapSrc} loading="lazy"></iframe>
        <span className="foot-map__pin"><span className="y" />cala · studio</span>
      </div>
    </div>
  );
}

export default function Footer() {
  return (
    <footer>
      <Ubicacion />
      <div className="brand-block">
        <div className="logo">cala.studio</div>
        <div className="tag">
          Pilates de costa . San vicente do Mar, 2026.
        </div>
      </div>
      <div className="foot-contact">
        <h4>Contacto</h4>
        <CallButton eyebrow="Llámanos" />
        <a className="foot-ig" href={CONTACT.instagramHref} target="_blank" rel="noopener">
          {CONTACT.instagramLabel}
        </a>
      </div>
      <div className="bottom">
        {BOTTOM.map(t => <span key={t}>{t}</span>)}
      </div>
    </footer>
  );
}

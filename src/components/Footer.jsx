import CallButton from "./CallButton.jsx";
import { CONTACT } from "../data.js";

const BOTTOM = ["© 2026 - cala.studio", "Edición Verano", "Made on the Atlantic"];

export default function Footer() {
  return (
    <footer>
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

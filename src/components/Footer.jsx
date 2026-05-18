const STUDIO_LINKS = [
  { href: "#grupos",    label: "Grupos" },
  { href: "#tarifas",   label: "Tarifas" },
  { href: "#eventos",   label: "Eventos" },
  { href: "#ubicacion", label: "Ubicación" },
];

const CONTACT = ["+34 644 39 31 85", "@cala.studio"];

const BOTTOM = ["© 2026 - cala·studio", "Edición Verano", "Made on the Atlantic"];

export default function Footer() {
  return (
    <footer>
      <div className="brand-block">
        <div className="logo">cala<span className="dot"></span>studio</div>
        <div className="tag">
          Pilates de costa . San vicente do Mar, 2026.
        </div>
      </div>
      <div>
        <h4>¿Dónde nos reunimos?</h4>
        <ul>
          {STUDIO_LINKS.map(l => (
            <li key={l.href}><a href={l.href}>{l.label}</a></li>
          ))}
        </ul>
      </div>
      <div>
        <h4>Contacto</h4>
        <ul>
          {CONTACT.map(c => <li key={c}>{c}</li>)}
        </ul>
      </div>
      <div className="bottom">
        {BOTTOM.map(t => <span key={t}>{t}</span>)}
      </div>
    </footer>
  );
}

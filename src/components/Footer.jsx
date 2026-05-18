const STUDIO_LINKS = [
  { href: "#grupos",    label: "Grupos" },
  { href: "#tarifas",   label: "Tarifas" },
  { href: "#eventos",   label: "Eventos" },
  { href: "#ubicacion", label: "Ubicación" },
];

const CONTACT = ["hola@cala.studio", "+34 881 000 000", "@cala.studio"];

const BOTTOM = ["© MMXXVI · cala·studio", "Edición Verano", "Made on the Atlantic"];

export default function Footer() {
  return (
    <footer>
      <div className="brand-block">
        <div className="logo">cala<span className="dot"></span>studio</div>
        <div className="tag">
          Pilates de costa. Sala pequeña, intención grande. Galicia, MMXXVI.
        </div>
      </div>
      <div>
        <h4>Estudio</h4>
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

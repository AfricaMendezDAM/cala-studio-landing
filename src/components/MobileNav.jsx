function IconGrupos() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="3"/>
      <path d="M2 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
      <circle cx="17" cy="8" r="3"/>
      <path d="M22 20c0-3.3-2.7-6-6-6"/>
    </svg>
  );
}
function IconTarifas() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="6" width="20" height="14" rx="2"/>
      <path d="M2 11h20M6 16h3M15 16h3"/>
    </svg>
  );
}
function IconAgenda() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M3 10h18M8 2v4M16 2v4M8 15h.01M12 15h.01M16 15h.01"/>
    </svg>
  );
}
function IconReserva() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  );
}

const TABS = [
  { href: "#grupos",  label: "Grupos",   Icon: IconGrupos  },
  { href: "#tarifas", label: "Tarifas",  Icon: IconTarifas },
  { href: "#eventos", label: "Eventos",  Icon: IconAgenda  },
  { href: "#/reservar", label: "Reservar", Icon: IconReserva },
];

export default function MobileNav() {
  return (
    <nav className="m3-nav">
      {TABS.map(({ href, label, Icon }) => (
        <a key={href} href={href} className="m3-tab" aria-label={label}>
          <span className="m3-indicator"><Icon /></span>
          <span className="m3-label">{label}</span>
        </a>
      ))}
    </nav>
  );
}

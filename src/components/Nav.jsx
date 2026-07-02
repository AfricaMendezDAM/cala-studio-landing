import { useState, useEffect } from "react";

const LINKS = [
  { href: "#grupos",    label: "Grupos" },
  { href: "#tarifas",   label: "Tarifas" },
  { href: "#eventos",   label: "Eventos" },
  { href: "#ubicacion", label: "Ubicación" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={"nav" + (scrolled ? " scrolled" : "")}>
      <a href="#top" className="brand">
        calastudio
      </a>
      <div className="links">
        {LINKS.map(l => <a key={l.href} href={l.href}>{l.label}</a>)}
      </div>
      <a href="#reserva" className="cta"><span>Reservar</span></a>
    </nav>
  );
}

import { useState, useEffect } from "react";
import BrandMark from "./BrandMark.jsx";

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
      <a href="#top" className="brand" style={{ display: "flex", alignItems: "center", gap: 10, color: scrolled ? "var(--ink)" : "#fff" }}>
        <BrandMark size={22} className="brand-mark" />
        cala.studio
      </a>
      <div className="links">
        {LINKS.map(l => <a key={l.href} href={l.href}>{l.label}</a>)}
      </div>
      <a href="#/reservar" className="cta"><span>Agenda tu clase</span></a>
    </nav>
  );
}

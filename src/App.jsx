import { useState, useEffect } from "react";
import { useMobile } from "./hooks/useMobile.js";
import Nav from "./components/Nav.jsx";
import Hero from "./components/Hero.jsx";
import Grupos from "./components/Grupos.jsx";
import Tarifas from "./components/Tarifas.jsx";
import EventosUbicacion from "./components/EventosUbicacion.jsx";
import Reserva from "./components/Reserva.jsx";
import Footer from "./components/Footer.jsx";
import MobileNav from "./components/MobileNav.jsx";
import MobileBack from "./components/MobileBack.jsx";

const HASH_TO_VIEW = {
  "#grupos": "grupos", "#tarifas": "tarifas",
  "#eventos": "eventos", "#ubicacion": "eventos",
  "#reserva": "reserva", "#top": null,
};

export default function App() {
  const [view, setView] = useState(null);
  const mobile = useMobile();

  useEffect(() => {
    if (!mobile) return;
    const handler = () => {
      const hash = window.location.hash;
      if (hash in HASH_TO_VIEW) setView(HASH_TO_VIEW[hash]);
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, [mobile]);

  if (mobile) {
    const goHome = () => {
      setView(null);
      history.pushState(null, "", "#top");
    };
    return (
      <div className="m3-app">
        {view && <MobileBack onBack={goHome} />}
        <main className="m3-main">
          {view === null    && <Hero />}
          {view === "grupos"  && <Grupos />}
          {view === "tarifas" && <Tarifas />}
          {view === "eventos" && <EventosUbicacion />}
          {view === "reserva" && <Reserva />}
        </main>
        <MobileNav view={view} setView={setView} />
      </div>
    );
  }

  return (
    <>
      <Nav />
      <Hero />
      <Grupos />
      <Tarifas />
      <EventosUbicacion />
      <Reserva />
      <Footer />
    </>
  );
}

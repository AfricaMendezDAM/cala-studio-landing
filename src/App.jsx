import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase.js";
import { useMobile } from "./hooks/useMobile.js";
import Nav from "./components/Nav.jsx";
import Hero from "./components/Hero.jsx";
import Grupos from "./components/Grupos.jsx";
import Tarifas from "./components/Tarifas.jsx";
import EventosUbicacion from "./components/EventosUbicacion.jsx";
import Contacto from "./components/Contacto.jsx";
import Footer from "./components/Footer.jsx";
import ReservaPage from "./components/ReservaPage.jsx";
import MobileTopBar from "./components/MobileTopBar.jsx";
import MobileNav from "./components/MobileNav.jsx";

function useHashRoute() {
  const [hash, setHash] = useState(() => (typeof window !== "undefined" ? window.location.hash : ""));
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
}

export default function App() {
  const mobile = useMobile();
  const hash = useHashRoute();

  // Al volver del magic-link (aterriza en la raíz), si había una reserva
  // pendiente saltamos al calendario para auto-confirmarla — sin reclic.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session
          && localStorage.getItem("cala_pending_class")
          && !window.location.hash.startsWith("#/reservar")) {
        window.location.hash = "#/reservar";
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Página de reserva dedicada (endpoint propio)
  if (hash.startsWith("#/reservar")) return <ReservaPage />;

  if (mobile) {
    return (
      <div className="m3-app">
        <MobileTopBar />
        <main className="m3-main">
          <Hero />
          <Grupos />
          <Tarifas />
          <EventosUbicacion />
          <Contacto />
          <Footer />
        </main>
        <MobileNav />
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
      <Contacto />
      <Footer />
    </>
  );
}

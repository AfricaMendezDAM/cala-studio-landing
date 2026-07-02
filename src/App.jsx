import { useMobile } from "./hooks/useMobile.js";
import Nav from "./components/Nav.jsx";
import Hero from "./components/Hero.jsx";
import Grupos from "./components/Grupos.jsx";
import Tarifas from "./components/Tarifas.jsx";
import EventosUbicacion from "./components/EventosUbicacion.jsx";
import Reserva from "./components/Reserva.jsx";
import Footer from "./components/Footer.jsx";
import MobileTopBar from "./components/MobileTopBar.jsx";
import MobileNav from "./components/MobileNav.jsx";

export default function App() {
  const mobile = useMobile();

  if (mobile) {
    return (
      <div className="m3-app">
        <MobileTopBar />
        <main className="m3-main">
          <Hero />
          <Grupos />
          <Tarifas />
          <EventosUbicacion />
          <Reserva />
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
      <Reserva />
      <Footer />
    </>
  );
}

import Nav from "./components/Nav.jsx";
import Hero from "./components/Hero.jsx";
import Grupos from "./components/Grupos.jsx";
import Tarifas from "./components/Tarifas.jsx";
import EventosUbicacion from "./components/EventosUbicacion.jsx";
import Reserva from "./components/Reserva.jsx";
import Footer from "./components/Footer.jsx";

export default function App() {
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

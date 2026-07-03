import { useEffect } from "react";
import BookingWidget from "./BookingWidget.jsx";

export default function ReservaPage() {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const goHome = (e) => { e.preventDefault(); window.location.hash = ""; };

  return (
    <main className="reserva-page">
      {/* Panel de imagen a sangre */}
      <aside className="rp-visual">
        <img className="rp-photo" src="assets/hero.jpg" alt="" />
        <span className="rp-veil" aria-hidden="true" />
        <span className="rp-grain" aria-hidden="true" />

        <div className="rp-top">
          <div className="rp-brand">
            <img className="rp-mark" src="assets/cala-isotipo.svg" alt="" />
            <span className="rp-word">cala<span className="d">.</span>studio</span>
          </div>
          <a href="#" className="rp-back" onClick={goHome}>‹ Volver</a>
        </div>

        <div className="rp-hero">
          <span className="rp-eyebrow">Pilates de costa · Galicia</span>
          <h1 className="rp-title">Reserva tu <em>plaza</em></h1>
          <p className="rp-lede">
            Martes y jueves, frente al mar<br />
            Ocho esterillas, la marea de fondo<br />
            y cincuenta minutos para ti
          </p>
        </div>

        <div className="rp-meta"><span className="rp-dot"><i /></span>Aforo 8 · Sin pago online</div>
      </aside>

      {/* Columna de reserva */}
      <section className="rp-panel">
        <div className="rp-panel__in">
          <BookingWidget />
        </div>
      </section>
    </main>
  );
}

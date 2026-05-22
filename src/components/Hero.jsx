import { useState, useEffect, useRef, useCallback } from "react";
import { HERO_SLIDES } from "../data.js";

const SLIDE_MS = 5500;

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default function Hero() {
  const total = HERO_SLIDES.length;
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);

  const tick = useCallback((dir = 1) => {
    setIdx(i => (i + dir + total) % total);
  }, [total]);

  const reset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => tick(1), SLIDE_MS);
  }, [tick]);

  useEffect(() => {
    reset();
    return () => clearInterval(timerRef.current);
  }, [reset]);

  const prev = () => { tick(-1); reset(); };
  const next = () => { tick(1);  reset(); };

  return (
    <header id="top" className="hero">
      <div className="hero-bg">
        {HERO_SLIDES.map((s, i) => (
          <div key={i} className={"hero-slide" + (i === idx ? " is-active" : "") + (s.darkOverlay ? " dark" : "")}>
            <img src={s.img} alt={s.label} />
          </div>
        ))}
      </div>

      <div className="hero-inner">
        <div className="hero-top">
          <span><span className="y"></span></span>
          <span></span>
        </div>

        <div className="hero-center">
          <h1>Pilates<br/>con <em>vistas</em></h1>
          <p className="lede">
            Grupos reducidos, luz natural y sin prisa.<br/>
            Mat, sculpt y sesiones de amanecer frente al mar.
          </p>
          <div className="actions">
            <a href="#reserva" className="btn btn-primary">
              Reservar plaza <span className="arrow"></span>
            </a>
            <a href="#grupos" className="btn btn-ghost">Ver horarios</a>
          </div>
        </div>

        <div className="hero-bottom">
          <div className="caption">
            <span className="k">Ahora</span>
            {HERO_SLIDES[idx].label}
          </div>

          <div className="hero-controls">
            <button onClick={prev} aria-label="Anterior"><ChevronLeft /></button>
            <span className="count">
              {String(idx + 1).padStart(2, "0")}
              <span className="total"> / {String(total).padStart(2, "0")}</span>
            </span>
            <button onClick={next} aria-label="Siguiente"><ChevronRight /></button>
          </div>

          <div className="hero-progress" key={idx}>
            {HERO_SLIDES.map((_, i) => (
              <span
                key={i}
                className={i === idx ? "is-active" : (i < idx ? "is-past" : "")}
              ></span>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

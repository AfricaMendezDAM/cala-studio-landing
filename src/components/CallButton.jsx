import { CONTACT } from "../data.js";

// Botón de contacto → llamada directa (tel:). Estética de píldora táctil:
// moneda-icono, punto "disponible" con latido suave y micro-interacción en hover.
export default function CallButton({ eyebrow = "Prefieres llamar", className = "" }) {
  return (
    <a href={CONTACT.phoneHref} className={"call" + (className ? " " + className : "")}>
      <span className="call-coin">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6
                   19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2
                   2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57
                   2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
        <span className="call-pulse" aria-hidden="true"></span>
      </span>

      <span className="call-text">
        <span className="call-eyebrow">{eyebrow}</span>
        <span className="call-number">{CONTACT.phoneLabel}</span>
      </span>

      <span className="call-arrow" aria-hidden="true"></span>
    </a>
  );
}

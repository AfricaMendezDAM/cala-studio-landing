import { useState } from "react";
import Section from "./Section.jsx";
import { PRICING, BONOS } from "../data.js";
import { useMobile } from "../hooks/useMobile.js";

// Prerrellena el interés del formulario de contacto (mensual / bono).
function fireInteres(plan) {
  if (plan.interes) window.dispatchEvent(new CustomEvent("cala:interes", { detail: plan.interes }));
}

function PriceCard({ plan }) {
  return (
    <article className={"price-card" + (plan.featured ? " featured" : "")}>
      {plan.featured && <span className="ribbon">Recomendada</span>}
      <span className="price-label">{plan.label}</span>
      <h3 className="price-name">{plan.name} <em>{plan.nameEm}</em></h3>
      <div className="price-amount">
        <span className="currency">€</span>
        <span className="num">{plan.amount}</span>
        <span className="per">{plan.per}</span>
      </div>
      <ul>
        {plan.items.map((it, j) => <li key={j}>{it}</li>)}
      </ul>
      <a href={plan.href} className="price-cta" onClick={() => fireInteres(plan)}>{plan.cta}</a>
    </article>
  );
}

function Carousel({ plans }) {
  const [idx, setIdx] = useState(0);
  const prev = () => setIdx(i => (i - 1 + plans.length) % plans.length);
  const next = () => setIdx(i => (i + 1) % plans.length);

  return (
    <div className="price-carousel">
      <button className="carousel-btn carousel-prev" onClick={prev} aria-label="Anterior">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>

      <a href={plans[idx].href} className="carousel-card-link" onClick={() => fireInteres(plans[idx])}>
        <PriceCard plan={plans[idx]} />
      </a>

      <button className="carousel-btn carousel-next" onClick={next} aria-label="Siguiente">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>

      <div className="carousel-dots">
        {plans.map((_, i) => (
          <button key={i} className={"carousel-dot" + (i === idx ? " on" : "")} onClick={() => setIdx(i)} aria-label={`Tarifa ${i + 1}`} />
        ))}
      </div>
    </div>
  );
}

export default function Tarifas() {
  const mobile = useMobile();

  return (
    <Section
      id="tarifas"
      num="II · Tarifas"
      title={<>Tarifas</>}
      right={<>Mat y material incluidos. IVA incluido.</>}
    >
      {mobile ? (
        <>
          <Carousel plans={PRICING} />
          <div className="bonos-head">
            <span className="bonos-label">Bonos · Válidos hasta el 31 de agosto</span>
          </div>
          <Carousel plans={BONOS} />
        </>
      ) : (
        <>
          <div className="pricing">
            {PRICING.map((p, i) => <PriceCard key={i} plan={p} />)}
          </div>
          <div className="bonos-head">
            <span className="bonos-label">Bonos · Válidos hasta el 31 de agosto</span>
          </div>
          <div className="pricing bonos-grid">
            {BONOS.map((p, i) => <PriceCard key={i} plan={p} />)}
          </div>
        </>
      )}
    </Section>
  );
}

import Section from "./Section.jsx";
import { PRICING } from "../data.js";

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
      <a href="#reserva" className="price-cta">{plan.cta}</a>
    </article>
  );
}

export default function Tarifas() {
  return (
    <Section
      id="tarifas"
      num="II · Tarifas"
      title={<>Tarifas</>}
      right={<>
        Mat y material incluidos. IVA incluido.
      </>}
    >
      <div className="pricing">
        {PRICING.map((p, i) => <PriceCard key={i} plan={p} />)}
      </div>
    </Section>
  );
}

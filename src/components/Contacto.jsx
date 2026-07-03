import { useEffect } from "react";
import Section from "./Section.jsx";
import Field from "./ui/Field.jsx";
import { useContactForm } from "../hooks/useContactForm.js";
import { CONTACT_INTERES } from "../data.js";

function Copy() {
  return (
    <div className="copy">
      <h3>¿Hablamos?</h3>
      <p>
        Dudas sobre grupos, tarifas o bonos<br />
        o quieres tu plaza fija mensual<br />
        Escríbenos y te respondemos pronto
      </p>
      <div className="note">
        <strong>Plaza fija mensual.</strong> Te confirmamos tu horario por
        teléfono y te guardamos el sitio cada semana.
      </div>
      <div className="note">
        <strong>¿Solo quieres reservar una clase?</strong> Hazlo directo en
        la <a href="#/reservar">agenda</a>.
      </div>
      <img src="assets/ending.png" alt="" className="copy-img" />
    </div>
  );
}

function PrivacyConsent({ checked, onChange, error }) {
  return (
    <div className="policy-wrap">
      <details className="policy-details">
        <summary>Privacidad e imágenes</summary>
        <div className="policy-body">
          <div className="policy-section">
            <strong>Protección de datos</strong>
            <p>Los datos facilitados se tratarán únicamente para responderte y ponernos en contacto contigo en relación con las actividades del estudio. No se ceden a terceros.</p>
          </div>
          <div className="policy-section">
            <strong>Imágenes</strong>
            <p>Durante las sesiones pueden tomarse fotografías o vídeos con fines promocionales del estudio. Si no deseas aparecer en ellos, comunícalo antes de la clase y lo respetaremos.</p>
          </div>
        </div>
      </details>
      <label className="consent">
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span>He leído y acepto la política de privacidad e imágenes.</span>
      </label>
      {error && <span className="err">{error}</span>}
    </div>
  );
}

function ContactForm({ form, errors, upd, onSubmit, sending }) {
  return (
    <form className="book" onSubmit={onSubmit} noValidate>
      <div className="row-2">
        <Field label="Nombre" error={errors.nombre}>
          <input type="text" value={form.nombre} onChange={e => upd("nombre", e.target.value)} placeholder="Cómo te llamas" />
        </Field>
        <Field label="Teléfono" error={errors.telefono}>
          <input type="tel" value={form.telefono} onChange={e => upd("telefono", e.target.value)} placeholder="+34 600 000 000" />
        </Field>
      </div>

      <div className="row-2">
        <Field label="Email" error={errors.email}>
          <input type="email" value={form.email} onChange={e => upd("email", e.target.value)} placeholder="tu@email.com" />
        </Field>
        <Field label="¿Qué te interesa?">
          <select value={form.interes} onChange={e => upd("interes", e.target.value)}>
            {CONTACT_INTERES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Mensaje">
        <textarea value={form.mensaje} onChange={e => upd("mensaje", e.target.value)} placeholder="Cuéntanos qué necesitas: horario que te encaja, dudas, lo que sea." />
      </Field>

      <PrivacyConsent
        checked={form.consent}
        onChange={e => upd("consent", e.target.checked)}
        error={errors.consent}
      />

      <div className="submit-row">
        <button type="submit" className="btn btn-dark" disabled={sending}>
          {sending ? "Enviando…" : <>Enviar mensaje <span className="arrow"></span></>}
        </button>
        <span className="hint"></span>
      </div>
    </form>
  );
}

export default function Contacto() {
  const { form, errors, toast, sending, upd, submit } = useContactForm();

  // Desde Tarifas: "Quiero mi plaza fija" / "Quiero este bono" preselecciona el interés.
  useEffect(() => {
    const onInteres = (e) => { if (e.detail) upd("interes", e.detail); };
    window.addEventListener("cala:interes", onInteres);
    return () => window.removeEventListener("cala:interes", onInteres);
  }, []);

  return (
    <Section
      id="contacto"
      num="IV · Contacto"
      title={<>Escríbenos o <em>pregunta</em></>}
    >
      <div className="reserve">
        <Copy />
        <ContactForm
          form={form} errors={errors}
          upd={upd} onSubmit={submit} sending={sending}
        />
      </div>

      <div className={"toast" + (toast ? " show" : "")}>
        <span className="y"></span>{toast}
      </div>
    </Section>
  );
}

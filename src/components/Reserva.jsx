import Section from "./Section.jsx";
import Field from "./ui/Field.jsx";
import { useBookingForm } from "../hooks/useBookingForm.js";
import { SLOTS } from "../data.js";

function Copy() {
  return (
    <div className="copy">
      <h3>Cuéntanos qué <em>te interesa</em></h3>
      <p>
        Si es tu primera vez, te llamamos para acompañarte en la elección del
        grupo. Cancela hasta 12h antes.
      </p>
      <div className="note">
        <strong>Política suave.</strong> Las clases no usadas se recuperan
        en el mismo mes.
      </div>
      <img src="assets/ending.png" alt="" className="copy-img" />
    </div>
  );
}

function SlotChecks({ value, onToggle }) {
  return (
    <div className="field">
      <label>Franjas</label>
      <div className="checks">
        {SLOTS.map(s => (
          <label key={s} className={"check" + (value.includes(s) ? " on" : "")}>
            <input type="checkbox" checked={value.includes(s)} onChange={() => onToggle(s)} />
            {s}
          </label>
        ))}
      </div>
    </div>
  );
}

function PolicyConsent({ checked, onChange, error }) {
  return (
    <div className="policy-wrap">
      <details className="policy-details">
        <summary>Política de cancelación, privacidad e imágenes</summary>
        <div className="policy-body">
          <div className="policy-section">
            <strong>Cancelación por lluvia</strong>
            <p>Si las condiciones meteorológicas impiden realizar la clase, se avisará con un mínimo de 2 horas de antelación. Podrás elegir entre reembolso completo o cambio a otra clase disponible.</p>
          </div>
          <div className="policy-section">
            <strong>Cancelación o cambio de grupo</strong>
            <p>Puedes cancelar una clase o cambiar de grupo con al menos 12 horas de antelación, siempre que haya plaza disponible. Las cancelaciones fuera de este plazo no darán derecho a reembolso ni cambio.</p>
          </div>
          <div className="policy-section">
            <strong>Protección de datos</strong>
            <p>Los datos facilitados se tratarán únicamente para gestionar tu reserva y ponernos en contacto contigo en relación con las actividades del estudio. No se ceden a terceros.</p>
          </div>
          <div className="policy-section">
            <strong>Imágenes</strong>
            <p>Durante las sesiones pueden tomarse fotografías o vídeos con fines promocionales del estudio. Si no deseas aparecer en ellos, comunícalo antes de la clase y lo respetaremos.</p>
          </div>
        </div>
      </details>
      <label className="consent">
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span>He leído y acepto la política de cancelación, privacidad e imágenes.</span>
      </label>
      {error && <span className="err">{error}</span>}
    </div>
  );
}

function BookingForm({ form, errors, upd, togglePref, onSubmit, sending }) {
  return (
    <form className="book" onSubmit={onSubmit} noValidate>
      <div className="row-2">
        <Field label="Nombre" error={errors.nombre}>
          <input type="text" value={form.nombre} onChange={e => upd("nombre", e.target.value)} placeholder="Cómo te llamas" />
        </Field>
        <Field label="Apellidos">
          <input type="text" value={form.apellidos} onChange={e => upd("apellidos", e.target.value)} placeholder="(opcional)" />
        </Field>
      </div>

      <div className="row-2">
        <Field label="Email" error={errors.email}>
          <input type="email" value={form.email} onChange={e => upd("email", e.target.value)} placeholder="tu@email.com" />
        </Field>
        <Field label="Teléfono" error={errors.telefono}>
          <input type="tel" value={form.telefono} onChange={e => upd("telefono", e.target.value)} placeholder="+34 600 000 000" />
        </Field>
      </div>

      <div className="row-3">
        <Field label="Grupo">
          <select value={form.grupo} onChange={e => upd("grupo", e.target.value)}>
            <option value="mat">Pilates Mat</option>
            <option value="sculpt">Pilates Sculpt</option>
            <option value="otro">Aún no lo sé</option>
          </select>
        </Field>
        <Field label="Tarifa">
          <select value={form.tarifa} onChange={e => upd("tarifa", e.target.value)}>
            <option value="unica">Única — €15</option>
            <option value="mensual-1">Mensual 1 — €40</option>
            <option value="mensual-2">Mensual 2 — €75</option>
          </select>
        </Field>
        <Field label="Experiencia">
          <select value={form.experiencia} onChange={e => upd("experiencia", e.target.value)}>
            <option value="principiante">Principiante</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
          </select>
        </Field>
      </div>

      <SlotChecks value={form.preferencias} onToggle={togglePref} />

      <Field label="Mensaje">
        <textarea value={form.mensaje} onChange={e => upd("mensaje", e.target.value)} placeholder="Algo que quieras que sepamos antes de tu primera clase." />
      </Field>

      <PolicyConsent
        checked={form.consent}
        onChange={e => upd("consent", e.target.checked)}
        error={errors.consent}
      />

      <div className="submit-row">
        <button type="submit" className="btn btn-dark" disabled={sending}>
          {sending ? "Enviando…" : <>Enviar reserva <span className="arrow"></span></>}
        </button>
        <span className="hint"></span>
      </div>
    </form>
  );
}

export default function Reserva() {
  const { form, errors, toast, sending, upd, togglePref, submit } = useBookingForm();

  return (
    <Section
      id="reserva"
      num="IV · Reserva"
      title={<>Reserva o <em>pregunta</em></>}
      // right={<>
      //   Confirmamos en menos de 24h. También puedes escribir a
      //   <strong style={{ color: "var(--ink)" }}> hola@cala.studio</strong>.
      // </>}
    >
      <div className="reserve">
        <Copy />
        <BookingForm
          form={form} errors={errors}
          upd={upd} togglePref={togglePref}
          onSubmit={submit} sending={sending}
        />
      </div>

      <div className={"toast" + (toast ? " show" : "")}>
        <span className="y"></span>{toast}
      </div>
    </Section>
  );
}

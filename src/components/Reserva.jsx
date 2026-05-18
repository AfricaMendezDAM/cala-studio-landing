import Section from "./Section.jsx";
import Field from "./ui/Field.jsx";
import { useBookingForm } from "../hooks/useBookingForm.js";
import { SLOTS } from "../data.js";

function Copy() {
  return (
    <div className="copy">
      <h3>Cuéntanos qué <em>te interesa</em>.</h3>
      <p>
        Si es tu primera vez, te llamamos para acompañarte en la elección del
        grupo. Cancela hasta 6h antes sin penalización.
      </p>
      <div className="note">
        <strong>Política suave.</strong> Las clases no usadas se recuperan
        en el mismo mes.
      </div>
    </div>
  );
}

function SlotChecks({ value, onToggle }) {
  return (
    <div className="field">
      <label>Franjas que te encajan</label>
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

function BookingForm({ form, errors, upd, togglePref, onSubmit }) {
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
            <option value="unica">Única — €18</option>
            <option value="mensual-1">Mensual 1 — €58</option>
            <option value="mensual-2">Mensual 2 — €92</option>
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

      <label className="consent">
        <input type="checkbox" checked={form.consent} onChange={e => upd("consent", e.target.checked)} />
        <span>
          Acepto que cala·studio almacene los datos de este formulario con el
          único fin de gestionar la reserva.
        </span>
      </label>
      {errors.consent && <span className="err">{errors.consent}</span>}

      <div className="submit-row">
        <button type="submit" className="btn btn-dark">
          Enviar reserva <span className="arrow"></span>
        </button>
        <span className="hint">Se guarda en JSON · descarga automática</span>
      </div>
    </form>
  );
}

export default function Reserva() {
  const { form, errors, toast, upd, togglePref, submit } = useBookingForm();

  return (
    <Section
      id="reserva"
      num="IV · Reserva"
      title={<>Una clase, un mes o <em>una pregunta</em>.</>}
      right={<>
        Confirmamos en menos de 24h. También puedes escribir a
        <strong style={{ color: "var(--ink)" }}> hola@cala.studio</strong>.
      </>}
    >
      <div className="reserve">
        <Copy />
        <BookingForm
          form={form} errors={errors}
          upd={upd} togglePref={togglePref}
          onSubmit={submit}
        />
      </div>

      <div className={"toast" + (toast ? " show" : "")}>
        <span className="y"></span>{toast}
      </div>
    </Section>
  );
}

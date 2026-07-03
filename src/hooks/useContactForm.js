import { useState, useEffect, useRef } from "react";
import { CONTACT_INTERES } from "../data.js";

// Formulario de contacto / dudas. Envía por email vía Formspree.
// (Reservar plaza NO pasa por aquí: eso vive en el calendario, #/reservar.)
const FORMSPREE_ID = "xnjkglwj";

const DRAFT_KEY = "cala.contactDraft";

export const initialForm = {
  nombre: "",
  email: "",
  telefono: "",
  interes: "duda",
  mensaje: "",
  consent: false,
};

const labelFor = (v) => CONTACT_INTERES.find(o => o.value === v)?.label ?? v;

function readDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return { ...initialForm, ...JSON.parse(raw) };
  } catch {}
  return initialForm;
}

function validate(form) {
  const e = {};
  if (!form.nombre.trim()) e.nombre = "Indica tu nombre";
  if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Email no válido";
  if (!form.telefono.trim() || form.telefono.replace(/\D/g, "").length < 9) e.telefono = "Teléfono no válido";
  if (!form.consent) e.consent = "Necesitamos tu consentimiento";
  return e;
}

export function useContactForm() {
  const [form, setForm]       = useState(readDraft);
  const [errors, setErrors]   = useState({});
  const [toast, setToast]     = useState("");
  const [sending, setSending] = useState(false);
  const toastTimer = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch {}
  }, [form]);

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const flash = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4500);
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) { flash("Revisa los campos marcados"); return; }

    const submission = {
      _subject: `Contacto web · ${labelFor(form.interes)}`,
      interesLabel: labelFor(form.interes),
      createdAt: new Date().toISOString(),
      ...form,
    };

    setSending(true);
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(submission),
      });
      if (!res.ok) throw new Error();
      localStorage.removeItem(DRAFT_KEY);
      setForm(initialForm);
      flash("Mensaje enviado · te escribimos pronto");
    } catch {
      flash("No se ha podido enviar · inténtalo otra vez o escríbenos por Instagram");
    } finally {
      setSending(false);
    }
  };

  return { form, errors, toast, sending, upd, submit };
}

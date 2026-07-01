import { useState, useEffect, useRef } from "react";

// Crea tu formulario en https://formspree.io y pega aquí el ID
const FORMSPREE_ID = "xnjkglwj";

const DRAFT_KEY   = "cala.bookingDraft";
const HISTORY_KEY = "cala.bookings";

export const initialForm = {
  nombre: "", apellidos: "",
  email: "",  telefono: "",
  grupo: "mat",
  tarifa: "mensual-1",
  fecha: "",
  experiencia: "principiante",
  preferencias: [],
  mensaje: "",
  consent: false,
};

function readDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return { ...initialForm, ...JSON.parse(raw) };
  } catch {}
  return initialForm;
}

function appendHistory(submission) {
  let history = [];
  try { history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch {}
  history.push(submission);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history, null, 2)); } catch {}
}

function validate(form) {
  const e = {};
  if (!form.nombre.trim()) e.nombre = "Indica tu nombre";
  if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Email no válido";
  if (!form.telefono.trim() || form.telefono.replace(/\D/g, "").length < 9) e.telefono = "Teléfono no válido";
  if (!form.consent) e.consent = "Necesitamos tu consentimiento";
  return e;
}

export function useBookingForm() {
  const [form, setForm]     = useState(readDraft);
  const [errors, setErrors] = useState({});
  const [toast, setToast]   = useState("");
  const [sending, setSending] = useState(false);
  const toastTimer = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch {}
  }, [form]);

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const togglePref = (slot) => setForm(f => {
    const has = f.preferencias.includes(slot);
    return { ...f, preferencias: has ? f.preferencias.filter(s => s !== slot) : [...f.preferencias, slot] };
  });

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
      id: "CALA-" + Date.now().toString(36).toUpperCase(),
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
      appendHistory(submission);
      localStorage.removeItem(DRAFT_KEY);
      setForm(initialForm);
      flash("¡Mensaje enviado! Nos pondremos en contacto contigo lo antes posible.");
    } catch {
      flash("Algo ha fallado, inténtalo de nuevo o escríbenos directamente.");
    } finally {
      setSending(false);
    }
  };

  return { form, errors, toast, sending, upd, togglePref, submit };
}

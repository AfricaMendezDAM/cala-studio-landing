import { useState, useEffect, useRef } from "react";

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

function downloadJSON(submission) {
  try {
    const blob = new Blob([JSON.stringify(submission, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `${submission.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {}
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
    toastTimer.current = setTimeout(() => setToast(""), 3800);
  };

  const submit = (ev) => {
    ev.preventDefault();
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) { flash("Revisa los campos marcados"); return; }

    const submission = {
      id: "CALA-" + Date.now().toString(36).toUpperCase(),
      createdAt: new Date().toISOString(),
      ...form,
    };
    appendHistory(submission);
    downloadJSON(submission);

    localStorage.removeItem(DRAFT_KEY);
    setForm(initialForm);
    flash("Reserva enviada · te escribimos en 24h");
  };

  return { form, errors, toast, upd, togglePref, submit };
}

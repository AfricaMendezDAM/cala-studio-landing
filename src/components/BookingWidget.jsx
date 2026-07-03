import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../hooks/useAuth.js";

const DOW       = ["L", "M", "X", "J", "V", "S", "D"];
const MES_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MES_LONG  = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIA_LONG  = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const TYPE = {
  mat:    { name: "Pilates", nameEm: "Mat",    meta: "Suelo · Todos los niveles" },
  sculpt: { name: "Pilates", nameEm: "Sculpt", meta: "Resistencia · Todos los niveles" },
};

const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const firstOfMonth = d => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);

function DayClass({ c, now, busy, onReserve, onCancel }) {
  const { capacity, free, mine } = c;
  const isFull  = free <= 0 && !mine;
  const isTight = !isFull && !mine && free <= 2;
  const isPast  = c.start.getTime() < now;
  const canCancel = (c.start.getTime() - now) / 36e5 >= 12;

  const cls = "dp-row"
    + (mine ? " is-mine" : "") + (isTight ? " is-tight" : "")
    + (isFull ? " is-full" : "") + (isPast ? " is-past" : "");

  let status;
  if (mine)         status = <span className="tag mine"><span className="ck">✓</span>Reservado</span>;
  else if (isPast)  status = <span className="tag full">Finalizada</span>;
  else if (isFull)  status = <span className="tag full">Completo</span>;
  else {
    const txt = free === 1 ? "Queda 1 plaza" : `Quedan ${free} plazas`;
    status = <span className={"tag " + (isTight ? "tight" : "open")}><span className="y" />{txt}</span>;
  }

  let action;
  if (isPast)      action = null;
  else if (mine)   action = canCancel
    ? <button className="cancel" disabled={busy} onClick={() => onCancel(c.id)}>Cancelar</button>
    : <span className="lock">Cancela hasta <em>12h antes</em></span>;
  else if (isFull) action = null;
  else             action = <button className="b" disabled={busy} onClick={() => onReserve(c.id)}>Reservar<span className="arw" /></button>;

  return (
    <div className={cls}>
      <div className="dp-time">
        <span className="t">{c.timeStart}</span>
        <span className="e">— {c.timeEnd} · 50 min</span>
      </div>
      <div className="dp-main">
        <h4>{c.type.name} <em>{c.type.nameEm}</em></h4>
        {status}
      </div>
      {action && <div className="dp-act">{action}</div>}
    </div>
  );
}

function Account({ auth, nudge, accountRef }) {
  const { user, loading, profile, profileComplete, signInWithEmail, saveProfile, signOut } = auth;
  const [email, setEmail]   = useState("");
  const [sent, setSent]     = useState(false);
  const [nombre, setNombre] = useState("");
  const [tel, setTel]       = useState("");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState("");

  const sendLink = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) { setErr("Email no válido"); return; }
    setErr(""); setPending(true);
    const { error } = await signInWithEmail(email.trim());
    setPending(false);
    error ? setErr("No se pudo enviar, inténtalo de nuevo") : setSent(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) { setErr("Dinos tu nombre"); return; }
    if (tel.replace(/\D/g, "").length < 9) { setErr("Teléfono no válido"); return; }
    setErr(""); setPending(true);
    const { error } = await saveProfile({ nombre: nombre.trim(), telefono: tel.trim() });
    setPending(false);
    if (error) setErr("No se pudo guardar, inténtalo de nuevo");
  };

  let body;
  if (loading) {
    body = <span className="acc-loading">Conectando…</span>;
  } else if (!user) {
    body = sent ? (
      <div className="acc-sent">
        <span className="dot" />
        <div className="acc-copy">
          <span className="acc-ey">Revisa tu correo</span>
          <span className="acc-tx">Te envié un enlace a <b>{email}</b><br />Ábrelo para entrar</span>
        </div>
      </div>
    ) : (
      <form className="acc-form" onSubmit={sendLink}>
        <div className="acc-copy">
          <span className="acc-ey">Para reservar</span>
          <span className="acc-tx">Identifícate con tu email — sin contraseñas</span>
        </div>
        <div className="acc-row">
          <input type="email" placeholder="tu@email.com" value={email}
                 onChange={e => setEmail(e.target.value)} autoComplete="email" />
          <button className="b" disabled={pending}>{pending ? "Enviando…" : <>Enviar enlace<span className="arw" /></>}</button>
        </div>
      </form>
    );
  } else if (!profileComplete) {
    body = (
      <form className="acc-form" onSubmit={save}>
        <div className="acc-copy">
          <span className="acc-ey">Casi listo</span>
          <span className="acc-tx">Completa tu perfil para reservar</span>
        </div>
        <div className="acc-row">
          <input type="text" placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} />
          <input type="tel" placeholder="Teléfono" value={tel} onChange={e => setTel(e.target.value)} />
          <button className="b" disabled={pending}>{pending ? "…" : <>Guardar<span className="arw" /></>}</button>
        </div>
      </form>
    );
  } else {
    body = (
      <div className="acc-in">
        <span className="acc-who"><span className="dot" />En sesión como <b>{profile.nombre}</b></span>
        <button className="acc-out" onClick={signOut}>Salir</button>
      </div>
    );
  }

  return (
    <div ref={accountRef} className={"ag-account rp-login" + (nudge ? " nudge" : "")}>
      {body}
      {err && <span className="acc-err">{err}</span>}
    </div>
  );
}

export default function BookingWidget() {
  const auth = useAuth();
  const { user } = auth;
  const now = Date.now();

  const [rows, setRows]   = useState(null);
  const [mine, setMine]   = useState(new Set());
  const [busy, setBusy]   = useState(false);
  const [toast, setToast] = useState("");
  const [nudge, setNudge] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => firstOfMonth(new Date()));
  const [selected, setSelected]   = useState(null);
  const accountRef = useRef(null);
  const toastTimer = useRef(null);

  const flash = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4000);
  };

  const load = useCallback(async () => {
    const [{ data: avail }, bk] = await Promise.all([
      supabase.rpc("availability"),
      user ? supabase.from("bookings").select("class_id") : Promise.resolve({ data: [] }),
    ]);
    setRows(avail ?? []);
    setMine(new Set((bk.data ?? []).map(b => b.class_id)));
  }, [user]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [load]);

  const classes = useMemo(() => {
    if (!rows) return [];
    return rows.map(r => {
      const start = new Date(r.starts_at), end = new Date(r.ends_at);
      return {
        id: r.class_id, type: TYPE[r.tipo] ?? { name: "Pilates", nameEm: "", meta: "" },
        capacity: r.capacity, free: r.free, mine: mine.has(r.class_id),
        start, end,
        timeStart: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
        timeEnd: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
        key: ymd(start),
      };
    });
  }, [rows, mine]);

  const byDay = useMemo(() => {
    const m = new Map();
    for (const c of classes) {
      if (!m.has(c.key)) m.set(c.key, []);
      m.get(c.key).push(c);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.start - b.start);
    return m;
  }, [classes]);

  useEffect(() => {
    if (!rows || selected) return;
    const fut = classes.filter(c => c.end.getTime() > now).sort((a, b) => a.start - b.start);
    if (fut.length) { setSelected(fut[0].key); setViewMonth(firstOfMonth(fut[0].start)); }
  }, [rows, classes, selected, now]);

  const requireAuth = () => {
    accountRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setNudge(true); setTimeout(() => setNudge(false), 1600);
    flash("Identifícate arriba para reservar tu plaza");
  };

  const onReserve = async (id) => {
    if (!user || !auth.profileComplete) return requireAuth();
    setBusy(true);
    const { error } = await supabase.rpc("book_class", { _class_id: id });
    setBusy(false);
    flash(error ? (/FULL/.test(error.message) ? "Se acaba de llenar 😕" : "No se pudo reservar, prueba otra vez") : "¡Plaza reservada! ✓");
    load();
  };

  const onCancel = async (id) => {
    setBusy(true);
    const { error } = await supabase.from("bookings").delete().eq("class_id", id);
    setBusy(false);
    flash(error ? "No se pudo cancelar" : "Reserva cancelada");
    load();
  };

  const cells = useMemo(() => {
    const start = firstOfMonth(viewMonth);
    const offset = (start.getDay() + 6) % 7;
    const days = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const todayKey = ymd(new Date(now));
    const todayMid = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), new Date(now).getDate());
    const out = [];
    for (let i = 0; i < offset; i++) out.push(null);
    for (let d = 1; d <= days; d++) {
      const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d);
      const key = ymd(date);
      const dayClasses = byDay.get(key) || [];
      out.push({
        d, key,
        hasClass: dayClasses.length > 0,
        selectable: dayClasses.some(c => c.end.getTime() > now),
        isToday: key === todayKey,
        isPast: date < todayMid,
      });
    }
    return out;
  }, [viewMonth, byDay, now]);

  const selDate = selected ? new Date(selected + "T00:00:00") : null;
  const selClasses = selected ? (byDay.get(selected) || []) : [];

  return (
    <>
      <Account auth={auth} nudge={nudge} accountRef={accountRef} />

      <div className="rp-card">
        <img className="rp-card__mark" src="assets/cala-isotipo.svg" alt="" aria-hidden="true" />
        {rows === null ? (
          <div className="ag-empty">Cargando calendario…</div>
        ) : (
          <div className="cal-layout">
            <div className="cal">
              <div className="cal-head">
                <span className="cal-title">{MES_LONG[viewMonth.getMonth()]} <b>{viewMonth.getFullYear()}</b></span>
                <div className="cal-nav">
                  <button aria-label="Mes anterior" onClick={() => setViewMonth(m => addMonths(m, -1))}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                  </button>
                  <button aria-label="Mes siguiente" onClick={() => setViewMonth(m => addMonths(m, 1))}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                  </button>
                </div>
              </div>
              <div className="cal-dow">{DOW.map((d, i) => <span key={i}>{d}</span>)}</div>
              <div className="cal-grid">
                {cells.map((c, i) => c === null
                  ? <span key={i} className="cal-cell empty" />
                  : (
                    <button
                      key={c.key}
                      className={"cal-cell"
                        + (c.hasClass ? " has-class" : "") + (c.selectable ? " selectable" : "")
                        + (c.isToday ? " is-today" : "") + (c.isPast ? " is-past" : "")
                        + (c.key === selected ? " is-selected" : "")}
                      disabled={!c.selectable}
                      onClick={() => c.selectable && setSelected(c.key)}
                    >
                      <span className="dn">{c.d}</span>
                      <span className="mk" />
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="day-panel">
              {selDate ? (
                <>
                  <div className="dp-head">{DIA_LONG[selDate.getDay()]} <b>{selDate.getDate()} {MES_SHORT[selDate.getMonth()]}</b></div>
                  {selClasses.length ? selClasses.map(c => (
                    <DayClass key={c.id} c={c} now={now} busy={busy} onReserve={onReserve} onCancel={onCancel} />
                  )) : <div className="dp-none">No hay clases este día</div>}
                </>
              ) : (
                <div className="dp-none">Elige un día con clase en el calendario</div>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="rp-fine">Reservar solo aparta tu hueco<br />Cancela hasta <em>12&nbsp;h antes</em></p>

      <div className={"ag-toast" + (toast ? " show" : "")}>
        <span className="y" />{toast}
      </div>
    </>
  );
}

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase.js";
import { CONTACT } from "../data.js";

const DOW       = ["L", "M", "X", "J", "V", "S", "D"];
const MES_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MES_LONG  = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIA_LONG  = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// Horas SIEMPRE en hora de Madrid (no depende de la zona del navegador)
const HORA = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Madrid" });
const firstOfMonth = d => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);

// Número de WhatsApp (del teléfono de contacto, solo dígitos)
const WA_NUMBER = CONTACT.phoneHref.replace(/\D/g, "");

// Cuando la clase está completa, la persona se apunta a la lista de espera
// con su nombre y apellidos. Va a Supabase (waitlist_join) y sale en gestión.
function WaitlistJoin({ sessionId }) {
  const [open, setOpen]           = useState(false);
  const [nombre, setNombre]       = useState("");
  const [apellidos, setApellidos] = useState("");
  const [tel, setTel]             = useState("");
  const [state, setState]         = useState("idle"); // idle | sending | done | error

  const ready = nombre.trim() && apellidos.trim();

  const submit = async (e) => {
    e.preventDefault();
    if (!ready || state === "sending") return;
    setState("sending");
    const nombreCompleto = `${nombre.trim()} ${apellidos.trim()}`;
    const { error } = await supabase.rpc("waitlist_join", {
      p_session_id: sessionId, p_nombre: nombreCompleto, p_telefono: tel.trim() || null,
    });
    setState(error ? "error" : "done");
  };

  if (state === "done") {
    return (
      <p className="dp-wl-done">✓ Estás en la lista de espera<br />
        <span>Te avisamos si se libera una plaza</span></p>
    );
  }
  if (!open) {
    return (
      <button type="button" className="dp-wl-open" onClick={() => setOpen(true)}>
        Apuntarme a la lista de espera
      </button>
    );
  }
  return (
    <form className="dp-wl" onSubmit={submit}>
      <input className="dp-wl-f" placeholder="Nombre" autoComplete="given-name"
             value={nombre} onChange={e => setNombre(e.target.value)} />
      <input className="dp-wl-f" placeholder="Apellidos" autoComplete="family-name"
             value={apellidos} onChange={e => setApellidos(e.target.value)} />
      <input className="dp-wl-f" type="tel" inputMode="tel" placeholder="Teléfono (opcional)"
             autoComplete="tel" value={tel} onChange={e => setTel(e.target.value)} />
      <button className="dp-wl-b" disabled={!ready || state === "sending"}>
        {state === "sending" ? "…" : "Apuntarme"}
      </button>
      {state === "error" && <span className="dp-wl-err">No se pudo apuntar, inténtalo de nuevo</span>}
    </form>
  );
}

function DayItem({ c, now, dateLabel }) {
  const isEvent = c.kind === "event";
  const isPast  = c.start.getTime() < now;
  const isFull  = c.free <= 0;
  const isTight = !isFull && c.free <= 2;
  const nombre  = isEvent ? c.type.name : `${c.type.name} ${c.type.nameEm}`;
  const verbo   = isEvent ? "apuntarme a" : "reservar";
  const msg     = `Hola! Quiero ${verbo} ${nombre} el ${dateLabel} a las ${c.timeStart}`;
  const waHref  = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;

  let status;
  if (isPast)      status = <span className="tag full">Finalizada</span>;
  else if (isFull) status = <span className="tag full">Completo</span>;
  else {
    const txt = c.free === 1 ? "Queda 1 plaza" : `Quedan ${c.free} de ${c.capacity}`;
    status = <span className={"tag " + (isTight ? "tight" : "open")}><span className="y" />{txt}</span>;
  }

  return (
    <div className={"dp-row" + (isEvent ? " is-event" : "") + (isTight ? " is-tight" : "") + (isFull ? " is-full" : "") + (isPast ? " is-past" : "")}>
      <div className="dp-time">
        <span className="t">{c.timeStart}</span>
        <span className="e">— {c.timeEnd} · {c.durationMin} min</span>
      </div>
      <div className="dp-main">
        {isEvent ? (
          <>
            <span className="dp-kind">Evento</span>
            <h4>{c.type.name}</h4>
            {c.descripcion && <p className="dp-desc">{c.descripcion}</p>}
          </>
        ) : (
          <h4>{c.type.name} <em>{c.type.nameEm}</em></h4>
        )}
        {status}
        {isFull && !isPast && <WaitlistJoin sessionId={c.id} />}
      </div>
      {!isPast && !isFull && (
        <div className="dp-act">
          <a className="b" href={waHref} target="_blank" rel="noopener">Reservar por WhatsApp</a>
        </div>
      )}
    </div>
  );
}

export default function BookingWidget() {
  const now = Date.now();

  const [rows, setRows]           = useState(null);
  const [viewMonth, setViewMonth] = useState(() => firstOfMonth(new Date()));
  const [selected, setSelected]   = useState(null);
  const didInitMonth = useRef(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("session_availability").select("*");
    setRows(data ?? []);
  }, []);

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
        id: r.session_id,
        kind: r.category === "evento" ? "event" : "class",
        type: { name: r.name, nameEm: r.name_em, meta: r.meta },
        descripcion: r.descripcion,
        capacity: r.capacity, free: r.spots_left,
        start, end,
        durationMin: Math.round((end - start) / 60000),
        timeStart: HORA.format(start),
        timeEnd: HORA.format(end),
        key: ymd(start),
      };
    });
  }, [rows]);

  const byDay = useMemo(() => {
    const m = new Map();
    for (const c of classes) {
      if (!m.has(c.key)) m.set(c.key, []);
      m.get(c.key).push(c);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.start - b.start);
    return m;
  }, [classes]);

  // Al cargar, sitúa el calendario en el primer mes con clases — SIN abrir
  // ningún día. El desglose solo aparece al clicar una fecha.
  useEffect(() => {
    if (!rows || didInitMonth.current) return;
    didInitMonth.current = true;
    const fut = classes.filter(c => c.end.getTime() > now).sort((a, b) => a.start - b.start);
    if (fut.length) setViewMonth(firstOfMonth(fut[0].start));
  }, [rows, classes, now]);

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
        hasClass: dayClasses.some(c => c.kind === "class"),
        hasEvent: dayClasses.some(c => c.kind === "event"),
        selectable: dayClasses.some(c => c.end.getTime() > now),
        isToday: key === todayKey,
        isPast: date < todayMid,
      });
    }
    return out;
  }, [viewMonth, byDay, now]);

  const selDate = selected ? new Date(selected + "T00:00:00") : null;
  const selClasses = selected ? (byDay.get(selected) || []) : [];
  const dateLabel = selDate
    ? `${DIA_LONG[selDate.getDay()].toLowerCase()} ${selDate.getDate()} de ${MES_LONG[selDate.getMonth()].toLowerCase()}`
    : "";

  return (
    <>
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
                        + (c.hasClass ? " has-class" : "") + (c.hasEvent ? " has-event" : "")
                        + (c.selectable ? " selectable" : "")
                        + (c.isToday ? " is-today" : "") + (c.isPast ? " is-past" : "")
                        + (c.key === selected ? " is-selected" : "")}
                      disabled={!c.selectable}
                      onClick={() => c.selectable && setSelected(c.key)}
                    >
                      <span className="dn">{c.d}</span>
                      <span className="cal-marks">
                        {c.hasClass && <span className="mk mk-class" />}
                        {c.hasEvent && <span className="mk mk-event" />}
                      </span>
                    </button>
                  )
                )}
              </div>
            </div>

            <div className={"day-panel" + (selDate ? " is-open" : "")}>
              <div className="dp-inner">
                {selDate && (
                  <div className="dp-card">
                    <div className="dp-head">
                      <span className="dp-date">{DIA_LONG[selDate.getDay()]} <b>{selDate.getDate()} {MES_SHORT[selDate.getMonth()]}</b></span>
                      <button className="dp-close" aria-label="Cerrar" onClick={() => setSelected(null)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                      </button>
                    </div>
                    <div className="dp-list">
                      {selClasses.length ? selClasses.map(c => (
                        <DayItem key={c.id} c={c} now={now} dateLabel={dateLabel} />
                      )) : <div className="dp-none">No hay nada este día</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="rp-fine">Reservar te lleva a WhatsApp<br />Te confirmamos tu plaza al momento</p>
    </>
  );
}

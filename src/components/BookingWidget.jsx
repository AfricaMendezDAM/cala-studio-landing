import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase.js";
import { CONTACT } from "../data.js";

const DOW       = ["L", "M", "X", "J", "V", "S", "D"];
const MES_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MES_LONG  = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIA_LONG  = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const firstOfMonth = d => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);

// Número de WhatsApp (del teléfono de contacto, solo dígitos)
const WA_NUMBER = CONTACT.phoneHref.replace(/\D/g, "");

function DayItem({ c, now, dateLabel }) {
  const isEvent = c.kind === "event";
  const isPast  = c.start.getTime() < now;
  const nombre  = isEvent ? c.type.name : `${c.type.name} ${c.type.nameEm}`;
  const verbo   = isEvent ? "apuntarme a" : "reservar";
  const msg     = `Hola! Quiero ${verbo} ${nombre} el ${dateLabel} a las ${c.timeStart}`;
  const waHref  = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;

  return (
    <div className={"dp-row" + (isEvent ? " is-event" : "") + (isPast ? " is-past" : "")}>
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
        <span className="tag open">Aforo {c.capacity}</span>
      </div>
      <div className="dp-act">
        {isPast
          ? <span className="tag full">Finalizada</span>
          : <a className="b" href={waHref} target="_blank" rel="noopener">Reservar por WhatsApp</a>}
      </div>
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
        capacity: r.capacity,
        start, end,
        durationMin: Math.round((end - start) / 60000),
        timeStart: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
        timeEnd: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
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

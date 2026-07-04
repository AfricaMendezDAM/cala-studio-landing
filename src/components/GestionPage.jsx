import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../lib/supabase.js";

const HORA   = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Madrid" });
const FECHA  = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" });
const DAYKEY = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Europe/Madrid" });

export default function GestionPage() {
  const [pin, setPin]       = useState(() => sessionStorage.getItem("cala_admin_pin") || "");
  const [authed, setAuthed] = useState(false);
  const [rows, setRows]     = useState(null);
  const [busy, setBusy]     = useState(false);
  const [err, setErr]       = useState("");

  useEffect(() => { window.scrollTo(0, 0); }, []);
  const goHome = (e) => { e.preventDefault(); window.location.hash = ""; };

  const load = useCallback(async () => {
    const { data } = await supabase.from("session_availability").select("*");
    setRows(data ?? []);
  }, []);

  const unlock = useCallback(async (p) => {
    const { data, error } = await supabase.rpc("admin_check_pin", { p_pin: p });
    if (error || !data) return false;
    sessionStorage.setItem("cala_admin_pin", p);
    setAuthed(true);
    load();
    return true;
  }, [load]);

  // Si ya había PIN guardado en la sesión, entra solo.
  useEffect(() => { if (pin) unlock(pin); /* eslint-disable-next-line */ }, []);

  const enter = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    const ok = await unlock(pin.trim());
    setBusy(false);
    if (!ok) setErr("PIN incorrecto");
  };

  const setReservadas = async (id, n) => {
    setBusy(true);
    const { error } = await supabase.rpc("set_reservadas", { p_session_id: id, p_reservadas: n, p_pin: pin });
    setBusy(false);
    if (error) { setErr("No se pudo guardar"); setTimeout(() => setErr(""), 2500); return; }
    load();
  };

  const days = useMemo(() => {
    if (!rows) return [];
    const now = Date.now();
    const future = rows
      .filter(r => new Date(r.ends_at).getTime() > now)
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
    const map = new Map();
    for (const r of future) {
      const d = new Date(r.starts_at);
      const key = DAYKEY.format(d);
      if (!map.has(key)) map.set(key, { key, label: FECHA.format(d), items: [] });
      map.get(key).items.push(r);
    }
    return [...map.values()];
  }, [rows]);

  return (
    <main className="gestion">
      <div className="gp-head">
        <a href="#" className="gp-back" onClick={goHome}>‹ Volver al estudio</a>
        <span className="gp-brand">cala<span className="d">.</span>studio · <em>gestión</em></span>
      </div>

      {!authed ? (
        <form className="gp-pin" onSubmit={enter}>
          <span className="gp-ey">Panel privado</span>
          <p className="gp-lead">Introduce tu PIN para gestionar el aforo</p>
          <div className="gp-pin-row">
            <input type="password" inputMode="numeric" autoComplete="off" placeholder="PIN"
                   value={pin} onChange={e => setPin(e.target.value)} />
            <button className="gp-b" disabled={busy}>{busy ? "…" : "Entrar"}</button>
          </div>
          {err && <span className="gp-err">{err}</span>}
        </form>
      ) : rows === null ? (
        <div className="gp-loading">Cargando…</div>
      ) : (
        <div className="gp-body">
          <p className="gp-hint">Resta una plaza cuando alguien reserva · suma si cancela</p>
          {days.length === 0 && <div className="gp-loading">No hay clases próximas</div>}
          {days.map(day => (
            <section key={day.key} className="gp-day">
              <h3 className="gp-date">{day.label}</h3>
              {day.items.map(s => {
                const nombre = s.category === "evento" ? s.titulo : `${s.name} ${s.name_em}`;
                const full = s.spots_left <= 0;
                return (
                  <div key={s.session_id} className="gp-row">
                    <div className="gp-when">
                      <b>{HORA.format(new Date(s.starts_at))}</b>
                      <span>{nombre}</span>
                    </div>
                    <div className="gp-ctrl">
                      <button className="gp-step" aria-label="Una reserva más"
                              disabled={busy || full}
                              onClick={() => setReservadas(s.session_id, s.reservadas + 1)}>−</button>
                      <span className={"gp-count" + (full ? " full" : "")}>
                        {full ? "Completo" : `${s.spots_left}/${s.capacity}`}
                      </span>
                      <button className="gp-step" aria-label="Una reserva menos"
                              disabled={busy || s.reservadas <= 0}
                              onClick={() => setReservadas(s.session_id, s.reservadas - 1)}>+</button>
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      )}

      {err && authed && <div className="gp-toast">{err}</div>}
    </main>
  );
}

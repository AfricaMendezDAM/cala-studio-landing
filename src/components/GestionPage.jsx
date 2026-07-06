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
  const [openId, setOpenId] = useState(null);          // sesión desplegada
  const [guests, setGuests] = useState({});            // { [sessionId]: array | "loading" }

  useEffect(() => { window.scrollTo(0, 0); }, []);
  const goHome = (e) => { e.preventDefault(); window.location.hash = ""; };

  const toast = useCallback((m) => { setErr(m); setTimeout(() => setErr(""), 2500); }, []);

  const load = useCallback(async () => {
    const { data } = await supabase.from("session_availability").select("*");
    setRows(data ?? []);
  }, []);

  const loadGuests = useCallback(async (sessionId) => {
    setGuests(g => ({ ...g, [sessionId]: g[sessionId] ?? "loading" }));
    const { data, error } = await supabase.rpc("admin_list_guests", { p_session_id: sessionId, p_pin: pin });
    if (error) { toast("No se pudo cargar la lista"); setGuests(g => ({ ...g, [sessionId]: [] })); return; }
    setGuests(g => ({ ...g, [sessionId]: data ?? [] }));
  }, [pin, toast]);

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

  const toggle = (sessionId) => {
    const next = openId === sessionId ? null : sessionId;
    setOpenId(next);
    if (next && guests[sessionId] === undefined) loadGuests(sessionId);
  };

  const addGuest = async (sessionId, nombre, telefono) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_add_guest", {
      p_session_id: sessionId, p_nombre: nombre, p_telefono: telefono || null, p_pin: pin,
    });
    setBusy(false);
    if (error) {
      toast(/AFORO_COMPLETO/.test(error.message) ? "La clase está completa" : "No se pudo apuntar");
      return false;
    }
    await Promise.all([loadGuests(sessionId), load()]);
    return true;
  };

  const updateGuest = async (sessionId, guestId, nombre, telefono) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_update_guest", {
      p_guest_id: guestId, p_nombre: nombre, p_telefono: telefono || null, p_pin: pin,
    });
    setBusy(false);
    if (error) { toast("No se pudo guardar"); return false; }
    await loadGuests(sessionId);   // editar no cambia el aforo → no hace falta recargar todo
    return true;
  };

  const removeGuest = async (sessionId, guestId) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_remove_guest", { p_guest_id: guestId, p_pin: pin });
    setBusy(false);
    if (error) { toast("No se pudo quitar"); return; }
    await Promise.all([loadGuests(sessionId), load()]);
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
      <header className="gp-head">
        <a href="#" className="gp-back" onClick={goHome}>‹ Volver al estudio</a>
        <span className="gp-mark">cala<span className="d">.</span>studio</span>
      </header>
      <h1 className="gp-title">Gestión de <em>reservas</em></h1>

      {!authed ? (
        <form className="gp-pin" onSubmit={enter}>
          <span className="gp-ey">Panel privado</span>
          <p className="gp-lead">Introduce tu PIN para gestionar las reservas</p>
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
          <p className="gp-hint">Apunta a cada persona que te confirma · las plazas se restan solas</p>
          {days.length === 0 && <div className="gp-loading">No hay clases próximas</div>}
          {days.map(day => (
            <section key={day.key} className="gp-day">
              <h3 className="gp-date">{day.label}</h3>
              {day.items.map(s => {
                const nombre = s.category === "evento" ? s.titulo : `${s.name} ${s.name_em}`;
                const full = s.spots_left <= 0;
                const open = openId === s.session_id;
                return (
                  <div key={s.session_id} className={"gp-item" + (open ? " open" : "")}>
                    <button className="gp-row" aria-expanded={open} onClick={() => toggle(s.session_id)}>
                      <span className="gp-when">
                        <b>{HORA.format(new Date(s.starts_at))}</b>
                        <span>{nombre}</span>
                      </span>
                      <span className="gp-ctrl">
                        <span className={"gp-count" + (full ? " full" : "")}>
                          {full ? "Completo" : `${s.reservadas}/${s.capacity}`}
                        </span>
                        <span className="gp-caret" aria-hidden="true">▾</span>
                      </span>
                    </button>
                    {open && (
                      <GuestPanel
                        list={guests[s.session_id]}
                        full={full}
                        busy={busy}
                        onAdd={(n, t) => addGuest(s.session_id, n, t)}
                        onUpdate={(gid, n, t) => updateGuest(s.session_id, gid, n, t)}
                        onRemove={(gid) => removeGuest(s.session_id, gid)}
                      />
                    )}
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

function GuestPanel({ list, full, busy, onAdd, onUpdate, onRemove }) {
  const [nombre, setNombre] = useState("");
  const [tel, setTel]       = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    const ok = await onAdd(nombre.trim(), tel.trim());
    if (ok) { setNombre(""); setTel(""); }
  };

  return (
    <div className="gp-panel">
      {list === "loading" || list === undefined ? (
        <div className="gp-panel-load">Cargando…</div>
      ) : list.length === 0 ? (
        <p className="gp-empty">Aún no hay nadie apuntado</p>
      ) : (
        <ul className="gp-guests">
          {list.map(g => (
            <GuestRow key={g.id} guest={g} busy={busy}
                      onSave={(n, t) => onUpdate(g.id, n, t)}
                      onRemove={() => onRemove(g.id)} />
          ))}
        </ul>
      )}

      {full ? (
        <p className="gp-full-note">Clase completa</p>
      ) : (
        <form className="gp-add" onSubmit={submit}>
          <input className="gp-add-nombre" placeholder="Nombre" value={nombre}
                 autoComplete="off" onChange={e => setNombre(e.target.value)} />
          <input className="gp-add-tel" type="tel" inputMode="tel" placeholder="Teléfono (opcional)"
                 autoComplete="off" value={tel} onChange={e => setTel(e.target.value)} />
          <button className="gp-add-b" disabled={busy || !nombre.trim()}>Apuntar</button>
        </form>
      )}
    </div>
  );
}

function GuestRow({ guest, busy, onSave, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [nombre, setNombre]   = useState(guest.nombre);
  const [tel, setTel]         = useState(guest.telefono || "");

  const start = () => { setNombre(guest.nombre); setTel(guest.telefono || ""); setEditing(true); };
  const save = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    const ok = await onSave(nombre.trim(), tel.trim());
    if (ok) setEditing(false);
  };

  if (editing) {
    return (
      <li className="gp-guest editing">
        <form className="gp-guest-edit" onSubmit={save}>
          <input className="gp-add-nombre" placeholder="Nombre" value={nombre}
                 autoComplete="off" autoFocus onChange={e => setNombre(e.target.value)} />
          <input className="gp-add-tel" type="tel" inputMode="tel" placeholder="Teléfono (opcional)"
                 autoComplete="off" value={tel} onChange={e => setTel(e.target.value)} />
          <button type="submit" className="gp-guest-save" disabled={busy || !nombre.trim()}>Guardar</button>
          <button type="button" className="gp-guest-cancel" disabled={busy}
                  onClick={() => setEditing(false)}>Cancelar</button>
        </form>
      </li>
    );
  }

  return (
    <li className="gp-guest">
      <span className="gp-guest-name">{guest.nombre}</span>
      {guest.telefono
        ? <a className="gp-guest-tel" href={`tel:${guest.telefono}`}>{guest.telefono}</a>
        : <span className="gp-guest-tel none">sin teléfono</span>}
      <button className="gp-guest-edit-b" aria-label={`Editar a ${guest.nombre}`}
              disabled={busy} onClick={start}>✎</button>
      <button className="gp-guest-x" aria-label={`Quitar a ${guest.nombre}`}
              disabled={busy} onClick={onRemove}>✕</button>
    </li>
  );
}

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../lib/supabase.js";
import { PRODUCTOS, BONO_TIPOS, MOTIVOS_RECUPERACION } from "../data.js";

const HORA   = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Madrid" });
const FECHA  = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" });
const DAYKEY = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Europe/Madrid" });
const EUR    = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const DIA    = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" });

const METODOS = [
  { value: "efectivo",      label: "Efectivo" },
  { value: "bizum",         label: "Bizum" },
  { value: "transferencia", label: "Transferencia" },
];

const TABS = [
  { id: "reservas",  label: "Reservas" },
  { id: "bonos",     label: "Bonos" },
  { id: "recuperar", label: "Recuperar" },
  { id: "pagos",     label: "Pagos" },
];

// Hoy en Madrid, en formato yyyy-mm-dd (el que entienden los <input type="date">)
const hoyISO = () => DAYKEY.format(new Date());
// Una fecha suelta (yyyy-mm-dd) se pinta sin pasar por zonas horarias: el string
// ya es la fecha buena, así que se formatea a mediodía y no se mueve de día.
const diaCorto = (iso) => (iso ? DIA.format(new Date(`${iso}T12:00:00`)) : "");

export default function GestionPage() {
  const [pin, setPin]       = useState(() => sessionStorage.getItem("cala_admin_pin") || "");
  const [authed, setAuthed] = useState(false);
  const [rows, setRows]     = useState(null);
  const [busy, setBusy]     = useState(false);
  const [err, setErr]       = useState("");
  const [openId, setOpenId] = useState(null);          // sesión desplegada
  const [guests, setGuests] = useState({});            // { [sessionId]: array | "loading" }
  const [waits, setWaits]   = useState({});            // lista de espera { [sessionId]: array | "loading" }
  const [tab, setTab]       = useState("reservas");    // pestaña activa: reservas | pagos

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

  const loadWaits = useCallback(async (sessionId) => {
    setWaits(w => ({ ...w, [sessionId]: w[sessionId] ?? "loading" }));
    const { data, error } = await supabase.rpc("admin_list_waitlist", { p_session_id: sessionId, p_pin: pin });
    if (error) { toast("No se pudo cargar la lista de espera"); setWaits(w => ({ ...w, [sessionId]: [] })); return; }
    setWaits(w => ({ ...w, [sessionId]: data ?? [] }));
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
    if (next && waits[sessionId]  === undefined) loadWaits(sessionId);
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

  const addWait = async (sessionId, nombre, telefono, email) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_add_waitlist", {
      p_session_id: sessionId, p_nombre: nombre, p_telefono: telefono || null,
      p_email: email || null, p_pin: pin,
    });
    setBusy(false);
    if (error) { toast("No se pudo apuntar a la lista de espera"); return false; }
    await Promise.all([loadWaits(sessionId), load()]);
    return true;
  };

  // Marcar como COMPLETO sin tocar el aforo: la web deja de ofrecer reserva y
  // enseña "Agotado" con la lista de espera. Se puede reabrir cuando quieras.
  const setSoldOut = async (sessionId, value) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_set_sold_out", {
      p_session_id: sessionId, p_sold_out: value, p_pin: pin,
    });
    setBusy(false);
    if (error) { toast("No se pudo cambiar el estado"); return; }
    await load();
  };

  // Nº de plazas de una sesión (útil en eventos, donde el aforo se cierra tarde)
  const setCapacity = async (sessionId, capacity) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_set_capacity", {
      p_session_id: sessionId, p_capacity: capacity, p_pin: pin,
    });
    setBusy(false);
    if (error) {
      toast(/AFORO_MENOR/.test(error.message)
        ? "Hay más personas apuntadas que plazas"
        : "No se pudo cambiar el aforo");
      return false;
    }
    await load();
    return true;
  };

  const removeWait = async (sessionId, waitId) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_remove_waitlist", { p_waitlist_id: waitId, p_pin: pin });
    setBusy(false);
    if (error) { toast("No se pudo quitar"); return; }
    await Promise.all([loadWaits(sessionId), load()]);
  };

  // Pasar a la clase: apunta a la persona como reserva y la saca de la espera.
  // Reutiliza el aforo atómico de admin_add_guest (falla si ya está completa).
  const promoteWait = async (sessionId, w) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_add_guest", {
      p_session_id: sessionId, p_nombre: w.nombre, p_telefono: w.telefono || null, p_pin: pin,
    });
    if (error) {
      setBusy(false);
      toast(/AFORO_COMPLETO/.test(error.message) ? "La clase está completa" : "No se pudo pasar a la clase");
      return;
    }
    await supabase.rpc("admin_remove_waitlist", { p_waitlist_id: w.id, p_pin: pin });
    setBusy(false);
    await Promise.all([loadGuests(sessionId), loadWaits(sessionId), load()]);
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
      ) : (
        <div className="gp-body">
          <div className="gp-tabs" role="tablist">
            {TABS.map(t => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
                      className={"gp-tab" + (tab === t.id ? " on" : "")}
                      onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
          </div>

          {tab === "pagos" ? (
            <PaymentsView pin={pin} toast={toast} />
          ) : tab === "bonos" ? (
            <PacksView pin={pin} toast={toast} />
          ) : tab === "recuperar" ? (
            <MakeupsView pin={pin} toast={toast} />
          ) : rows === null ? (
            <div className="gp-loading">Cargando…</div>
          ) : (
            <div className="gp-reservas">
              <p className="gp-hint">Apunta a cada persona que te confirma · las plazas se restan solas</p>
              {days.length === 0 && <div className="gp-loading">No hay clases próximas</div>}
              {days.map(day => (
                <section key={day.key} className="gp-day">
                  <h3 className="gp-date">{day.label}</h3>
                  {day.items.map(s => {
                    const esEvento = s.category === "evento";
                    const nombre = esEvento ? s.titulo : `${s.name} ${s.name_em}`;
                    const lleno   = s.spots_left <= 0;   // aforo lleno de verdad
                    const cerrado = s.is_full;           // completo de cara al público
                    const open = openId === s.session_id;
                    return (
                      <div key={s.session_id} className={"gp-item" + (open ? " open" : "")}>
                        <button className="gp-row" aria-expanded={open} onClick={() => toggle(s.session_id)}>
                          <span className="gp-when">
                            <b>{HORA.format(new Date(s.starts_at))}</b>
                            <span>{nombre}</span>
                            {esEvento && <span className="gp-evento-k">Evento</span>}
                          </span>
                          <span className="gp-ctrl">
                            {s.waitlist_count > 0 && (
                              <span className="gp-wl-badge">{s.waitlist_count} en espera</span>
                            )}
                            <span className={"gp-count" + (cerrado ? " full" : "")}>
                              {cerrado ? "Completo" : `${s.reservadas}/${s.capacity}`}
                            </span>
                            <span className="gp-caret" aria-hidden="true">▾</span>
                          </span>
                        </button>
                        {open && (
                          <GuestPanel
                            list={guests[s.session_id]}
                            waitlist={waits[s.session_id]}
                            full={lleno}
                            soldOut={!!s.sold_out}
                            capacity={s.capacity}
                            busy={busy}
                            onAdd={(n, t) => addGuest(s.session_id, n, t)}
                            onUpdate={(gid, n, t) => updateGuest(s.session_id, gid, n, t)}
                            onRemove={(gid) => removeGuest(s.session_id, gid)}
                            onWaitAdd={(n, t, m) => addWait(s.session_id, n, t, m)}
                            onWaitRemove={(wid) => removeWait(s.session_id, wid)}
                            onPromote={(w) => promoteWait(s.session_id, w)}
                            onSoldOut={(v) => setSoldOut(s.session_id, v)}
                            onCapacity={(n) => setCapacity(s.session_id, n)}
                          />
                        )}
                      </div>
                    );
                  })}
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {err && authed && <div className="gp-toast">{err}</div>}
    </main>
  );
}

function GuestPanel({ list, waitlist, full, soldOut, capacity, busy,
                     onAdd, onUpdate, onRemove, onWaitAdd, onWaitRemove, onPromote,
                     onSoldOut, onCapacity }) {
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
      <CapacityBar capacity={capacity} soldOut={soldOut} busy={busy}
                   onSoldOut={onSoldOut} onCapacity={onCapacity} />

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
        <p className="gp-full-note">No quedan plazas</p>
      ) : (
        <form className="gp-add" onSubmit={submit}>
          <input className="gp-add-nombre" placeholder="Nombre" value={nombre}
                 autoComplete="off" onChange={e => setNombre(e.target.value)} />
          <input className="gp-add-tel" type="tel" inputMode="tel" placeholder="Teléfono (opcional)"
                 autoComplete="off" value={tel} onChange={e => setTel(e.target.value)} />
          <button className="gp-add-b" disabled={busy || !nombre.trim()}>Apuntar</button>
        </form>
      )}

      <WaitlistPanel list={waitlist} full={full} busy={busy}
                     onAdd={onWaitAdd} onRemove={onWaitRemove} onPromote={onPromote} />
    </div>
  );
}

// Plazas de la sesión y botón de COMPLETO. Marcar como completo no toca el
// aforo: solo cierra la reserva en la web (sale "Agotado" y la gente deja su
// contacto). Aquí dentro puedes seguir apuntando a mano mientras queden plazas.
function CapacityBar({ capacity, soldOut, busy, onSoldOut, onCapacity }) {
  const [val, setVal] = useState(String(capacity ?? ""));
  useEffect(() => { setVal(String(capacity ?? "")); }, [capacity]);

  const n = Number(val);
  const changed = val.trim() !== "" && Number.isInteger(n) && n >= 1 && n !== capacity;

  const save = async (e) => {
    e.preventDefault();
    if (!changed) return;
    const ok = await onCapacity(n);
    if (!ok) setVal(String(capacity ?? ""));
  };

  return (
    <div className="gp-cap">
      <form className="gp-cap-form" onSubmit={save}>
        <span className="gp-cap-k">Plazas</span>
        <input className="gp-cap-f" type="number" inputMode="numeric" min="1" max="200"
               value={val} onChange={e => setVal(e.target.value)} aria-label="Número de plazas" />
        {changed && <button className="gp-cap-save" disabled={busy}>Guardar</button>}
      </form>

      <button type="button" className={"gp-soldout" + (soldOut ? " on" : "")}
              disabled={busy} onClick={() => onSoldOut(!soldOut)}>
        {soldOut ? "↺ Reabrir reservas" : "✕ Marcar como completo"}
      </button>

      {soldOut && (
        <p className="gp-cap-note">
          En la web sale <b>Agotado</b> · quien entre deja su contacto para la lista de espera
        </p>
      )}
    </div>
  );
}

// Lista de espera de una clase: quién se ha apuntado (por la web o a mano),
// alta manual, quitar, y "pasar a la clase" cuando se libera una plaza.
function WaitlistPanel({ list, full, busy, onAdd, onRemove, onPromote }) {
  const [nombre, setNombre] = useState("");
  const [tel, setTel]       = useState("");
  const [email, setEmail]   = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    const ok = await onAdd(nombre.trim(), tel.trim(), email.trim());
    if (ok) { setNombre(""); setTel(""); setEmail(""); }
  };

  const count = Array.isArray(list) ? list.length : 0;

  return (
    <div className="gp-wl">
      <div className="gp-wl-head">
        <span className="gp-wl-title">Lista de espera</span>
        {count > 0 && <span className="gp-wl-n">{count}</span>}
      </div>

      {list === "loading" || list === undefined ? (
        <div className="gp-panel-load">Cargando…</div>
      ) : list.length === 0 ? (
        <p className="gp-empty">Nadie en espera</p>
      ) : (
        <ul className="gp-wl-list">
          {list.map(w => (
            <li key={w.id} className="gp-wl-item">
              <div className="gp-wl-who">
                <span className="gp-wl-name">{w.nombre}</span>
                <span className="gp-wl-contacto">
                  {w.telefono
                    ? <a className="gp-wl-tel" href={`tel:${w.telefono}`}>{w.telefono}</a>
                    : <span className="gp-wl-tel none">sin teléfono</span>}
                  {w.email
                    ? <a className="gp-wl-mail" href={`mailto:${w.email}`}>{w.email}</a>
                    : <span className="gp-wl-mail none">sin email</span>}
                </span>
              </div>
              {!full && (
                <button type="button" className="gp-wl-promote" disabled={busy}
                        onClick={() => onPromote(w)}>→ A la clase</button>
              )}
              <button type="button" className="gp-guest-x" aria-label={`Quitar a ${w.nombre} de la espera`}
                      disabled={busy} onClick={() => onRemove(w.id)}>✕</button>
            </li>
          ))}
        </ul>
      )}

      <form className="gp-add gp-wl-add" onSubmit={submit}>
        <input className="gp-add-nombre" placeholder="Nombre y apellidos" value={nombre}
               autoComplete="off" onChange={e => setNombre(e.target.value)} />
        <input className="gp-add-tel" type="tel" inputMode="tel" placeholder="Teléfono"
               autoComplete="off" value={tel} onChange={e => setTel(e.target.value)} />
        <input className="gp-add-mail" type="email" inputMode="email" placeholder="Email"
               autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} />
        <button className="gp-add-b" disabled={busy || !nombre.trim()}>A la espera</button>
      </form>
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

// ── Registro de pagos ──────────────────────────────────────────────────────
function PaymentsView({ pin, toast }) {
  const [list, setList]     = useState(null);
  const [busy, setBusy]     = useState(false);
  const [editId, setEditId] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_list_payments", { p_pin: pin });
    if (error) { toast("No se pudieron cargar los pagos"); setList([]); return; }
    setList(data ?? []);
  }, [pin, toast]);

  useEffect(() => { load(); }, [load]);

  const add = async (p) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_add_payment", {
      p_nombre: p.nombre, p_telefono: p.telefono || null, p_concepto: p.concepto,
      p_importe: p.importe, p_metodo: p.metodo || null, p_nota: p.nota || null,
      p_estado: p.estado, p_pin: pin,
    });
    setBusy(false);
    if (error) { toast("No se pudo apuntar el pago"); return false; }
    await load();
    return true;
  };

  const update = async (id, p) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_update_payment", {
      p_id: id, p_nombre: p.nombre, p_telefono: p.telefono || null, p_concepto: p.concepto,
      p_importe: p.importe, p_metodo: p.metodo || null, p_nota: p.nota || null, p_pin: pin,
    });
    setBusy(false);
    if (error) { toast("No se pudo guardar"); return false; }
    setEditId(null);
    await load();
    return true;
  };

  const setEstado = async (id, estado) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_set_payment_estado", { p_id: id, p_estado: estado, p_pin: pin });
    setBusy(false);
    if (error) { toast("No se pudo actualizar"); return; }
    await load();
  };

  const remove = async (id) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_remove_payment", { p_id: id, p_pin: pin });
    setBusy(false);
    if (error) { toast("No se pudo borrar"); return; }
    await load();
  };

  if (list === null) return <div className="gp-loading">Cargando…</div>;

  const pendientes = list.filter(p => p.estado === "pendiente");
  const pagados    = list.filter(p => p.estado === "pagado");
  const suma = (arr) => arr.reduce((t, p) => t + Number(p.importe || 0), 0);

  return (
    <div className="gp-pagos">
      <details className="gp-pay-add">
        <summary className="gp-pay-add-toggle">+ Apuntar un pago</summary>
        <PaymentForm mode="add" busy={busy} onSubmit={add} />
      </details>

      <PaymentGroup
        title="Pendiente de cobro" tone="pend"
        items={pendientes} total={suma(pendientes)}
        empty="Nadie pendiente de pagar"
        busy={busy} editId={editId} setEditId={setEditId}
        onEstado={setEstado} onUpdate={update} onRemove={remove}
      />
      <PaymentGroup
        title="Cobrado" tone="paid"
        items={pagados} total={suma(pagados)}
        empty="Aún no has cobrado nada"
        busy={busy} editId={editId} setEditId={setEditId}
        onEstado={setEstado} onUpdate={update} onRemove={remove}
      />
    </div>
  );
}

function PaymentGroup({ title, tone, items, total, empty, busy, editId, setEditId, onEstado, onUpdate, onRemove }) {
  return (
    <section className={"gp-pay-group " + tone}>
      <header className="gp-pay-group-head">
        <span className="gp-pay-group-title">{title}</span>
        <span className="gp-pay-group-meta">
          <span className="gp-pay-count">{items.length}</span>
          <span className="gp-pay-total">{EUR.format(total)}</span>
        </span>
      </header>
      {items.length === 0 ? (
        <p className="gp-empty">{empty}</p>
      ) : (
        <ul className="gp-pay-list">
          {items.map(p => (
            <PaymentRow key={p.id} pay={p} busy={busy}
              editing={editId === p.id}
              onEdit={() => setEditId(p.id)}
              onCancelEdit={() => setEditId(null)}
              onSave={(payload) => onUpdate(p.id, payload)}
              onEstado={(estado) => onEstado(p.id, estado)}
              onRemove={() => onRemove(p.id)} />
          ))}
        </ul>
      )}
    </section>
  );
}

function PaymentRow({ pay, busy, editing, onEdit, onCancelEdit, onSave, onEstado, onRemove }) {
  if (editing) {
    return (
      <li className="gp-pay-item editing">
        <PaymentForm mode="edit" busy={busy} initial={pay} onSubmit={onSave} onCancel={onCancelEdit} />
      </li>
    );
  }
  const pagado = pay.estado === "pagado";
  return (
    <li className="gp-pay-item">
      <div className="gp-pay-main">
        <span className="gp-pay-nombre">{pay.nombre}</span>
        <span className="gp-pay-importe">{EUR.format(Number(pay.importe || 0))}</span>
      </div>
      <div className="gp-pay-sub">
        <span className="gp-pay-concepto">{pay.concepto}</span>
        {pay.metodo   && <span className="gp-pay-metodo">{pay.metodo}</span>}
        {pay.telefono && <a className="gp-pay-tel" href={`tel:${pay.telefono}`}>{pay.telefono}</a>}
      </div>
      {pay.nota && <p className="gp-pay-nota">{pay.nota}</p>}
      <div className="gp-pay-actions">
        <button type="button" className={"gp-pay-mark" + (pagado ? " undo" : "")} disabled={busy}
                onClick={() => onEstado(pagado ? "pendiente" : "pagado")}>
          {pagado ? "↺ Marcar pendiente" : "✓ Marcar pagado"}
        </button>
        <button type="button" className="gp-guest-edit-b" aria-label={`Editar el pago de ${pay.nombre}`}
                disabled={busy} onClick={onEdit}>✎</button>
        <button type="button" className="gp-guest-x" aria-label={`Borrar el pago de ${pay.nombre}`}
                disabled={busy} onClick={onRemove}>✕</button>
      </div>
    </li>
  );
}

function PaymentForm({ mode, initial, busy, onSubmit, onCancel }) {
  const [nombre, setNombre]     = useState(initial?.nombre ?? "");
  const [concepto, setConcepto] = useState(initial?.concepto ?? "");
  const [importe, setImporte]   = useState(initial?.importe != null ? String(initial.importe) : "");
  const [metodo, setMetodo]     = useState(initial?.metodo ?? "");
  const [tel, setTel]           = useState(initial?.telefono ?? "");
  const [nota, setNota]         = useState(initial?.nota ?? "");
  const [estado, setEstado]     = useState(initial?.estado ?? "pendiente");
  const [libre, setLibre]       = useState(() =>
    !!(initial?.concepto && !PRODUCTOS.some(p => p.concepto === initial.concepto)));

  // Elegir producto del catálogo rellena el importe; "Otro…" abre texto libre.
  const onProducto = (e) => {
    const v = e.target.value;
    if (v === "__otro__") { setLibre(true); setConcepto(""); setImporte(""); return; }
    setLibre(false);
    setConcepto(v);
    const prod = PRODUCTOS.find(p => p.concepto === v);
    if (prod) setImporte(String(prod.importe));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || !concepto.trim()) return;
    const ok = await onSubmit({
      nombre: nombre.trim(), telefono: tel.trim(), concepto: concepto.trim(),
      importe: importe === "" ? 0 : Number(importe),
      metodo, nota: nota.trim(), estado,
    });
    if (ok && mode === "add") {
      setNombre(""); setConcepto(""); setImporte(""); setMetodo("");
      setTel(""); setNota(""); setEstado("pendiente"); setLibre(false);
    }
  };

  return (
    <form className="gp-pay-form" onSubmit={submit}>
      <input className="gp-pay-f nombre" placeholder="Nombre" value={nombre}
             autoComplete="off" onChange={e => setNombre(e.target.value)} />

      <div className="gp-pay-prod">
        <select className="gp-pay-f concepto" value={libre ? "__otro__" : concepto} onChange={onProducto}>
          <option value="" disabled>Qué compró…</option>
          {PRODUCTOS.map(p => (
            <option key={p.concepto} value={p.concepto}>{p.concepto} · {p.importe} €</option>
          ))}
          <option value="__otro__">Otro…</option>
        </select>
        {libre && (
          <input className="gp-pay-f concepto-libre" placeholder="Concepto" value={concepto}
                 autoComplete="off" onChange={e => setConcepto(e.target.value)} />
        )}
      </div>

      <div className="gp-pay-num">
        <label className="gp-pay-importe-field">
          <input className="gp-pay-f importe" type="number" inputMode="decimal" min="0" step="1"
                 placeholder="0" value={importe} onChange={e => setImporte(e.target.value)} />
          <span className="gp-pay-eur">€</span>
        </label>
        <select className="gp-pay-f metodo" value={metodo} onChange={e => setMetodo(e.target.value)}>
          <option value="">Método…</option>
          {METODOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      <input className="gp-pay-f tel" type="tel" inputMode="tel" placeholder="Teléfono (opcional)"
             autoComplete="off" value={tel} onChange={e => setTel(e.target.value)} />
      <input className="gp-pay-f nota" placeholder="Nota (opcional)" value={nota}
             autoComplete="off" onChange={e => setNota(e.target.value)} />

      {mode === "add" && (
        <div className="gp-pay-estado" role="group" aria-label="Estado del pago">
          <button type="button" className={"gp-seg" + (estado === "pendiente" ? " on" : "")}
                  onClick={() => setEstado("pendiente")}>Pendiente</button>
          <button type="button" className={"gp-seg" + (estado === "pagado" ? " on" : "")}
                  onClick={() => setEstado("pagado")}>Pagado</button>
        </div>
      )}

      <div className="gp-pay-form-actions">
        <button type="submit" className="gp-pay-save" disabled={busy || !nombre.trim() || !concepto.trim()}>
          {mode === "add" ? "Apuntar pago" : "Guardar"}
        </button>
        {mode === "edit" && (
          <button type="button" className="gp-guest-cancel" disabled={busy} onClick={onCancel}>Cancelar</button>
        )}
      </div>
    </form>
  );
}

// ── Bonos ──────────────────────────────────────────────────────────────────
// Quién tiene bono, cuántas clases lleva gastadas y cuántas le quedan. Cada
// clase consumida queda apuntada con su fecha, así siempre se sabe qué gasta
// cada quien y no hay que fiarse de la memoria.
function PacksView({ pin, toast }) {
  const [list, setList]     = useState(null);
  const [busy, setBusy]     = useState(false);
  const [openId, setOpenId] = useState(null);      // bono con el detalle desplegado
  const [uses, setUses]     = useState({});        // { [packId]: array | "loading" }
  const [editId, setEditId] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_list_packs", { p_pin: pin });
    if (error) { toast("No se pudieron cargar los bonos"); setList([]); return; }
    setList(data ?? []);
  }, [pin, toast]);

  useEffect(() => { load(); }, [load]);

  const loadUses = useCallback(async (packId) => {
    setUses(u => ({ ...u, [packId]: u[packId] ?? "loading" }));
    const { data, error } = await supabase.rpc("admin_list_pack_uses", { p_pack_id: packId, p_pin: pin });
    if (error) { toast("No se pudo cargar el detalle"); setUses(u => ({ ...u, [packId]: [] })); return; }
    setUses(u => ({ ...u, [packId]: data ?? [] }));
  }, [pin, toast]);

  const toggle = (packId) => {
    const next = openId === packId ? null : packId;
    setOpenId(next);
    if (next && uses[packId] === undefined) loadUses(packId);
  };

  const add = async (p) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_add_pack", {
      p_nombre: p.nombre, p_telefono: p.telefono || null, p_email: p.email || null,
      p_concepto: p.concepto, p_total: p.total, p_caduca: p.caduca || null,
      p_nota: p.nota || null, p_pin: pin,
    });
    setBusy(false);
    if (error) { toast("No se pudo dar de alta el bono"); return false; }
    await load();
    return true;
  };

  const update = async (id, p) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_update_pack", {
      p_id: id, p_nombre: p.nombre, p_telefono: p.telefono || null, p_email: p.email || null,
      p_concepto: p.concepto, p_total: p.total, p_caduca: p.caduca || null,
      p_nota: p.nota || null, p_pin: pin,
    });
    setBusy(false);
    if (error) {
      toast(/TOTAL_MENOR/.test(error.message)
        ? "Ya ha gastado más clases de las que pones"
        : "No se pudo guardar");
      return false;
    }
    setEditId(null);
    await load();
    return true;
  };

  const remove = async (id) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_remove_pack", { p_id: id, p_pin: pin });
    setBusy(false);
    if (error) { toast("No se pudo borrar el bono"); return; }
    setUses(u => { const { [id]: _, ...rest } = u; return rest; });
    await load();
  };

  // Gastar una clase del bono (hoy por defecto, o la fecha que le pongas)
  const gastar = async (packId, fecha, nota) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_use_pack", {
      p_pack_id: packId, p_usado_en: fecha || null, p_nota: nota || null, p_pin: pin,
    });
    setBusy(false);
    if (error) {
      toast(/BONO_AGOTADO/.test(error.message) ? "Ese bono ya no tiene clases" : "No se pudo apuntar la clase");
      return false;
    }
    await load();
    if (uses[packId] !== undefined) await loadUses(packId);
    return true;
  };

  const removeUse = async (packId, useId) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_remove_pack_use", { p_use_id: useId, p_pin: pin });
    setBusy(false);
    if (error) { toast("No se pudo quitar"); return; }
    await Promise.all([load(), loadUses(packId)]);
  };

  if (list === null) return <div className="gp-loading">Cargando…</div>;

  const conClases = list.filter(p => p.restantes > 0);
  const gastados  = list.filter(p => p.restantes <= 0);

  const grupo = (title, items, empty) => (
    <section className="gp-pay-group">
      <header className="gp-pay-group-head">
        <span className="gp-pay-group-title">{title}</span>
        <span className="gp-pay-group-meta">
          <span className="gp-pay-count">{items.length}</span>
        </span>
      </header>
      {items.length === 0 ? <p className="gp-empty">{empty}</p> : (
        <ul className="gp-bono-list">
          {items.map(p => (
            <PackRow key={p.id} pack={p} busy={busy}
              editing={editId === p.id}
              open={openId === p.id}
              uses={uses[p.id]}
              onEdit={() => setEditId(p.id)}
              onCancelEdit={() => setEditId(null)}
              onSave={(payload) => update(p.id, payload)}
              onToggle={() => toggle(p.id)}
              onUse={(fecha, nota) => gastar(p.id, fecha, nota)}
              onRemoveUse={(useId) => removeUse(p.id, useId)}
              onRemove={() => remove(p.id)} />
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="gp-bonos">
      <p className="gp-hint">Cada vez que alguien viene con bono, réstale la clase · queda apuntada con su fecha</p>

      <details className="gp-pay-add">
        <summary className="gp-pay-add-toggle">+ Dar de alta un bono</summary>
        <PackForm mode="add" busy={busy} onSubmit={add} />
      </details>

      {grupo("Con clases por gastar", conClases, "Nadie tiene bono activo ahora mismo")}
      {grupo("Terminados", gastados, "Todavía no se ha terminado ningún bono")}
    </div>
  );
}

function PackRow({ pack, busy, editing, open, uses, onEdit, onCancelEdit, onSave,
                  onToggle, onUse, onRemoveUse, onRemove }) {
  if (editing) {
    return (
      <li className="gp-bono editing">
        <PackForm mode="edit" busy={busy} initial={pack} onSubmit={onSave} onCancel={onCancelEdit} />
      </li>
    );
  }

  const sinClases = pack.restantes <= 0;
  const caducado  = !!pack.caduca && pack.caduca < hoyISO();
  const pct = pack.total ? Math.min(100, Math.round((pack.usadas / pack.total) * 100)) : 0;

  return (
    <li className={"gp-bono" + (sinClases ? " off" : "")}>
      <div className="gp-pay-main">
        <span className="gp-pay-nombre">{pack.nombre}</span>
        <span className="gp-bono-rest">
          {sinClases ? "sin clases" : <><b>{pack.restantes}</b> por gastar</>}
        </span>
      </div>

      <div className="gp-pay-sub">
        <span className="gp-bono-concepto">{pack.concepto}</span>
        <span className="gp-bono-n">{pack.usadas} de {pack.total}</span>
        {pack.telefono && <a className="gp-pay-tel" href={`tel:${pack.telefono}`}>{pack.telefono}</a>}
        {pack.caduca && (
          <span className={"gp-bono-caduca" + (caducado ? " off" : "")}>
            {caducado ? "caducó el " : "hasta el "}{diaCorto(pack.caduca)}
          </span>
        )}
      </div>

      <div className="gp-bono-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
      {pack.nota && <p className="gp-pay-nota">{pack.nota}</p>}

      <div className="gp-pay-actions">
        <button type="button" className="gp-pay-mark" disabled={busy || sinClases}
                onClick={() => onUse(null, null)}>− Gastar clase hoy</button>
        <button type="button" className="gp-bono-det" aria-expanded={open} onClick={onToggle}>
          {open ? "Ocultar clases" : `Ver clases (${pack.usadas})`}
        </button>
        <button type="button" className="gp-guest-edit-b" aria-label={`Editar el bono de ${pack.nombre}`}
                disabled={busy} onClick={onEdit}>✎</button>
        <button type="button" className="gp-guest-x" aria-label={`Borrar el bono de ${pack.nombre}`}
                disabled={busy} onClick={onRemove}>✕</button>
      </div>

      {open && (
        <PackUses list={uses} busy={busy} sinClases={sinClases}
                  onAdd={onUse} onRemove={onRemoveUse} />
      )}
    </li>
  );
}

// Las clases ya gastadas de un bono: cuándo fue cada una y, si la apuntaste,
// cuál. Desde aquí se añade una de otro día o se deshace un apunte.
function PackUses({ list, busy, sinClases, onAdd, onRemove }) {
  const [fecha, setFecha] = useState(hoyISO());
  const [nota, setNota]   = useState("");

  const submit = async (e) => {
    e.preventDefault();
    const ok = await onAdd(fecha || null, nota.trim());
    if (ok) { setFecha(hoyISO()); setNota(""); }
  };

  return (
    <div className="gp-uses">
      {list === "loading" || list === undefined ? (
        <div className="gp-panel-load">Cargando…</div>
      ) : list.length === 0 ? (
        <p className="gp-empty">Aún no ha gastado ninguna clase</p>
      ) : (
        <ul className="gp-uses-list">
          {list.map(u => (
            <li key={u.id} className="gp-use">
              <span className="gp-use-fecha">{diaCorto(u.usado_en)}</span>
              <span className="gp-use-nota">{u.nota || "clase"}</span>
              <button type="button" className="gp-guest-x" disabled={busy}
                      aria-label={`Quitar la clase del ${diaCorto(u.usado_en)}`}
                      onClick={() => onRemove(u.id)}>✕</button>
            </li>
          ))}
        </ul>
      )}

      <form className="gp-use-add" onSubmit={submit}>
        <input className="gp-use-f fecha" type="date" value={fecha}
               onChange={e => setFecha(e.target.value)} aria-label="Día de la clase" />
        <input className="gp-use-f" placeholder="Qué clase (opcional)" value={nota}
               autoComplete="off" onChange={e => setNota(e.target.value)} />
        <button className="gp-add-b" disabled={busy || sinClases}>Apuntar</button>
      </form>
    </div>
  );
}

function PackForm({ mode, initial, busy, onSubmit, onCancel }) {
  const [nombre, setNombre]     = useState(initial?.nombre ?? "");
  const [tel, setTel]           = useState(initial?.telefono ?? "");
  const [email, setEmail]       = useState(initial?.email ?? "");
  const [concepto, setConcepto] = useState(initial?.concepto ?? "");
  const [total, setTotal]       = useState(initial?.total != null ? String(initial.total) : "");
  const [caduca, setCaduca]     = useState(initial?.caduca ?? "");
  const [nota, setNota]         = useState(initial?.nota ?? "");
  const [libre, setLibre]       = useState(() =>
    !!(initial?.concepto && !BONO_TIPOS.some(t => t.concepto === initial.concepto)));

  // Elegir un bono del catálogo rellena el nº de clases; "Otro…" abre texto libre
  const onTipo = (e) => {
    const v = e.target.value;
    if (v === "__otro__") { setLibre(true); setConcepto(""); setTotal(""); return; }
    setLibre(false);
    setConcepto(v);
    const tipo = BONO_TIPOS.find(t => t.concepto === v);
    if (tipo?.clases) setTotal(String(tipo.clases));
  };

  const n = Number(total);
  const ready = nombre.trim() && concepto.trim() && Number.isInteger(n) && n >= 1;

  const submit = async (e) => {
    e.preventDefault();
    if (!ready) return;
    const ok = await onSubmit({
      nombre: nombre.trim(), telefono: tel.trim(), email: email.trim(),
      concepto: concepto.trim(), total: n, caduca, nota: nota.trim(),
    });
    if (ok && mode === "add") {
      setNombre(""); setTel(""); setEmail(""); setConcepto("");
      setTotal(""); setCaduca(""); setNota(""); setLibre(false);
    }
  };

  return (
    <form className="gp-pay-form" onSubmit={submit}>
      <input className="gp-pay-f nombre" placeholder="Nombre y apellidos" value={nombre}
             autoComplete="off" onChange={e => setNombre(e.target.value)} />

      <div className="gp-pay-prod">
        <select className="gp-pay-f concepto" value={libre ? "__otro__" : concepto} onChange={onTipo}>
          <option value="" disabled>Qué bono…</option>
          {BONO_TIPOS.map(t => (
            <option key={t.concepto} value={t.concepto}>{t.concepto}</option>
          ))}
          <option value="__otro__">Otro…</option>
        </select>
        {libre && (
          <input className="gp-pay-f concepto-libre" placeholder="Concepto" value={concepto}
                 autoComplete="off" onChange={e => setConcepto(e.target.value)} />
        )}
      </div>

      <div className="gp-pay-num">
        <label className="gp-pay-importe-field">
          <input className="gp-pay-f importe" type="number" inputMode="numeric" min="1" max="100" step="1"
                 placeholder="0" value={total} onChange={e => setTotal(e.target.value)} />
          <span className="gp-pay-eur">clases</span>
        </label>
        <label className="gp-bono-caduca-field">
          <span className="gp-bono-caduca-k">Caduca</span>
          <input className="gp-pay-f" type="date" value={caduca}
                 onChange={e => setCaduca(e.target.value)} aria-label="Fecha de caducidad" />
        </label>
      </div>

      <input className="gp-pay-f tel" type="tel" inputMode="tel" placeholder="Teléfono (opcional)"
             autoComplete="off" value={tel} onChange={e => setTel(e.target.value)} />
      <input className="gp-pay-f mail" type="email" inputMode="email" placeholder="Email (opcional)"
             autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} />
      <input className="gp-pay-f nota" placeholder="Nota (opcional)" value={nota}
             autoComplete="off" onChange={e => setNota(e.target.value)} />

      <div className="gp-pay-form-actions">
        <button type="submit" className="gp-pay-save" disabled={busy || !ready}>
          {mode === "add" ? "Dar de alta" : "Guardar"}
        </button>
        {mode === "edit" && (
          <button type="button" className="gp-guest-cancel" disabled={busy} onClick={onCancel}>Cancelar</button>
        )}
      </div>
    </form>
  );
}

// ── Recuperaciones ─────────────────────────────────────────────────────────
// Quién se quedó sin su clase (casi siempre por un cambio de horario) y le debes
// una. Se marca como recuperada el día que la hace.
function MakeupsView({ pin, toast }) {
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_list_makeups", { p_pin: pin });
    if (error) { toast("No se pudieron cargar las recuperaciones"); setList([]); return; }
    setList(data ?? []);
  }, [pin, toast]);

  useEffect(() => { load(); }, [load]);

  const add = async (m) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_add_makeup", {
      p_nombre: m.nombre, p_telefono: m.telefono || null, p_perdida_en: m.perdida_en || null,
      p_motivo: m.motivo, p_nota: m.nota || null, p_pin: pin,
    });
    setBusy(false);
    if (error) { toast("No se pudo apuntar la recuperación"); return false; }
    await load();
    return true;
  };

  const setEstado = async (id, estado) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_set_makeup_estado", {
      p_id: id, p_estado: estado, p_recuperada_en: estado === "recuperada" ? hoyISO() : null, p_pin: pin,
    });
    setBusy(false);
    if (error) { toast("No se pudo actualizar"); return; }
    await load();
  };

  const remove = async (id) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_remove_makeup", { p_id: id, p_pin: pin });
    setBusy(false);
    if (error) { toast("No se pudo borrar"); return; }
    await load();
  };

  if (list === null) return <div className="gp-loading">Cargando…</div>;

  const pendientes  = list.filter(m => m.estado === "pendiente");
  const recuperadas = list.filter(m => m.estado === "recuperada");

  const grupo = (title, tone, items, empty) => (
    <section className={"gp-pay-group " + tone}>
      <header className="gp-pay-group-head">
        <span className="gp-pay-group-title">{title}</span>
        <span className="gp-pay-group-meta"><span className="gp-pay-count">{items.length}</span></span>
      </header>
      {items.length === 0 ? <p className="gp-empty">{empty}</p> : (
        <ul className="gp-pay-list">
          {items.map(m => (
            <MakeupRow key={m.id} makeup={m} busy={busy}
              onEstado={(estado) => setEstado(m.id, estado)}
              onRemove={() => remove(m.id)} />
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="gp-recuperar">
      <p className="gp-hint">Apunta aquí a quien se queda sin su clase · le debes una</p>

      <details className="gp-pay-add">
        <summary className="gp-pay-add-toggle">+ Apuntar una recuperación</summary>
        <MakeupForm busy={busy} onSubmit={add} />
      </details>

      {grupo("Pendientes de recuperar", "pend", pendientes, "Nadie tiene clases pendientes")}
      {grupo("Ya recuperadas", "paid", recuperadas, "Aún no se ha recuperado ninguna")}
    </div>
  );
}

function MakeupRow({ makeup: m, busy, onEstado, onRemove }) {
  const pendiente = m.estado === "pendiente";
  return (
    <li className="gp-pay-item">
      <div className="gp-pay-main">
        <span className="gp-pay-nombre">{m.nombre}</span>
        <span className={"gp-rec-tag" + (pendiente ? "" : " ok")}>
          {pendiente ? "Debe una clase" : `Recuperada el ${diaCorto(m.recuperada_en)}`}
        </span>
      </div>
      <div className="gp-pay-sub">
        {m.perdida_en && <span className="gp-rec-perdida">perdió la del {diaCorto(m.perdida_en)}</span>}
        <span className="gp-pay-metodo">{m.motivo}</span>
        {m.telefono && <a className="gp-pay-tel" href={`tel:${m.telefono}`}>{m.telefono}</a>}
      </div>
      {m.nota && <p className="gp-pay-nota">{m.nota}</p>}
      <div className="gp-pay-actions">
        <button type="button" className={"gp-pay-mark" + (pendiente ? "" : " undo")} disabled={busy}
                onClick={() => onEstado(pendiente ? "recuperada" : "pendiente")}>
          {pendiente ? "✓ Ya la recuperó" : "↺ Volver a pendiente"}
        </button>
        <button type="button" className="gp-guest-x" aria-label={`Borrar la recuperación de ${m.nombre}`}
                disabled={busy} onClick={onRemove}>✕</button>
      </div>
    </li>
  );
}

function MakeupForm({ busy, onSubmit }) {
  const [nombre, setNombre] = useState("");
  const [tel, setTel]       = useState("");
  const [perdida, setPerdida] = useState(hoyISO());
  const [motivo, setMotivo] = useState(MOTIVOS_RECUPERACION[0]);
  const [nota, setNota]     = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    const ok = await onSubmit({
      nombre: nombre.trim(), telefono: tel.trim(), perdida_en: perdida,
      motivo, nota: nota.trim(),
    });
    if (ok) {
      setNombre(""); setTel(""); setPerdida(hoyISO());
      setMotivo(MOTIVOS_RECUPERACION[0]); setNota("");
    }
  };

  return (
    <form className="gp-pay-form" onSubmit={submit}>
      <input className="gp-pay-f nombre" placeholder="Nombre y apellidos" value={nombre}
             autoComplete="off" onChange={e => setNombre(e.target.value)} />

      <div className="gp-pay-num">
        <label className="gp-bono-caduca-field">
          <span className="gp-bono-caduca-k">Clase perdida</span>
          <input className="gp-pay-f" type="date" value={perdida}
                 onChange={e => setPerdida(e.target.value)} aria-label="Día de la clase perdida" />
        </label>
        <select className="gp-pay-f metodo" value={motivo} onChange={e => setMotivo(e.target.value)}>
          {MOTIVOS_RECUPERACION.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <input className="gp-pay-f tel" type="tel" inputMode="tel" placeholder="Teléfono (opcional)"
             autoComplete="off" value={tel} onChange={e => setTel(e.target.value)} />
      <input className="gp-pay-f nota" placeholder="Nota (opcional)" value={nota}
             autoComplete="off" onChange={e => setNota(e.target.value)} />

      <div className="gp-pay-form-actions">
        <button type="submit" className="gp-pay-save" disabled={busy || !nombre.trim()}>Apuntar</button>
      </div>
    </form>
  );
}

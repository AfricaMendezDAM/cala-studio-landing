import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../lib/supabase.js";
import { PRODUCTOS } from "../data.js";

const HORA   = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Madrid" });
const FECHA  = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" });
const DAYKEY = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Europe/Madrid" });
const EUR    = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

const METODOS = [
  { value: "efectivo",      label: "Efectivo" },
  { value: "bizum",         label: "Bizum" },
  { value: "transferencia", label: "Transferencia" },
];

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

  const addWait = async (sessionId, nombre, telefono) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_add_waitlist", {
      p_session_id: sessionId, p_nombre: nombre, p_telefono: telefono || null, p_pin: pin,
    });
    setBusy(false);
    if (error) { toast("No se pudo apuntar a la lista de espera"); return false; }
    await Promise.all([loadWaits(sessionId), load()]);
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
            <button type="button" role="tab" aria-selected={tab === "reservas"}
                    className={"gp-tab" + (tab === "reservas" ? " on" : "")}
                    onClick={() => setTab("reservas")}>Reservas</button>
            <button type="button" role="tab" aria-selected={tab === "pagos"}
                    className={"gp-tab" + (tab === "pagos" ? " on" : "")}
                    onClick={() => setTab("pagos")}>Pagos</button>
          </div>

          {tab === "pagos" ? (
            <PaymentsView pin={pin} toast={toast} />
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
                            {s.waitlist_count > 0 && (
                              <span className="gp-wl-badge">{s.waitlist_count} en espera</span>
                            )}
                            <span className={"gp-count" + (full ? " full" : "")}>
                              {full ? "Completo" : `${s.reservadas}/${s.capacity}`}
                            </span>
                            <span className="gp-caret" aria-hidden="true">▾</span>
                          </span>
                        </button>
                        {open && (
                          <GuestPanel
                            list={guests[s.session_id]}
                            waitlist={waits[s.session_id]}
                            full={full}
                            busy={busy}
                            onAdd={(n, t) => addGuest(s.session_id, n, t)}
                            onUpdate={(gid, n, t) => updateGuest(s.session_id, gid, n, t)}
                            onRemove={(gid) => removeGuest(s.session_id, gid)}
                            onWaitAdd={(n, t) => addWait(s.session_id, n, t)}
                            onWaitRemove={(wid) => removeWait(s.session_id, wid)}
                            onPromote={(w) => promoteWait(s.session_id, w)}
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

function GuestPanel({ list, waitlist, full, busy, onAdd, onUpdate, onRemove, onWaitAdd, onWaitRemove, onPromote }) {
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

      <WaitlistPanel list={waitlist} full={full} busy={busy}
                     onAdd={onWaitAdd} onRemove={onWaitRemove} onPromote={onPromote} />
    </div>
  );
}

// Lista de espera de una clase: quién se ha apuntado (por la web o a mano),
// alta manual, quitar, y "pasar a la clase" cuando se libera una plaza.
function WaitlistPanel({ list, full, busy, onAdd, onRemove, onPromote }) {
  const [nombre, setNombre] = useState("");
  const [tel, setTel]       = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    const ok = await onAdd(nombre.trim(), tel.trim());
    if (ok) { setNombre(""); setTel(""); }
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
              <span className="gp-wl-name">{w.nombre}</span>
              {w.telefono
                ? <a className="gp-wl-tel" href={`tel:${w.telefono}`}>{w.telefono}</a>
                : <span className="gp-wl-tel none">sin teléfono</span>}
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
        <input className="gp-add-tel" type="tel" inputMode="tel" placeholder="Teléfono (opcional)"
               autoComplete="off" value={tel} onChange={e => setTel(e.target.value)} />
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

import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createDemo, costaRicaDate, startAt } from './demo.js';
import './style.css';

const hours = Array.from({ length: 14 }, (_, i) => i + 7);
const formatHour = (hour) => `${String(hour).padStart(2, '0')}:00`;
const short = (value) => value.length > 25 ? `${value.slice(0, 8)}…${value.slice(-5)}` : value;

function App() {
  const demo = useMemo(createDemo, []);
  const [mode, setMode] = useState('demo');
  const [actor, setActor] = useState(demo.admin);
  const [wallet, setWallet] = useState('');
  const [id, setId] = useState(import.meta.env.VITE_CONTRACT_ID ?? 'CCP5V3MMD75BC3YDWAHJMAVMSO27BIRXY4VGTDQ75Y2TOQ5N4HVSIQZ5');
  const [connection, setConnection] = useState(null);
  const [date, setDate] = useState(costaRicaDate);
  const [hour, setHour] = useState(() => hours.find((h) => startAt(costaRicaDate(), h) > Date.now() / 1000) ?? hours[0]);
  const [slots, setSlots] = useState({});
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState(null);
  const backend = mode === 'demo' ? demo : connection?.backend;
  const account = mode === 'demo' ? actor : wallet;
  const admin = mode === 'demo' ? demo.admin : connection?.admin;
  const slot = slots[hour];
  const past = startAt(date, hour) <= Date.now() / 1000;

  useEffect(() => {
    let active = true;
    if (backend && date) {
      Promise.all(hours.map(async (h) => {
        try { return [h, await backend.getSlot(startAt(date, h))]; }
        catch { return [h, { error: true }]; }
      })).then((entries) => {
        if (active) setSlots(Object.fromEntries(entries));
      });
    }
    return () => { active = false; };
  }, [backend, date, revision]);

  function refresh() {
    setSlots({});
    setRevision((value) => value + 1);
  }

  async function task(work) {
    setBusy(true);
    setNotice(null);
    try { await work(); }
    catch (error) { setNotice({ text: error.message, error: true }); }
    finally { setBusy(false); }
  }

  function changeMode(next) {
    setMode(next);
    setNotice(null);
    refresh();
  }

  function submit(event) {
    event.preventDefault();
    task(async () => {
      const { connectContract } = await import('./stellar.js');
      const backend = connectContract(id.trim());
      const admin = await backend.getAdmin();
      setConnection({ backend, admin, id: id.trim() });
      refresh();
    });
  }

  function apply(action, success) {
    task(async () => {
      try {
        const hash = await backend.act(action, account, startAt(date, hour));
        setNotice({ text: success, hash });
      } finally {
        refresh();
      }
    });
  }

  function status(h) {
    if (startAt(date, h) <= Date.now() / 1000) return ['Pasado', 'past'];
    const item = slots[h];
    if (item?.error) return ['Error de consulta', 'closed'];
    if (!item) return [backend ? 'Consultando…' : 'Sin conectar', 'closed'];
    if (item.owner) return [item.owner === account ? 'Tu reserva' : 'Reservado', 'booked'];
    return item.enabled ? ['Disponible', 'open'] : ['Sin habilitar', 'closed'];
  }

  return <>
    <header><div className="bar"><span className="brand-mark" aria-hidden="true">▦</span><strong>Cancha comunal</strong>
      <nav aria-label="Modo de uso">
        <button disabled={busy} aria-pressed={mode === 'demo'} onClick={() => changeMode('demo')}>Demo local</button>
        <button disabled={busy} aria-pressed={mode === 'testnet'} onClick={() => changeMode('testnet')}>Stellar Testnet</button>
      </nav>
    </div></header>
    <main>
      <section className="hero">
        <div><h1>Reservá la cancha<br />de tu comunidad.</h1><p>Consultá los turnos que habilitó la asociación y elegí una hora disponible para tu equipo.</p></div>
        <div className="pitch" aria-hidden="true"><i></i><b></b><em></em></div>
      </section>
      <section className="settings" aria-label="Conexión">
        {mode === 'demo' ? <>
          <div><strong>Modo demostración</strong><p>Reservas simuladas. Se reinician al recargar.</p></div>
          <label>Actuar como<select disabled={busy} value={actor} onChange={(e) => { setActor(e.target.value); setNotice(null); }}>
            {demo.actors.map((person) => <option key={person}>{person}</option>)}
          </select></label>
        </> : <>
          <form onSubmit={submit}><label>ID del contrato<input value={id} onChange={(e) => setId(e.target.value)} placeholder="C…" /></label>
          <button className="secondary" disabled={busy || !id.trim()}>Cargar contrato</button></form>
          <div><button className="secondary" disabled={busy} onClick={() => task(async () => {
            const { connectWallet } = await import('./stellar.js');
            setWallet(await connectWallet());
          })}>
            {wallet ? 'Actualizar cuenta Varial' : 'Conectar Varial'}</button>
          {wallet && <p title={wallet}>{short(wallet)}{wallet === admin ? ' · Asociación' : ''}</p>}
          {connection && <p title={connection.id}>Contrato activo · {short(connection.id)}</p>}</div>
        </>}
      </section>
      <div className="schedule">
        <section className="panel">
          <div className="heading"><div><h2>Turnos de la cancha</h2><p>Hora de Costa Rica · 60 minutos por turno</p></div>
            <label>Fecha<input type="date" required min={costaRicaDate()} value={date} disabled={busy} onChange={(e) => {
              if (e.target.value) { setDate(e.target.value); setNotice(null); refresh(); }
            }} /></label></div>
          <div className="slots">{hours.map((h) => {
            const [label, color] = status(h);
            return <button key={h} disabled={busy} className="slot" aria-pressed={hour === h} onClick={() => { setHour(h); setNotice(null); }}>
              <strong>{formatHour(h)}</strong><span className={color}>{label}</span></button>;
          })}</div>
        </section>
        <aside className="panel detail">
          <h2>{formatHour(hour)}–{formatHour(hour + 1)}</h2>
          <p>{status(hour)[0]}</p>
          {slot?.owner && <p title={slot.owner}>Reservó {short(slot.owner)}</p>}
          {!past && slot && !slot.error && account && <div className="actions">
            {!slot.enabled && account === admin && <button className="primary" disabled={busy} onClick={() => apply('open_slot', 'Turno habilitado.')}>Habilitar turno</button>}
            {slot.enabled && !slot.owner && <button className="primary" disabled={busy} onClick={() => apply('reserve', 'Reserva confirmada.')}>Reservar turno</button>}
            {slot.enabled && slot.owner === account && <button className="secondary" disabled={busy} onClick={() => apply('cancel', 'Reserva cancelada. El turno queda disponible.')}>Cancelar reserva</button>}
          </div>}
          <button className="refresh" disabled={busy || !backend} onClick={refresh}>Actualizar horarios</button>
        </aside>
      </div>
      <div className="feedback" role="status">
        {busy ? 'Procesando…' : notice && <span className={notice.error ? 'failure' : 'open'}>{notice.text}
          {notice.hash && <> <a href={`https://stellar.expert/explorer/testnet/tx/${notice.hash}`} target="_blank" rel="noreferrer">Ver transacción</a></>}
        </span>}
      </div>
    </main>
  </>;
}

createRoot(document.getElementById('root')).render(<App />);

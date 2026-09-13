import { useState } from 'react';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { Modal, Field, Empty, Spinner, Badge } from '../components/UI';
import { Icon } from '../components/Icons';
import { addDays, dateShort, monthLabel, monthMatrix, startOfWeek, today, fullName } from '../lib/format';
import { waLink, msgConfirmarTurno, msgTurnoCancelado } from '../lib/whatsapp';
import { TURNO_ESTADOS } from '../lib/types';
import type { Cliente, ConfigMap, Turno, Vehiculo } from '../lib/types';

type Mode = 'dia' | 'semana' | 'mes';
const DIAS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

export function Turnos() {
  const [mode, setMode] = useState<Mode>('mes');
  const [anchor, setAnchor] = useState(today());
  const [view, setView] = useState<Turno | null>(null);
  const [showForm, setShowForm] = useState(false);

  const range = (() => {
    if (mode === 'dia') return { desde: anchor, hasta: anchor };
    if (mode === 'semana') {
      const s = startOfWeek(anchor);
      return { desde: s, hasta: addDays(s, 6) };
    }
    return { desde: anchor.slice(0, 7) + '-01', hasta: addYears(anchor) };
  })();

  const { data, loading, reload } = useAsync<{ turnos: Turno[] }>(
    () => api.get(`/turnos?desde=${range.desde}&hasta=${range.hasta}`),
    [range.desde, range.hasta]
  );
  const turnos = data?.turnos || [];

  const byDate = (d: string) => turnos.filter((t) => t.fecha === d).sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));

  const move = (dir: number) => {
    if (mode === 'mes') {
      const [y, m] = anchor.split('-').map(Number);
      const d = new Date(y, m - 1 + dir, 1);
      setAnchor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
    } else {
      setAnchor(addDays(anchor, dir * (mode === 'semana' ? 7 : 1)));
    }
  };

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title">Turnos</h2>
        <div className="left">
          <button className="btn btn-ghost btn-sm" onClick={() => setAnchor(today())}>Hoy</button>
          <button className="icon-btn" onClick={() => move(-1)}><Icon name="chevronL" /></button>
          <span className="period" style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 800, textTransform: 'uppercase', fontSize: '1.1rem', fontStyle: 'italic' }}>
            {mode === 'dia' ? dateShort(anchor) : mode === 'semana' ? `Semana del ${dateShort(range.desde)}` : monthLabel(anchor)}
          </span>
          <button className="icon-btn" onClick={() => move(1)}><Icon name="chevronR" /></button>
          <div className="seg">
            <button className={mode === 'dia' ? 'active' : ''} onClick={() => setMode('dia')}>Día</button>
            <button className={mode === 'semana' ? 'active' : ''} onClick={() => setMode('semana')}>Semana</button>
            <button className={mode === 'mes' ? 'active' : ''} onClick={() => setMode('mes')}>Mes</button>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Icon name="plus" /> Nuevo turno
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : mode === 'dia' ? (
        <div className="card">
          {byDate(anchor).length ? byDate(anchor).map((t) => <TurnoCard key={t.id} t={t} onClick={() => setView(t)} />) : <Empty icon="calendar" text="Sin turnos este día." />}
        </div>
      ) : mode === 'semana' ? (
        <div>
          <div className="cal-week" style={{ marginBottom: 8 }}>
            {DIAS.map((d) => <div className="wday" key={d}>{d}</div>)}
          </div>
          <div className="cal-week" style={{ alignItems: 'start' }}>
            {Array.from({ length: 7 }, (_, i) => {
              const d = addDays(range.desde!, i);
              const ts = byDate(d);
              return (
                <div className="cal-cell" key={d} style={{ minHeight: 150, display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer' }} onClick={() => { setAnchor(d); setMode('dia'); }}>
                  <div className="day-num">{new Date(d + 'T12:00:00').getDate()}</div>
                  {ts.slice(0, 4).map((t) => (
                    <div className="day-turno" key={t.id}>{t.hora} {fullName(t)}</div>
                  ))}
                  {ts.length > 4 && <div style={{ fontSize: '0.7rem', color: 'var(--naranja-dark)', fontWeight: 700 }}>+{ts.length - 4} más</div>}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          <div className="cal-week" style={{ marginBottom: 8 }}>
            {DIAS.map((d) => <div className="wday" key={d}>{d}</div>)}
          </div>
          {monthMatrix(anchor).map((week, wi) => (
            <div className="cal-grid" key={wi} style={{ marginBottom: 6 }}>
              {week.map((d) => {
                if (!d) return <div key={`e${wi}`} />;
                const ts = byDate(d);
                const isToday = d === today();
                const curMonth = d.slice(0, 7) === anchor.slice(0, 7);
                return (
                  <div key={d} className={`cal-cell ${isToday ? 'today' : ''} ${curMonth ? '' : 'other'}`} onClick={() => { setAnchor(d); setMode('dia'); }}>
                    <div className="day-num">{new Date(d + 'T12:00:00').getDate()}</div>
                    <div className="day-turnos">
                      {ts.slice(0, 2).map((t) => (
                        <div className="day-turno" key={t.id}>{t.hora} {fullName(t)}</div>
                      ))}
                      {ts.length > 2 && <div style={{ fontSize: '0.68rem', color: 'var(--naranja-dark)', fontWeight: 700 }}>+{ts.length - 2} más</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {view && <TurnoView turno={view} onClose={() => setView(null)} onChanged={reload} />}
      {showForm && <TurnoForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); reload(); }} />}
    </>
  );
}

function TurnoCard({ t, onClick }: { t: Turno; onClick: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 4px', borderBottom: '1px solid #eee', cursor: 'pointer' }} onClick={onClick}>
      <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 800, color: 'var(--naranja-dark)', minWidth: 64, fontStyle: 'italic', fontSize: '1.05rem' }}>
        {t.hora || '—'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700 }}>{fullName(t)}</div>
        <div style={{ color: 'var(--gris)', fontSize: '0.83rem' }}>
          {[t.marca, t.modelo].filter(Boolean).join(' ')} {t.patente ? `· ${t.patente}` : ''}
          {t.motivo ? ` — ${t.motivo}` : ''}
        </div>
      </div>
      <Badge estado={t.estado} />
    </div>
  );
}

function TurnoView({ turno, onClose, onChanged }: { turno: Turno; onClose: () => void; onChanged: () => void }) {
  const [f, setF] = useState<Turno>({ ...turno });
  const { data: cfgData } = useAsync<{ config: ConfigMap }>(() => api.get('/config'), []);
  const cfg = cfgData?.config || {};
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    await api.put(`/turnos/${f.id}`, f);
    setBusy(false);
    onChanged();
    onClose();
  };

  const whatsapp = String(f.whatsapp || '');
  const linkConfirm = waLink(whatsapp, msgConfirmarTurno(f, cfg));
  const linkCancel = waLink(whatsapp, msgTurnoCancelado(f, cfg));

  return (
    <Modal title="Turno" onClose={onClose} wide>
      <div className="form-grid">
        <Field label="Fecha">
          <input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} />
        </Field>
        <Field label="Hora">
          <input type="time" value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} />
        </Field>
        <Field label="Motivo">
          <input value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} placeholder="Cambio de aceite" />
        </Field>
        <Field label="Estado">
          <select value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value })}>
            {TURNO_ESTADOS.map((e) => <option key={e}>{e}</option>)}
          </select>
        </Field>
        <Field label="Observaciones" className="full">
          <textarea value={f.observaciones} onChange={(e) => setF({ ...f, observaciones: e.target.value })} />
        </Field>
      </div>

      <div className="quick-actions" style={{ marginTop: 16 }}>
        <a className="quick-action" href={linkConfirm} target="_blank" rel="noreferrer" style={{ background: '#25d366' }} onClick={() => {}}>
          <Icon name="whatsapp" /> Confirmar turno
        </a>
        <a className="quick-action" href={linkCancel} target="_blank" rel="noreferrer" style={{ background: '#a93226' }} onClick={() => {}}>
          <Icon name="whatsapp" /> Avisar reprogramación
        </a>
      </div>

      <div className="form-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>Guardar</button>
      </div>
    </Modal>
  );
}

function TurnoForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<any>({ fecha: today(), hora: '', cliente_id: '', vehiculo_id: '', motivo: '', observaciones: '', estado: 'Pendiente' });
  const [err, setErr] = useState('');
  const { data: clientesData } = useAsync<{ clientes: Cliente[] }>(() => api.get('/clientes?limit=500'), []);
  const { data: vehsData } = useAsync<{ vehiculos: Vehiculo[] }>(
    () => (f.cliente_id ? api.get(`/vehiculos?cliente_id=${f.cliente_id}`) : Promise.resolve({ vehiculos: [] })),
    [f.cliente_id]
  );
  const clientes = clientesData?.clientes || [];
  const vehiculos = vehsData?.vehiculos || [];

  const submit = async () => {
    if (!f.cliente_id) return setErr('Seleccioná el cliente');
    if (!f.fecha) return setErr('Indicá la fecha');
    await api.post('/turnos', f);
    onSaved();
  };

  return (
    <Modal title="Nuevo turno" onClose={onClose}>
      <div className="form-grid">
        <Field label="Cliente" required>
          <select value={f.cliente_id} onChange={(e) => setF({ ...f, cliente_id: e.target.value, vehiculo_id: '' })}>
            <option value="">Seleccionar…</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{fullName(c)}</option>)}
          </select>
        </Field>
        <Field label="Vehículo">
          <select value={f.vehiculo_id} onChange={(e) => setF({ ...f, vehiculo_id: e.target.value })} disabled={!f.cliente_id}>
            <option value="">—</option>
            {vehiculos.map((v) => (
              <option key={v.id} value={v.id}>{[v.marca, v.modelo].filter(Boolean).join(' ')} {v.patente}</option>
            ))}
          </select>
        </Field>
        <Field label="Fecha" required>
          <input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} />
        </Field>
        <Field label="Hora">
          <input type="time" value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} />
        </Field>
        <Field label="Motivo">
          <input value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} placeholder="Cambio de aceite, diagnóstico…" />
        </Field>
        <Field label="Observaciones" className="full">
          <textarea value={f.observaciones} onChange={(e) => setF({ ...f, observaciones: e.target.value })} />
        </Field>
      </div>
      {err && <div className="alert alert-error" style={{ marginTop: 12 }}>{err}</div>}
      <div className="form-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={submit}>Guardar</button>
      </div>
    </Modal>
  );
}

function addYears(iso: string): string {
  const [y] = iso.split('-').map(Number);
  return `${y + 1}-12-31`;
}
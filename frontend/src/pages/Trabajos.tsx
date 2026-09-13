import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { Modal, Field, Badge, Empty, Spinner } from '../components/UI';
import { Icon } from '../components/Icons';
import { dateShort, fullName, money } from '../lib/format';
import { ORDEN_ESTADOS } from '../lib/types';
import type { Cliente, Orden, Turno, Vehiculo } from '../lib/types';

export function Trabajos() {
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const { data, loading, reload } = useAsync<{ ordenes: Orden[] }>(
    () => api.get(`/ordenes?q=${encodeURIComponent(q)}${estado ? `&estado=${encodeURIComponent(estado)}` : ''}`),
    [q, estado]
  );
  const ordenes = data?.ordenes || [];

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title">Órdenes de trabajo</h2>
        <div className="left">
          <div className="search-bar">
            <Icon name="search" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cliente, patente…" />
          </div>
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {ORDEN_ESTADOS.map((e) => <option key={e}>{e}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Icon name="plus" /> Nuevo trabajo
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : !ordenes.length ? (
        <Empty icon="wrench" text="No hay órdenes de trabajo." />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Ingreso</th>
                  <th>Cliente</th>
                  <th>Vehículo</th>
                  <th className="num">Total</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map((o) => (
                  <tr key={o.id} className="row-link" onClick={() => navigate(`/trabajos/${o.id}`)}>
                    <td>{o.numero}</td>
                    <td>{dateShort(o.fecha_ingreso)}</td>
                    <td>{fullName(o)}</td>
                    <td>{[o.marca, o.modelo].filter(Boolean).join(' ')} {o.patente ? `· ${o.patente}` : ''}</td>
                    <td className="num"><strong>{money(o.total)}</strong></td>
                    <td><Badge estado={o.estado} /></td>
                    <td>
                      <div className="td-actions">
                        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); navigate(`/trabajos/${o.id}`); }}><Icon name="edit" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && <TrabajoForm onClose={() => setShowForm(false)} onSaved={(id) => { setShowForm(false); navigate(`/trabajos/${id}`); }} />}
    </>
  );
}

export function TrabajoForm({ onClose, onSaved }: { onClose: () => void; onSaved: (id: number) => void }) {
  const [f, setF] = useState<any>({ cliente_id: '', vehiculo_id: '', fecha_ingreso: '', kilometraje: '', problema_informado: '', observaciones: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: clientesData } = useAsync<{ clientes: Cliente[] }>(() => api.get('/clientes?limit=500'), []);
  const { data: turnosData } = useAsync<{ turnos: Turno[] }>(
    () => api.get('/turnos'),
    [f.cliente_id]
  );
  const { data: vehsData } = useAsync<{ vehiculos: Vehiculo[] }>(
    () => (f.cliente_id ? api.get(`/vehiculos?cliente_id=${f.cliente_id}`) : Promise.resolve({ vehiculos: [] })),
    [f.cliente_id]
  );
  const clientes = clientesData?.clientes || [];
  const turnos = turnosData?.turnos || [];
  const vehiculos = vehsData?.vehiculos || [];

  const submit = async () => {
    if (!f.cliente_id) return setErr('Seleccioná el cliente');
    setBusy(true);
    const res = await api.post<{ orden: Orden }>('/ordenes', f);
    setBusy(false);
    onSaved(res.orden.id);
  };

  return (
    <Modal title="Nueva orden de trabajo" onClose={onClose}>
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
        <Field label="Fecha de ingreso">
          <input type="date" value={f.fecha_ingreso} onChange={(e) => setF({ ...f, fecha_ingreso: e.target.value })} />
        </Field>
        <Field label="Kilometraje">
          <input type="number" value={f.kilometraje} onChange={(e) => setF({ ...f, kilometraje: e.target.value })} placeholder="0" />
        </Field>
        <Field label="Problema informado">
          <input value={f.problema_informado} onChange={(e) => setF({ ...f, problema_informado: e.target.value })} placeholder="Ruido en el motor al arrancar…" />
        </Field>
        <Field label="Observaciones" className="full">
          <textarea value={f.observaciones} onChange={(e) => setF({ ...f, observaciones: e.target.value })} />
        </Field>
        {turnos.length > 0 && (
          <Field label="Desde turno" className="full">
            <select value={f.turno_id || ''} onChange={(e) => setF({ ...f, turno_id: e.target.value })}>
              <option value="">—</option>
              {turnos.filter((t) => t.cliente_id === +f.cliente_id).map((t) => (
                <option key={t.id} value={t.id}>{dateShort(t.fecha)} {t.hora} · {t.motivo || ''}</option>
              ))}
            </select>
          </Field>
        )}
      </div>
      {err && <div className="alert alert-error" style={{ marginTop: 12 }}>{err}</div>}
      <div className="form-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>Crear orden</button>
      </div>
    </Modal>
  );
}
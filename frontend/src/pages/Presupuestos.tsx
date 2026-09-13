import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { Modal, Field, Badge, Empty, Spinner } from '../components/UI';
import { Icon } from '../components/Icons';
import { addDays, dateShort, fullName, money, today } from '../lib/format';
import { PRESUPUESTO_ESTADOS } from '../lib/types';
import type { Cliente, Presupuesto, Vehiculo } from '../lib/types';

export function Presupuestos() {
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const { data, loading } = useAsync<{ presupuestos: Presupuesto[] }>(
    () => api.get(`/presupuestos?q=${encodeURIComponent(q)}${estado ? `&estado=${encodeURIComponent(estado)}` : ''}`),
    [q, estado]
  );
  const pres = data?.presupuestos || [];

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title">Presupuestos</h2>
        <div className="left">
          <div className="search-bar">
            <Icon name="search" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cliente, patente…" />
          </div>
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            {PRESUPUESTO_ESTADOS.map((e) => <option key={e}>{e}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Icon name="plus" /> Nuevo presupuesto
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : !pres.length ? (
        <Empty icon="doc" text="No hay presupuestos." />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Fecha</th>
                  <th>Vence</th>
                  <th>Cliente</th>
                  <th>Vehículo</th>
                  <th className="num">Total</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pres.map((p) => (
                  <tr key={p.id} className="row-link" onClick={() => navigate(`/presupuestos/${p.id}`)}>
                    <td>{p.numero}</td>
                    <td>{dateShort(p.fecha)}</td>
                    <td>{p.vencimiento ? dateShort(p.vencimiento) : '—'}</td>
                    <td>{fullName(p)}</td>
                    <td>{[p.marca, p.modelo].filter(Boolean).join(' ')} {p.patente ? `· ${p.patente}` : ''}</td>
                    <td className="num"><strong>{money(p.total)}</strong></td>
                    <td><Badge estado={p.estado} /></td>
                    <td>
                      <div className="td-actions">
                        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); navigate(`/presupuestos/${p.id}`); }}><Icon name="edit" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <PresupuestoForm onClose={() => setShowForm(false)} onSaved={(pid) => { setShowForm(false); navigate(`/presupuestos/${pid}`); }} />
      )}
    </>
  );
}

export function PresupuestoForm({ onClose, onSaved }: { onClose: () => void; onSaved: (id: number) => void }) {
  const [f, setF] = useState<any>({ cliente_id: '', vehiculo_id: '', fecha: today(), vencimiento: addDays(today(), 15), detalle: '', mano_obra: '', descuento: '0', observaciones: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: clientesData } = useAsync<{ clientes: Cliente[] }>(() => api.get('/clientes?limit=500'), []);
  const { data: vehsData } = useAsync<{ vehiculos: Vehiculo[] }>(
    () => (f.cliente_id ? api.get(`/vehiculos?cliente_id=${f.cliente_id}`) : Promise.resolve({ vehiculos: [] })),
    [f.cliente_id]
  );
  const clientes = clientesData?.clientes || [];
  const vehiculos = vehsData?.vehiculos || [];

  const submit = async () => {
    if (!f.cliente_id) return setErr('Seleccioná el cliente');
    setBusy(true);
    const res = await api.post<{ presupuesto: Presupuesto }>('/presupuestos', f);
    setBusy(false);
    onSaved(res.presupuesto.id);
  };

  return (
    <Modal title="Nuevo presupuesto" onClose={onClose}>
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
        <Field label="Fecha">
          <input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} />
        </Field>
        <Field label="Vencimiento">
          <input type="date" value={f.vencimiento} onChange={(e) => setF({ ...f, vencimiento: e.target.value })} />
        </Field>
        <Field label="Detalle">
          <input value={f.detalle} onChange={(e) => setF({ ...f, detalle: e.target.value })} placeholder="Distribución completa, frenos…" />
        </Field>
        <Field label="Mano de obra">
          <input type="number" value={f.mano_obra} onChange={(e) => setF({ ...f, mano_obra: e.target.value })} />
        </Field>
        <Field label="Descuento">
          <input type="number" value={f.descuento} onChange={(e) => setF({ ...f, descuento: e.target.value })} />
        </Field>
        <Field label="Observaciones" className="full">
          <textarea value={f.observaciones} onChange={(e) => setF({ ...f, observaciones: e.target.value })} />
        </Field>
      </div>
      {err && <div className="alert alert-error" style={{ marginTop: 12 }}>{err}</div>}
      <div className="form-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>Crear presupuesto</button>
      </div>
    </Modal>
  );
}
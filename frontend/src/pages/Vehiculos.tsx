import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { Modal, Field, Empty, Spinner } from '../components/UI';
import { Icon } from '../components/Icons';
import { fullName, dateShort } from '../lib/format';
import type { Cliente, Vehiculo } from '../lib/types';

export function Vehiculos() {
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const { data, loading } = useAsync<{ vehiculos: Vehiculo[] }>(
    () => api.get(`/vehiculos?q=${encodeURIComponent(q)}`),
    [q]
  );
  const vehs = data?.vehiculos || [];

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title">Vehículos</h2>
        <div className="left">
          <div className="search-bar">
            <Icon name="search" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Patente, marca, modelo…" />
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Icon name="plus" /> Nuevo vehículo
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : !vehs.length ? (
        <Empty icon="car" text="No hay vehículos cargados." />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vehículo</th>
                  <th>Patente</th>
                  <th>Año</th>
                  <th className="num">KM</th>
                  <th>Cliente</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {vehs.map((v) => (
                  <tr key={v.id} className="row-link" onClick={() => navigate(`/vehiculos/${v.id}`)}>
                    <td>{[v.marca, v.modelo].filter(Boolean).join(' ')} {v.version}</td>
                    <td><span className="badge badge-dark">{v.patente || '—'}</span></td>
                    <td>{v.anio}</td>
                    <td className="num">{v.kilometraje?.toLocaleString('es-AR')}</td>
                    <td>{fullName({ nombre: v.cliente_nombre, apellido: v.cliente_apellido })}</td>
                    <td>
                      <div className="td-actions">
                        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); navigate(`/vehiculos/${v.id}`); }} title="Historial">
                          <Icon name="clock" />
                        </button>
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
        <VehiculoForm
          onClose={() => setShowForm(false)}
          onSaved={() => setShowForm(false)}
        />
      )}
    </>
  );
}

export function VehiculoForm({
  clienteId,
  vehiculo,
  onClose,
  onSaved,
}: {
  clienteId?: number;
  vehiculo?: Vehiculo | null;
  onClose: () => void;
  onSaved: (v: Vehiculo) => void;
}) {
  const { data: clientesData } = useAsync<{ clientes: Cliente[] }>(() => api.get('/clientes?limit=500'), []);
  const clientes = clientesData?.clientes || [];

  const [f, setF] = useState<any>(vehiculo ? { ...vehiculo } : {
    cliente_id: clienteId || '',
    patente: '', marca: '', modelo: '', anio: '', version: '',
    kilometraje: '', combustible: '', color: '', observaciones: '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    if (!f.cliente_id) return setErr('Seleccioná el cliente');
    setBusy(true);
    try {
      const res = await (vehiculo
        ? api.put<{ vehiculo: Vehiculo }>(`/vehiculos/${vehiculo.id}`, f)
        : api.post<{ vehiculo: Vehiculo }>('/vehiculos', f));
      onSaved(res.vehiculo);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={vehiculo ? 'Editar vehículo' : 'Nuevo vehículo'} onClose={onClose}>
      <div className="form-grid">
        <Field label="Cliente" required className="full">
          <select value={f.cliente_id} onChange={set('cliente_id')}>
            <option value="">Seleccionar…</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{fullName(c)}</option>
            ))}
          </select>
        </Field>
        <Field label="Patente">
          <input value={f.patente} onChange={set('patente')} placeholder="AB123CD" />
        </Field>
        <Field label="Marca">
          <input value={f.marca} onChange={set('marca')} placeholder="Volkswagen" />
        </Field>
        <Field label="Modelo">
          <input value={f.modelo} onChange={set('modelo')} placeholder="Gol" />
        </Field>
        <Field label="Año">
          <input value={f.anio} onChange={set('anio')} placeholder="2015" />
        </Field>
        <Field label="Versión">
          <input value={f.version} onChange={set('version')} placeholder="1.6 Trendline" />
        </Field>
        <Field label="Kilometraje">
          <input value={f.kilometraje} onChange={set('kilometraje')} type="number" inputMode="numeric" />
        </Field>
        <Field label="Combustible">
          <select value={f.combustible} onChange={set('combustible')}>
            <option value="">—</option>
            <option>Nafta</option>
            <option>Diesel</option>
            <option>GNC</option>
            <option>Híbrido</option>
            <option>Eléctrico</option>
          </select>
        </Field>
        <Field label="Color">
          <input value={f.color} onChange={set('color')} />
        </Field>
        <Field label="Observaciones" className="full">
          <textarea value={f.observaciones} onChange={set('observaciones')} />
        </Field>
      </div>
      {err && <div className="alert alert-error" style={{ marginTop: 12 }}>{err}</div>}
      <div className="form-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>
          <Icon name="check" /> Guardar
        </button>
      </div>
    </Modal>
  );
}

export const formatVehiculo = (v: Vehiculo) =>
  `${[v.marca, v.modelo].filter(Boolean).join(' ')} ${v.patente || ''}`.trim() || 'Sin datos';

export { dateShort };
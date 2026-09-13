import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { Empty, Spinner } from '../components/UI';
import { Icon } from '../components/Icons';
import { fullName } from '../lib/format';
import type { Cliente, Vehiculo } from '../lib/types';
import { VehiculoForm } from './Vehiculos';

export function ClienteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showVeh, setShowVeh] = useState(false);

  const { data, loading, reload } = useAsync<{ cliente: Cliente; vehiculos: Vehiculo[] }>(
    () => api.get(`/clientes/${id}`),
    [id]
  );

  if (loading) return <Spinner />;
  if (!data?.cliente) return <Empty text="Cliente no encontrado." />;
  const c = data.cliente;
  const vehs = data.vehiculos || [];

  return (
    <>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/clientes')} style={{ marginBottom: 14 }}>
        <Icon name="back" /> Volver
      </button>

      <div className="vehicle-header">
        <h2>{fullName(c)}</h2>
        <div className="vh-meta">
          {c.telefono && <span>📞 {c.telefono}</span>}
          {c.email && <span>✉️ {c.email}</span>}
          {c.direccion && <span>📍 {c.direccion}</span>}
        </div>
        {c.observaciones && <div style={{ marginTop: 8, color: '#aaa' }}>{c.observaciones}</div>}
      </div>

      <div className="page-toolbar">
        <h3 className="card-title" style={{ margin: 0 }}>
          Vehículos ({vehs.length})
        </h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowVeh(true)}>
          <Icon name="plus" /> Agregar vehículo
        </button>
      </div>

      {vehs.length ? (
        <div className="grid grid-2">
          {vehs.map((v) => (
            <div className="card" key={v.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/vehiculos/${v.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontFamily: "'Oswald',sans-serif", fontSize: '1.1rem' }}>
                    {[v.marca, v.modelo].filter(Boolean).join(' ')}
                  </strong>
                  <div style={{ color: 'var(--gris)', fontSize: '0.8rem' }}>
                    {v.version} {v.anio ? `· ${v.anio}` : ''}
                  </div>
                </div>
                <span className="badge badge-dark">{v.patente || 'Sin patente'}</span>
              </div>
              <div style={{ marginTop: 10, color: 'var(--gris)', fontSize: '0.85rem' }}>
                KM {v.kilometraje?.toLocaleString('es-AR') || 0} · {v.combustible || '—'} · {v.color || '—'}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty icon="car" text="Este cliente todavía no tiene vehículos cargados." />
      )}

      <div className="page-toolbar" style={{ marginTop: 20 }}>
        <h3 className="card-title" style={{ margin: 0 }}>Acciones rápidas</h3>
        <div className="left">
          <button className="btn btn-dark btn-sm" onClick={() => navigate('/turnos')}><Icon name="calendar" /> Nuevo turno</button>
          <button className="btn btn-dark btn-sm" onClick={() => navigate('/trabajos')}><Icon name="wrench" /> Nuevo trabajo</button>
          <button className="btn btn-dark btn-sm" onClick={() => navigate('/presupuestos')}><Icon name="doc" /> Nuevo presupuesto</button>
        </div>
      </div>

      {showVeh && (
        <VehiculoForm
          clienteId={c.id}
          onClose={() => setShowVeh(false)}
          onSaved={() => {
            setShowVeh(false);
            reload();
          }}
        />
      )}
    </>
  );
}
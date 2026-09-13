import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { Empty, Spinner } from '../components/UI';
import { Icon } from '../components/Icons';
import { dateShort, fullName, money } from '../lib/format';
import type { Cliente, Vehiculo } from '../lib/types';

interface HistItem {
  tipo: string;
  id: number;
  fecha: string;
  kilometraje: number;
  detalle: string;
  total: number;
  estado: string;
  repuestos?: string;
}

export function VehiculoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [kmEdit, setKmEdit] = useState(false);
  const [km, setKm] = useState('');

  const { data, loading, reload } = useAsync<{ vehiculo: Vehiculo; cliente: Cliente; historial: HistItem[] }>(
    () => api.get(`/vehiculos/${id}`),
    [id]
  );
  const v = data?.vehiculo;
  const c = data?.cliente;
  const hist = data?.historial || [];

  if (loading) return <Spinner />;
  if (!v) return <Empty text="Vehículo no encontrado." />;

  const saveKm = async () => {
    await api.put(`/vehiculos/${v.id}`, { ...v, kilometraje: km });
    setKmEdit(false);
    reload();
  };

  const histTarget = (h: HistItem) => {
    if (h.tipo === 'orden') return `/trabajos/${h.id}`;
    if (h.tipo === 'presupuesto') return `/presupuestos/${h.id}`;
    return `/comprobantes`;
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/vehiculos')} style={{ marginBottom: 14 }}>
        <Icon name="back" /> Vehículos
      </button>

      <div className="vehicle-header">
        <h2>{[v.marca, v.modelo].filter(Boolean).join(' ')} {v.version}</h2>
        <div className="patente">{v.patente || 'SIN PATENTE'}</div>
        <div className="vh-meta">
          {c && <span>👤 {fullName(c)}</span>}
          {v.anio && <span>🗓 {v.anio}</span>}
          {v.combustible && <span>⛽ {v.combustible}</span>}
          {v.color && <span>🎨 {v.color}</span>}
        </div>
        <div style={{ marginTop: 10, fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: '1.1rem' }}>
          {kmEdit ? (
            <span>
              <input
                type="number"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                style={{ width: 130, padding: '6px 10px' }}
                placeholder={String(v.kilometraje || 0)}
              />
              <button className="btn btn-primary btn-sm" onClick={saveKm}>OK</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setKmEdit(false)}>×</button>
            </span>
          ) : (
            <span onClick={() => { setKm(String(v.kilometraje || '')); setKmEdit(true); }} style={{ cursor: 'pointer' }}>
              KM: {(v.kilometraje || 0).toLocaleString('es-AR')} <Icon name="edit" size={14} />
            </span>
          )}
        </div>
        {v.observaciones && <div style={{ marginTop: 6, color: '#aaa', fontSize: '0.85rem' }}>{v.observaciones}</div>}
      </div>

      <div className="quick-actions" style={{ marginBottom: 20 }}>
        <Link to="/trabajos" className="quick-action"><Icon name="wrench" /> Nuevo trabajo</Link>
        <Link to="/presupuestos" className="quick-action"><Icon name="doc" /> Presupuesto</Link>
        <Link to="/turnos" className="quick-action"><Icon name="calendar" /> Turno</Link>
      </div>

      <section className="card" style={{ marginBottom: 18 }}>
        <h3 className="card-title"><Icon name="clock" /> Historial del vehículo</h3>
        {hist.length ? (
          <div className="timeline">
            {hist.map((h) => (
              <div className="timeline-item" key={`${h.tipo}-${h.id}`}>
                <div className="tl-date">{dateShort(h.fecha)}</div>
                <div className="tl-title">
                  <Link to={histTarget(h)} style={{ color: 'inherit' }}>
                    {h.tipo === 'orden' && '🔧 Trabajo'}
                    {h.tipo === 'presupuesto' && '📄 Presupuesto'}
                    {h.tipo === 'comprobante' && '🧾 Comprobante'}
                  </Link>
                </div>
                <div className="tl-sub">{h.detalle || ''} {h.kilometraje ? `· KM ${h.kilometraje.toLocaleString('es-AR')}` : ''}</div>
                {h.repuestos && <div className="tl-sub" style={{ marginTop: 3 }}>🧩 {h.repuestos}</div>}
                <div className="tl-amount">{money(h.total)}</div>
              </div>
            ))}
          </div>
        ) : (
          <Empty icon="clock" text="Este vehículo todavía no tiene movimientos." />
        )}
      </section>
    </>
  );
}
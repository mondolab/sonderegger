import { useAsync } from '../lib/hooks';
import { api } from '../lib/api';
import { StatCard, Badge, Empty } from '../components/UI';
import { Icon } from '../components/Icons';
import { Link } from 'react-router-dom';
import { money, today } from '../lib/format';

interface DashData {
  turnos_hoy: number;
  en_taller: number;
  en_taller_importe: number;
  trabajos_pendientes: number;
  presupuestos_pendientes: number;
  caja_hoy: { ingresos: number; egresos: number; saldo: number };
  productos_stock_bajo: { id: number; nombre: string; stock: number; stock_minimo: number }[];
  proximos_turnos: any[];
}

const QUICK = [
  { to: '/clientes', icon: 'users', label: 'Nuevo cliente' },
  { to: '/vehiculos', icon: 'car', label: 'Nuevo vehículo' },
  { to: '/turnos', icon: 'calendar', label: 'Nuevo turno' },
  { to: '/trabajos', icon: 'wrench', label: 'Nuevo trabajo' },
  { to: '/presupuestos', icon: 'doc', label: 'Nuevo presupuesto' },
  { to: '/caja', icon: 'money', label: 'Movimiento caja' },
];

export function Dashboard() {
  const todayStr = today();
  const { data, loading } = useAsync<DashData>(
    () => api.get(`/dashboard?fecha=${todayStr}`),
    []
  );

  return (
    <>
      <h2 className="page-title">Panel del taller</h2>

      <div className="quick-actions" style={{ marginBottom: 20 }}>
        {QUICK.map((q) => (
          <Link key={q.to} to={q.to} className="quick-action">
            <Icon name={q.icon} />
            {q.label}
          </Link>
        ))}
      </div>

      {loading ? (
        <div className="spinner" />
      ) : (
        <div className="grid grid-4" style={{ marginBottom: 20 }}>
          <StatCard label="Turnos hoy" value={data?.turnos_hoy ?? 0} sub={todayStr} />
          <StatCard label="En taller" value={data?.en_taller ?? 0} sub={data?.en_taller_importe ? money(data.en_taller_importe) : ''} />
          <StatCard label="Trabajos pendientes" value={data?.trabajos_pendientes ?? 0} />
          <StatCard label="Presupuestos" value={data?.presupuestos_pendientes ?? 0} />
          <StatCard label="Caja hoy" value={money(data?.caja_hoy?.saldo)} sub={`Ingresos ${money(data?.caja_hoy?.ingresos)} · Egresos ${money(data?.caja_hoy?.egresos)}`} />
        </div>
      )}

      <div className="grid grid-2">
        <section className="card">
          <h3 className="card-title">
            Próximos turnos
            <Link to="/turnos" className="btn btn-dark btn-sm">Ver todos</Link>
          </h3>
          {loading ? (
            <div className="spinner" />
          ) : !data?.proximos_turnos?.length ? (
            <Empty icon="calendar" text="Sin turnos para hoy." />
          ) : (
            <div className="dash-list">
              {data.proximos_turnos.map((t) => (
                <div className="dash-item" key={t.id}>
                  <div className="time">{t.hora || '—'}</div>
                  <div className="info">
                    <div className="name">
                      {t.cliente_nombre} {t.cliente_apellido}
                    </div>
                    <div className="detail">
                      {[t.marca, t.modelo].filter(Boolean).join(' ')} {t.patente ? `· ${t.patente}` : ''}
                      {t.motivo ? ` · ${t.motivo}` : ''}
                    </div>
                  </div>
                  <Badge estado={t.estado} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h3 className="card-title">
            Stock bajo
            <Link to="/inventario" className="btn btn-dark btn-sm">Inventario</Link>
          </h3>
          {loading ? (
            <div className="spinner" />
          ) : !data?.productos_stock_bajo?.length ? (
            <Empty icon="check" text="Todo el stock está en orden." />
          ) : (
            <div className="dash-list">
              {data.productos_stock_bajo.map((p) => (
                <div className="dash-item" key={p.id}>
                  <div style={{ color: 'var(--naranja)' }}>
                    <Icon name="alert" />
                  </div>
                  <div className="info">
                    <div className="name">{p.nombre}</div>
                    <div className="detail">
                      Stock actual: {p.stock} · Mínimo: {p.stock_minimo}
                    </div>
                  </div>
                  <Badge estado="Cancelado" />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
import { useState } from 'react';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { Spinner, StatCard, Empty } from '../components/UI';
import { dateShort, money } from '../lib/format';

interface Reporte {
  caja: { ingresos: number; egresos: number; movimientos: number };
  ingresos_categoria: { categoria: string; total: number; n: number }[];
  egresos_categoria: { categoria: string; total: number; n: number }[];
  ordenes_estado: { estado: string; n: number; total: number }[];
  ordenes_mes: { mes: string; n: number; total: number }[];
  repuestos_top: { descripcion: string; producto: string | null; cantidad: number; total: number }[];
  turnos_estado: { estado: string; n: number }[];
  clientes_top: { nombre: string; apellido: string; trabajos: number; total: number }[];
  metodos_pago: { metodo_pago: string; n: number; total: number }[];
}

export function Reportes() {
  const [desde, setDesde] = useState(() => new Date().toISOString().slice(0, 7) + '-01');
  const [hasta, setHasta] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, loading } = useAsync<Reporte>(
    () => api.get(`/reportes?desde=${desde}&hasta=${hasta}`),
    [desde, hasta]
  );

  const maxCat = Math.max(1, ...(data?.ingresos_categoria || []).map((c) => c.total));

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title">Reportes</h2>
        <div className="left">
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <span>→</span>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : !data ? (
        <Empty text="Sin datos para el período." />
      ) : (
        <>
          <div className="grid grid-4" style={{ marginBottom: 20 }}>
            <StatCard label="Ingresos" value={<span style={{ color: '#1e8449' }}>{money(data.caja.ingresos)}</span>} />
            <StatCard label="Egresos" value={<span style={{ color: '#c0392b' }}>{money(data.caja.egresos)}</span>} />
            <StatCard label="Saldo" value={money(data.caja.ingresos - data.caja.egresos)} />
            <StatCard label="Movimientos" value={data.caja.movimientos} />
          </div>

          <div className="grid grid-2">
            <section className="card">
              <h3 className="card-title">Ingresos por categoría</h3>
              {data.ingresos_categoria.length ? (
                data.ingresos_categoria.map((c) => (
                  <div className="bar-row" key={c.categoria}>
                    <div className="bar-label">{c.categoria}</div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${(c.total / maxCat) * 100}%` }} />
                    </div>
                    <div style={{ minWidth: 100, textAlign: 'right', fontSize: '0.82rem', fontWeight: 700 }}>{money(c.total)} <span style={{ color: 'var(--gris)' }}>({c.n})</span></div>
                  </div>
                ))
              ) : <Empty icon="chart" text="Sin ingresos." />}
            </section>

            <section className="card">
              <h3 className="card-title">Egresos por categoría</h3>
              {data.egresos_categoria.length ? (
                data.egresos_categoria.map((c) => (
                  <div className="bar-row" key={c.categoria}>
                    <div className="bar-label">{c.categoria}</div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${(c.total / Math.max(1, ...data.egresos_categoria.map((e) => e.total))) * 100}%`, background: 'linear-gradient(90deg,#7d6608,#c0392b)' }} />
                    </div>
                    <div style={{ minWidth: 100, textAlign: 'right', fontSize: '0.82rem', fontWeight: 700 }}>{money(c.total)}</div>
                  </div>
                ))
              ) : <Empty icon="chart" text="Sin egresos." />}
            </section>

            <section className="card">
              <h3 className="card-title">Trabajos por mes</h3>
              {data.ordenes_mes.length ? (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Mes</th><th className="num">Trabajos</th><th className="num">Facturado</th></tr></thead>
                    <tbody>
                      {data.ordenes_mes.map((m) => (
                        <tr key={m.mes}>
                          <td>{dateShort(m.mes + '-01')}…</td>
                          <td className="num">{m.n}</td>
                          <td className="num">{money(m.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <Empty icon="chart" text="Sin trabajos." />}
            </section>

            <section className="card">
              <h3 className="card-title">Repuestos más vendidos</h3>
              {data.repuestos_top.length ? (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Repuesto</th><th className="num">Cant.</th><th className="num">Importe</th></tr></thead>
                    <tbody>
                      {data.repuestos_top.map((r, i) => (
                        <tr key={i}>
                          <td>{r.descripcion}</td>
                          <td className="num">{r.cantidad}</td>
                          <td className="num">{money(r.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <Empty icon="box" text="Sin repuestos." />}
            </section>

            <section className="card">
              <h3 className="card-title">Órdenes por estado</h3>
              {data.ordenes_estado.length ? (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Estado</th><th className="num">Cant.</th><th className="num">Importe</th></tr></thead>
                    <tbody>
                      {data.ordenes_estado.map((e) => (
                        <tr key={e.estado}>
                          <td>{e.estado}</td>
                          <td className="num">{e.n}</td>
                          <td className="num">{money(e.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <Empty icon="wrench" text="Sin órdenes." />}
            </section>

            <section className="card">
              <h3 className="card-title">Top clientes</h3>
              {data.clientes_top.length ? (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Cliente</th><th className="num">Trabajos</th><th className="num">Total</th></tr></thead>
                    <tbody>
                      {data.clientes_top.map((c, i) => (
                        <tr key={i}>
                          <td>{c.nombre} {c.apellido}</td>
                          <td className="num">{c.trabajos}</td>
                          <td className="num">{money(c.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <Empty icon="users" text="Sin clientes." />}
            </section>
          </div>
        </>
      )}
    </>
  );
}
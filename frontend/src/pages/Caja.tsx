import { useState } from 'react';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { Modal, Field, Empty, Spinner, StatCard, Alert } from '../components/UI';
import { Icon } from '../components/Icons';
import { dateShort, money, today } from '../lib/format';
import { CATEGORIAS_EGRESO, CATEGORIAS_INGRESO, METODOS_PAGO } from '../lib/types';
import type { MovimientoCaja } from '../lib/types';

export function Caja() {
  const [fecha, setFecha] = useState(today());
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');

  const { data: estado } = useAsync<{ abierta: boolean }>(() => api.get('/caja/estado'), []);
  const { data: resumen, reload: reloadResumen } = useAsync<{ ingresos: number; egresos: number; saldo: number }>(
    () => api.get(`/caja/resumen?fecha=${fecha}`),
    [fecha]
  );
  const { data: movsData, loading, reload } = useAsync<{ movimientos: MovimientoCaja[] }>(
    () => api.get(`/caja?fecha=${fecha}`),
    [fecha]
  );
  const movs = movsData?.movimientos || [];
  const abierta = !!estado?.abierta;

  const abrir = async () => {
    if (!abierta && !confirm('¿Abrir caja?')) return;
    if (abierta) return;
    const monto = prompt('¿Monto inicial en caja? (dejar vacío si es 0)');
    await api.post('/caja/abrir', { fecha, monto_inicial: monto || '0' });
    reload();
    reloadResumen();
    setMsg('Caja abierta');
    setTimeout(() => setMsg(''), 2000);
  };

  const cerrar = async () => {
    if (abierta) {
      if (!confirm('¿Cerrar caja? El saldo se conserva en los movimientos registrados.')) return;
      await api.post('/caja/cerrar');
      reload();
      reloadResumen();
    }
  };

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title">Caja</h2>
        <div className="left">
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={{ border: '1px solid #ccc', borderRadius: 6, padding: '9px 12px' }} />
          <button
            className={`btn ${abierta ? 'btn-danger' : 'btn-primary'}`}
            onClick={abierta ? cerrar : abrir}
          >
            <Icon name={abierta ? 'x' : 'check'} />
            {abierta ? 'Cerrar caja' : 'Abrir caja'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Icon name="plus" /> Movimiento
          </button>
        </div>
      </div>

      {msg && <Alert kind="success">{msg}</Alert>}
      {abierta && <Alert kind="warn">La caja está abierta. Recordá cerrarla al final del día.</Alert>}

      {loading ? (
        <Spinner />
      ) : (
        <div className="grid grid-3" style={{ marginBottom: 20 }}>
          <StatCard label="Ingresos" value={<span style={{ color: '#1e8449' }}>{money(resumen?.ingresos)}</span>} sub={dateShort(fecha)} />
          <StatCard label="Egresos" value={<span style={{ color: '#c0392b' }}>{money(resumen?.egresos)}</span>} />
          <StatCard label="Saldo del día" value={money(resumen?.saldo)} />
        </div>
      )}

      <div className="card">
        <h3 className="card-title"><Icon name="money" /> Movimientos del día</h3>
        {movs.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Categoría</th>
                  <th>Concepto</th>
                  <th>Pago</th>
                  <th className="num">Importe</th>
                </tr>
              </thead>
              <tbody>
                {movs.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span className={`badge ${m.tipo === 'ingreso' ? 'badge-green' : 'badge-red'}`}>
                        {m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </td>
                    <td>{m.categoria}</td>
                    <td>{m.concepto} {m.observaciones ? <span style={{ color: 'var(--gris)', fontSize: '0.8rem' }}>· {m.observaciones}</span> : null}</td>
                    <td>{m.metodo_pago}</td>
                    <td className="num" style={{ fontWeight: 800, color: m.tipo === 'ingreso' ? '#1e8449' : '#c0392b' }}>
                      {m.tipo === 'ingreso' ? '+' : '−'} {money(m.importe)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="money" text="Sin movimientos este día." />
        )}
      </div>

      {showForm && <MovimientoForm fecha={fecha} onClose={() => setShowForm(false)} onDone={() => { reload(); reloadResumen(); }} />}
    </>
  );
}

function MovimientoForm({ fecha, onClose, onDone }: { fecha: string; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState<any>({ fecha, tipo: 'ingreso', categoria: 'reparación', concepto: '', importe: '', metodo_pago: 'Efectivo', observaciones: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const categorias = f.tipo === 'ingreso' ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO;

  const submit = async () => {
    if (!f.concepto.trim()) return setErr('El concepto es obligatorio');
    if (+f.importe <= 0) return setErr('El importe debe ser mayor a cero');
    setBusy(true);
    await api.post('/caja/movimientos', f);
    setBusy(false);
    onDone();
    onClose();
  };

  return (
    <Modal title="Registrar movimiento de caja" onClose={onClose}>
      <div className="seg" style={{ marginBottom: 14 }}>
        <button className={f.tipo === 'ingreso' ? 'active' : ''} onClick={() => setF({ ...f, tipo: 'ingreso', categoria: 'reparación' })}>Ingreso</button>
        <button className={f.tipo === 'egreso' ? 'active' : ''} onClick={() => setF({ ...f, tipo: 'egreso', categoria: 'compra de repuestos' })}>Egreso</button>
      </div>
      <div className="form-grid">
        <Field label="Concepto" required>
          <input value={f.concepto} onChange={(e) => setF({ ...f, concepto: e.target.value })} placeholder="Cambio de aceite - Gol…" />
        </Field>
        <Field label="Importe" required>
          <input type="number" value={f.importe} onChange={(e) => setF({ ...f, importe: e.target.value })} inputMode="numeric" />
        </Field>
        <Field label="Categoría">
          <select value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>
            {categorias.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Método de pago">
          <select value={f.metodo_pago} onChange={(e) => setF({ ...f, metodo_pago: e.target.value })}>
            {METODOS_PAGO.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Fecha">
          <input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} />
        </Field>
        <Field label="Observaciones">
          <input value={f.observaciones} onChange={(e) => setF({ ...f, observaciones: e.target.value })} />
        </Field>
      </div>
      {err && <div className="alert alert-error" style={{ marginTop: 12 }}>{err}</div>}
      <div className="form-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>Registrar</button>
      </div>
    </Modal>
  );
}
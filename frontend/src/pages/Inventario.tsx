import { useState } from 'react';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { Modal, Field, Empty, Spinner, Alert } from '../components/UI';
import { Icon } from '../components/Icons';
import { dateShort, money } from '../lib/format';
import type { MovimientoStock, Producto } from '../lib/types';

export function Inventario() {
  const [q, setQ] = useState('');
  const [bajo, setBajo] = useState(false);
  const [cat, setCat] = useState('');
  const [edit, setEdit] = useState<Producto | null>(null);
  const [newForm, setNewForm] = useState(false);
  const [stockFor, setStockFor] = useState<Producto | null>(null);

  const { data, loading, reload } = useAsync<{ productos: Producto[] }>(
    () =>
      api.get(
        `/productos?q=${encodeURIComponent(q)}&limit=300${bajo ? '&stock_bajo=1' : ''}${cat ? `&categoria=${encodeURIComponent(cat)}` : ''}`
      ),
    [q, bajo, cat]
  );
  const { data: catsData } = useAsync<{ categorias: string[] }>(() => api.get('/productos/categorias'), []);
  const productos = data?.productos || [];
  const categorias = catsData?.categorias || [];

  const del = async (p: Producto) => {
    if (confirm(`¿Eliminar "${p.nombre}"? Se perderá su historial de movimientos.`)) {
      await api.del(`/productos/${p.id}`);
      reload();
    }
  };

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title">Inventario</h2>
        <div className="left">
          <div className="search-bar">
            <Icon name="search" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Producto, código, marca…" />
          </div>
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categorias.map((c) => <option key={c}>{c}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600 }}>
            <input type="checkbox" checked={bajo} onChange={(e) => setBajo(e.target.checked)} />
            Stock bajo
          </label>
        </div>
        <button className="btn btn-primary" onClick={() => setNewForm(true)}>
          <Icon name="plus" /> Nuevo producto
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : !productos.length ? (
        <Empty icon="box" text="No hay productos." />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Marca</th>
                  <th>Código</th>
                  <th className="num">Stock</th>
                  <th className="num">Mínimo</th>
                  <th className="num">Costo</th>
                  <th className="num">Precio</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => {
                  const low = p.stock <= p.stock_minimo;
                  return (
                    <tr key={p.id}>
                      <td><strong>{p.nombre}</strong> {low && <Icon name="alert" size={14} />}</td>
                      <td>{p.categoria}</td>
                      <td>{p.marca}</td>
                      <td>{p.codigo}</td>
                      <td className="num">
                        <span className={`badge ${low ? 'badge-red' : 'badge-green'}`}>
                          {p.stock} {p.unidad}
                        </span>
                      </td>
                      <td className="num">{p.stock_minimo}</td>
                      <td className="num">{money(p.costo)}</td>
                      <td className="num">{money(p.precio)}</td>
                      <td>
                        <div className="td-actions">
                          <button className="icon-btn" title="Movimiento stock" onClick={() => setStockFor(p)}><Icon name="arrowUp" /></button>
                          <button className="icon-btn" title="Editar" onClick={() => setEdit(p)}><Icon name="edit" /></button>
                          <button className="icon-btn danger" title="Eliminar" onClick={() => del(p)}><Icon name="trash" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(newForm || edit) && (
        <ProductoForm
          producto={edit}
          onClose={() => { setNewForm(false); setEdit(null); }}
          onSaved={reload}
        />
      )}
      {stockFor && (
        <StockModal
          producto={stockFor}
          onClose={() => setStockFor(null)}
          onDone={reload}
        />
      )}
    </>
  );
}

function ProductoForm({ producto, onClose, onSaved }: { producto: Producto | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<any>(producto
    ? { ...producto }
    : { nombre: '', categoria: '', marca: '', codigo: '', proveedor: '', costo: '', precio: '', stock: '0', stock_minimo: '0', unidad: 'unidad', ubicacion: '', observaciones: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    if (!f.nombre.trim()) return setErr('El nombre es obligatorio');
    setBusy(true);
    if (producto) await api.put(`/productos/${producto.id}`, f);
    else await api.post('/productos', f);
    setBusy(false);
    onSaved();
    onClose();
  };

  return (
    <Modal title={producto ? 'Editar producto' : 'Nuevo producto'} onClose={onClose} wide>
      <div className="form-grid">
        <Field label="Producto" required>
          <input value={f.nombre} onChange={set('nombre')} placeholder="Aceite 10W40" />
        </Field>
        <Field label="Categoría">
          <input value={f.categoria} onChange={set('categoria')} placeholder="Lubricantes" />
        </Field>
        <Field label="Marca">
          <input value={f.marca} onChange={set('marca')} />
        </Field>
        <Field label="Código">
          <input value={f.codigo} onChange={set('codigo')} />
        </Field>
        <Field label="Proveedor">
          <input value={f.proveedor} onChange={set('proveedor')} />
        </Field>
        <Field label="Costo">
          <input type="number" value={f.costo} onChange={set('costo')} />
        </Field>
        <Field label="Precio">
          <input type="number" value={f.precio} onChange={set('precio')} />
        </Field>
        <Field label="Stock actual">
          <input type="number" value={f.stock} onChange={set('stock')} />
        </Field>
        <Field label="Stock mínimo">
          <input type="number" value={f.stock_minimo} onChange={set('stock_minimo')} />
        </Field>
        <Field label="Unidad">
          <input value={f.unidad} onChange={set('unidad')} placeholder="unidad / litro / juego" />
        </Field>
        <Field label="Ubicación">
          <input value={f.ubicacion} onChange={set('ubicacion')} placeholder="Estante A1" />
        </Field>
        <Field label="Observaciones" className="full">
          <textarea value={f.observaciones} onChange={set('observaciones')} />
        </Field>
      </div>
      {err && <div className="alert alert-error" style={{ marginTop: 12 }}>{err}</div>}
      <div className="form-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>Guardar</button>
      </div>
    </Modal>
  );
}

function StockModal({ producto, onClose, onDone }: { producto: Producto; onClose: () => void; onDone: () => void }) {
  const [tipo, setTipo] = useState('ingreso');
  const [cant, setCant] = useState('');
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);

  const { data } = useAsync<{ movimientos: MovimientoStock[] }>(() => api.get(`/productos/${producto.id}/movimientos`), [producto.id]);
  const movs = data?.movimientos || [];

  const submit = async () => {
    if (!+cant || +cant <= 0) return;
    setBusy(true);
    await api.post(`/productos/${producto.id}/movimientos`, { tipo, cantidad: cant, motivo });
    setBusy(false);
    onDone();
  };

  return (
    <Modal title={`Movimiento de stock: ${producto.nombre}`} onClose={onClose}>
      <div className="alert alert-warn">Stock actual: <strong>{producto.stock} {producto.unidad}</strong> · Mínimo: {producto.stock_minimo}</div>
      <div className="seg" style={{ marginBottom: 12 }}>
        <button className={tipo === 'ingreso' ? 'active' : ''} onClick={() => setTipo('ingreso')}>Ingreso</button>
        <button className={tipo === 'salida' ? 'active' : ''} onClick={() => setTipo('salida')}>Salida</button>
      </div>
      <div className="form-grid">
        <Field label="Cantidad">
          <input type="number" value={cant} onChange={(e) => setCant(e.target.value)} min="1" />
        </Field>
        <Field label="Motivo">
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Compra a proveedor / Venta / Uso" />
        </Field>
      </div>
      <div className="form-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>Registrar</button>
      </div>

      <h4 style={{ marginTop: 20, marginBottom: 8, fontFamily: "'Oswald',sans-serif", textTransform: 'uppercase' }}>Últimos movimientos</h4>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Fecha</th><th>Tipo</th><th className="num">Cant.</th><th>Motivo</th></tr></thead>
          <tbody>
            {movs.map((m) => (
              <tr key={m.id}>
                <td>{dateShort(m.created_at.slice(0, 10))}</td>
                <td><span className={`badge ${m.tipo === 'ingreso' ? 'badge-green' : 'badge-red'}`}>{m.tipo}</span></td>
                <td className="num">{m.cantidad}</td>
                <td>{m.motivo} {m.referencia}</td>
              </tr>
            ))}
            {!movs.length && <tr><td colSpan={4} className="empty">Sin movimientos.</td></tr>}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
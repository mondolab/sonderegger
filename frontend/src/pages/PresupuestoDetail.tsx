import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { Modal, Field, Badge, Empty, Spinner } from '../components/UI';
import { Icon } from '../components/Icons';
import { dateShort, fullName, money, today } from '../lib/format';
import { waLink, msgPresupuesto } from '../lib/whatsapp';
import { printDoc } from '../lib/pdf';
import { PRESUPUESTO_ESTADOS } from '../lib/types';
import type { ConfigMap, Presupuesto, PresupuestoItem, Producto } from '../lib/types';

export function PresupuestoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [add, setAdd] = useState(false);
  const [msg, setMsg] = useState('');

  const { data, loading, reload } = useAsync<{ presupuesto: Presupuesto; items: PresupuestoItem[] }>(
    () => api.get(`/presupuestos/${id}`),
    [id]
  );
  const { data: cfgData } = useAsync<{ config: ConfigMap }>(() => api.get('/config'), []);
  const cfg = cfgData?.config || {};
  const p = data?.presupuesto;
  const items = data?.items || [];

  const guardar = async (patch: any) => {
    await api.put(`/presupuestos/${id}`, { ...p, ...patch });
    setMsg('Guardado');
    setTimeout(() => setMsg(''), 1500);
    reload();
  };

  const setEstado = async (estado: string) => {
    await api.post(`/presupuestos/${id}/estado`, { estado });
    reload();
  };

  const convertir = async () => {
    const res = await api.post<{ orden_id: number }>(`/presupuestos/${id}/convertir`);
    navigate(`/trabajos/${res.orden_id}`);
  };

  if (loading) return <Spinner />;
  if (!p) return <Empty text="Presupuesto no encontrado." />;

  const total = (+(p.repuestos_total || 0) + +(p.mano_obra || 0) - +(p.descuento || 0));

  const waPres = waLink(p.whatsapp || p.email, msgPresupuesto(p, cfg));

  const openPdf = () => {
    printDoc({
      titulo: 'Presupuesto',
      numero: p.numero,
      config: cfg,
      cliente: fullName(p),
      vehiculo: [p.marca, p.modelo].filter(Boolean).join(' ') + (p.patente ? ` · ${p.patente}` : ''),
      fecha: dateShort(p.fecha),
      items: items.map((i) => ({ descripcion: i.descripcion, cantidad: i.cantidad, importe: i.importe })),
      repuestosTotal: p.repuestos_total,
      manoObra: p.mano_obra,
      descuento: p.descuento,
      total: p.total,
      observaciones: p.observaciones,
      extra: [
        { label: 'Válido hasta', value: p.vencimiento ? dateShort(p.vencimiento) : '' },
        { label: 'Detalle', value: p.detalle },
      ],
    }, `presupuesto-${p.numero}.pdf`);
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/presupuestos')} style={{ marginBottom: 14 }}>
        <Icon name="back" /> Presupuestos
      </button>

      <div className="vehicle-header">
        <h2>Presupuesto #{p.numero}</h2>
        <div style={{ marginTop: 4, color: '#ccc' }}>
          {fullName(p)} · {[p.marca, p.modelo].filter(Boolean).join(' ')} {p.patente ? `· ${p.patente}` : ''}
        </div>
        <div className="vh-meta" style={{ marginTop: 8 }}>
          <span>📅 {dateShort(p.fecha)}</span>
          {p.vencimiento && <span>⏳ Vence {dateShort(p.vencimiento)}</span>}
        </div>
        <div style={{ marginTop: 10 }}><Badge estado={p.estado} /></div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="card-title">Datos</h3>
        <div className="form-grid">
          <Field label="Estado">
            <select value={p.estado} onChange={(e) => setEstado(e.target.value)}>
              {PRESUPUESTO_ESTADOS.map((e) => <option key={e}>{e}</option>)}
            </select>
          </Field>
          <Field label="Vencimiento">
            <input type="date" defaultValue={p.vencimiento || ''} onBlur={(e) => guardar({ vencimiento: e.target.value })} />
          </Field>
          <Field label="Detalle" className="full">
            <input defaultValue={p.detalle} onBlur={(e) => guardar({ detalle: e.target.value })} />
          </Field>
          <Field label="Observaciones" className="full">
            <input defaultValue={p.observaciones} onBlur={(e) => guardar({ observaciones: e.target.value })} />
          </Field>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <h3 className="card-title">
            Detalle de repuestos
            <button className="btn btn-primary btn-sm" onClick={() => setAdd(true)}><Icon name="plus" /> Agregar</button>
          </h3>
          {items.length ? (
            <div>
              {items.map((i) => (
                <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #eee' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{i.descripcion}</div>
                    <div style={{ color: 'var(--gris)', fontSize: '0.78rem' }}>× {i.cantidad} · {money(i.precio_unitario)}</div>
                  </div>
                  <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 800, fontStyle: 'italic' }}>{money(i.importe)}</div>
                  <button className="icon-btn danger" onClick={async () => { await api.del(`/presupuestos/items/${i.id}`); reload(); }}><Icon name="trash" /></button>
                </div>
              ))}
            </div>
          ) : (
            <Empty icon="box" text="Sin repuestos cargados." />
          )}
        </div>

        <div className="card">
          <h3 className="card-title">Totales</h3>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Field label="Mano de obra">
              <input type="number" defaultValue={p.mano_obra} onBlur={(e) => guardar({ mano_obra: e.target.value })} />
            </Field>
            <Field label="Descuento">
              <input type="number" defaultValue={p.descuento} onBlur={(e) => guardar({ descuento: e.target.value })} />
            </Field>
          </div>
          <div style={{ textAlign: 'right', marginTop: 8 }}>
            <div style={{ color: 'var(--gris)', fontSize: '0.8rem' }}>Repuestos: {money(p.repuestos_total)} · MO: {money(p.mano_obra)}</div>
            <div className="total-price">Total: {money(total)}</div>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <a className="quick-action" href={waPres} target="_blank" rel="noreferrer" style={{ background: '#25d366' }}>
          <Icon name="whatsapp" /> Enviar por WhatsApp
        </a>
        <button className="quick-action" onClick={openPdf}><Icon name="print" /> PDF</button>
        <button
          className="quick-action"
          onClick={convertir}
          style={p.estado === 'Aprobado' ? {} : { opacity: 0.5 }}
          title={p.estado !== 'Aprobado' ? 'Se convierte cuando el presupuesto está Aprobado' : ''}
        >
          <Icon name="wrench" /> Convertir en orden
        </button>
      </div>

      {add && <AddPresupuestoItem onClose={() => setAdd(false)} onDone={reload} />}
      {msg && <div className="alert alert-success" style={{ marginTop: 12 }}>{msg}</div>}
    </>
  );
}

function AddPresupuestoItem({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { id } = useParams();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Producto | null>(null);
  const [cant, setCant] = useState('1');
  const [precio, setPrecio] = useState('');
  const [descExtra, setDescExtra] = useState('');
  const [err, setErr] = useState('');

  const { data } = useAsync<{ productos: Producto[] }>(() => api.get(`/productos?q=${encodeURIComponent(q)}&limit=50`), [q]);
  const productos = data?.productos || [];

  const submit = async () => {
    if (!sel && !descExtra.trim()) return setErr('Elegí un repuesto o escribí una descripción');
    await api.post(`/presupuestos/${id}/items`, {
      descripcion: descExtra.trim() || sel?.nombre || '',
      producto_id: sel?.id || null,
      cantidad: cant,
      precio_unitario: precio || (sel?.precio || 0),
    });
    onDone();
    onClose();
  };

  return (
    <Modal title="Agregar ítem al presupuesto" onClose={onClose}>
      <div className="field" style={{ marginBottom: 10 }}>
        <label>Descripción libre (o elegí del inventario)</label>
        <input value={descExtra} onChange={(e) => setDescExtra(e.target.value)} placeholder="p. ej. Alineación y balanceo" />
      </div>
      <div className="search-bar" style={{ marginBottom: 12 }}>
        <Icon name="search" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto…" />
      </div>
      {sel && (
        <div className="alert alert-warn">
          <strong>{sel.nombre}</strong> · stock {sel.stock}
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={() => setSel(null)}>Cambiar</button>
        </div>
      )}
      {!sel && (
        <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6 }}>
          {productos.map((p) => (
            <div key={p.id} style={{ padding: '9px 12px', borderBottom: '1px solid #eee', cursor: 'pointer' }} onClick={() => { setSel(p); setPrecio(String(p.precio || '')); }}>
              <div style={{ fontWeight: 600 }}>{p.nombre}</div>
              <div style={{ color: 'var(--gris)', fontSize: '0.75rem' }}>{money(p.precio)} · stock {p.stock}</div>
            </div>
          ))}
          {!productos.length && <div className="empty">Sin resultados.</div>}
        </div>
      )}
      <div className="form-grid" style={{ marginTop: 12 }}>
        <Field label="Cantidad"><input type="number" value={cant} onChange={(e) => setCant(e.target.value)} /></Field>
        <Field label="Precio unitario"><input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} /></Field>
      </div>
      {err && <div className="alert alert-error" style={{ marginTop: 12 }}>{err}</div>}
      <div className="form-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={submit}>Agregar</button>
      </div>
    </Modal>
  );
}
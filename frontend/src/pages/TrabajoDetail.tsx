import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { Modal, Field, Badge, Empty, Spinner, Alert } from '../components/UI';
import { Icon } from '../components/Icons';
import { dateShort, fullName, money } from '../lib/format';
import { waLink } from '../lib/whatsapp';
import { msgVehiculoListo } from '../lib/whatsapp';
import { printDoc } from '../lib/pdf';
import { ORDEN_ESTADOS } from '../lib/types';
import type { ConfigMap, Orden, OrdenItem, Producto } from '../lib/types';

export function TrabajoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [saveMsg, setSaveMsg] = useState('');
  const [addPart, setAddPart] = useState(false);
  const [editItem, setEditItem] = useState<OrdenItem | null>(null);

  const { data, loading, reload } = useAsync<{ orden: Orden; items: OrdenItem[] }>(
    () => api.get(`/ordenes/${id}`),
    [id]
  );
  const { data: cfgData } = useAsync<{ config: ConfigMap }>(() => api.get('/config'), []);
  const cfg = cfgData?.config || {};
  const o: Orden | undefined = data?.orden;
  const items = data?.items || [];

  const guardar = async (patch: any) => {
    await api.put(`/ordenes/${id}`, { ...o, ...patch });
    setSaveMsg('Guardado');
    setTimeout(() => setSaveMsg(''), 1600);
    reload();
  };

  const setEstado = async (estado: string) => {
    await api.post(`/ordenes/${id}/estado`, { estado });
    reload();
  };

  const genComprobante = async () => {
    const orden = await api.get<{ orden: Orden }>(`/ordenes/${id}`);
    const res = await api.post<{ comprobante: any }>('/comprobantes', {
      orden_id: Number(id),
      cliente_id: orden.orden.cliente_id,
      vehiculo_id: orden.orden.vehiculo_id,
      fecha: o?.fecha_ingreso,
      trabajos: `${o?.problema_informado || ''}${o?.trabajo_realizado ? ' - ' + o.trabajo_realizado : ''}`,
      mano_obra: orden.orden.mano_obra,
      descuento: orden.orden.descuento,
      items: items.map((i) => ({ descripcion: i.descripcion, cantidad: i.cantidad, importe: i.importe })),
      total: orden.orden.total,
    });
    navigate(`/comprobantes?nuevo=${res.comprobante.id}`);
  };

  const total = (+(o?.repuestos_total || 0)) + (+(o?.mano_obra || 0)) - (+(o?.descuento || 0));

  if (loading) return <Spinner />;
  if (!o) return <Empty text="Orden no encontrada." />;

  const waListo = waLink(o.whatsapp, msgVehiculoListo(o, cfg));

  const openPdf = () => {
    printDoc({
      titulo: 'Orden de trabajo',
      numero: o.numero,
      config: cfg,
      cliente: fullName(o),
      vehiculo: [o.marca, o.modelo].filter(Boolean).join(' ') + (o.patente ? ` · ${o.patente}` : ''),
      fecha: dateShort(o.fecha_ingreso),
      items: items.map((i) => ({ descripcion: i.descripcion, cantidad: i.cantidad, importe: i.importe })),
      repuestosTotal: o.repuestos_total,
      manoObra: o.mano_obra,
      descuento: o.descuento,
      total: o.total,
      observaciones: o.observaciones,
      extra: [
        { label: 'KM', value: String(o.kilometraje || 0) },
        { label: 'Problema', value: o.problema_informado || '' },
        { label: 'Diagnóstico', value: o.diagnostico || '' },
        { label: 'Trabajo realizado', value: o.trabajo_realizado || '' },
      ],
    }, `orden-${o.numero}.pdf`);
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/trabajos')} style={{ marginBottom: 14 }}>
        <Icon name="back" /> Trabajos
      </button>

      <div className="vehicle-header">
        <h2>Orden #{o.numero}</h2>
        <div style={{ marginTop: 4, color: '#ccc' }}>
          {fullName(o)} · {[o.marca, o.modelo].filter(Boolean).join(' ')} {o.patente ? `· ${o.patente}` : ''}
        </div>
        <div className="vh-meta" style={{ marginTop: 8 }}>
          <span>📅 {dateShort(o.fecha_ingreso)}</span>
          <span>🛞 KM {o.kilometraje?.toLocaleString('es-AR') || 0}</span>
        </div>
        <div style={{ marginTop: 10 }}>
          <Badge estado={o.estado} />
        </div>
      </div>

      {saveMsg && <Alert kind="success">{saveMsg}</Alert>}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="card-title">Vehículo que está en el taller</h3>
        <div className="form-grid">
          <Field label="Estado">
            <select value={o.estado} onChange={(e) => setEstado(e.target.value)}>
              {ORDEN_ESTADOS.map((e) => <option key={e}>{e}</option>)}
            </select>
          </Field>
          <Field label="Kilometraje">
            <input type="number" defaultValue={o.kilometraje} onBlur={(e) => guardar({ kilometraje: e.target.value })} />
          </Field>
          <Field label="Problema informado">
            <input defaultValue={o.problema_informado} onBlur={(e) => guardar({ problema_informado: e.target.value })} />
          </Field>
          <Field label="Diagnóstico">
            <input defaultValue={o.diagnostico} onBlur={(e) => guardar({ diagnostico: e.target.value })} />
          </Field>
          <Field label="Trabajo realizado">
            <input defaultValue={o.trabajo_realizado} onBlur={(e) => guardar({ trabajo_realizado: e.target.value })} />
          </Field>
          <Field label="Observaciones">
            <input defaultValue={o.observaciones} onBlur={(e) => guardar({ observaciones: e.target.value })} />
          </Field>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <h3 className="card-title">
            Repuestos
            <button className="btn btn-primary btn-sm" onClick={() => setAddPart(true)}><Icon name="plus" /> Agregar</button>
          </h3>
          {items.length ? (
            <div>
              {items.map((i) => (
                <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #eee' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{i.descripcion}</div>
                    <div style={{ color: 'var(--gris)', fontSize: '0.78rem' }}>× {i.cantidad} · {money(i.precio_unitario)}</div>
                    {(i.product_stock !== undefined && i.product_stock <= 0) && (
                      <div style={{ color: '#c0392b', fontSize: '0.75rem', fontWeight: 700 }}>⚠ Sin stock</div>
                    )}
                  </div>
                  <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 800, fontStyle: 'italic' }}>{money(i.importe)}</div>
                  <button className="icon-btn" onClick={() => setEditItem(i)}><Icon name="edit" /></button>
                  <button className="icon-btn danger" onClick={async () => { await api.del(`/ordenes/items/${i.id}`); reload(); }}><Icon name="trash" /></button>
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
              <input type="number" defaultValue={o.mano_obra} onBlur={(e) => guardar({ mano_obra: e.target.value })} />
            </Field>
            <Field label="Descuento">
              <input type="number" defaultValue={o.descuento} onBlur={(e) => guardar({ descuento: e.target.value })} />
            </Field>
          </div>
          <div style={{ textAlign: 'right', marginTop: 8 }}>
            <div style={{ color: 'var(--gris)', fontSize: '0.8rem' }}>Repuestos: {money(o.repuestos_total)} · Mano de obra: {money(o.mano_obra)}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--gris)' }}>Descuento: {money(o.descuento)}</div>
            <div className="total-price">Total: {money(total)}</div>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <a className="quick-action" href={waListo} target="_blank" rel="noreferrer" style={{ background: '#25d366' }}>
          <Icon name="whatsapp" /> Vehículo listo
        </a>
        <button className="quick-action" onClick={genComprobante}><Icon name="receipt" /> Generar comprobante</button>
        <button className="quick-action" onClick={openPdf}><Icon name="print" /> Imprimir PDF</button>
      </div>

      {addPart && (
        <AddPartModal
          onClose={() => setAddPart(false)}
          onDone={reload}
        />
      )}
      {editItem && (
        <EditItemModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onDone={reload}
        />
      )}
    </>
  );
}

function AddPartModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { id } = useParams();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Producto | null>(null);
  const [cant, setCant] = useState('1');
  const [precio, setPrecio] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const { data } = useAsync<{ productos: Producto[] }>(
    () => api.get(`/productos?q=${encodeURIComponent(q)}&limit=50`),
    [q]
  );
  const productos = data?.productos || [];

  const pick = (p: Producto) => {
    setSel(p);
    setPrecio(String(p.precio || ''));
  };

  const submit = async () => {
    if (!sel) return setErr('Elegí un repuesto');
    setBusy(true);
    await api.post(`/ordenes/${id}/items`, {
      descripcion: sel.nombre,
      producto_id: sel.id,
      cantidad: cant,
      precio_unitario: precio,
    });
    setBusy(false);
    onDone();
    onClose();
  };

  return (
    <Modal title="Agregar repuesto" onClose={onClose}>
      <div className="search-bar" style={{ marginBottom: 12 }}>
        <Icon name="search" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto…" autoFocus />
      </div>
      {sel ? (
        <div className="alert alert-warn">
          <strong>{sel.nombre}</strong> · stock: {sel.stock} {sel.unidad}
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={() => setSel(null)}>Cambiar</button>
        </div>
      ) : (
        <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6 }}>
          {productos.map((p) => (
            <div key={p.id} style={{ padding: '9px 12px', borderBottom: '1px solid #eee', cursor: 'pointer' }} onClick={() => pick(p)}>
              <div style={{ fontWeight: 600 }}>{p.nombre} <span style={{ color: 'var(--gris)', fontSize: '0.75rem' }}>· stock {p.stock}</span></div>
              <div style={{ color: 'var(--gris)', fontSize: '0.75rem' }}>{p.marca} {p.codigo} · {money(p.precio)}</div>
            </div>
          ))}
          {!productos.length && <div className="empty">Sin resultados.</div>}
        </div>
      )}
      {sel && (
        <div className="form-grid" style={{ marginTop: 12 }}>
          <Field label="Cantidad">
            <input type="number" value={cant} onChange={(e) => setCant(e.target.value)} min="1" />
          </Field>
          <Field label="Precio unitario">
            <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} />
          </Field>
        </div>
      )}
      {err && <div className="alert alert-error" style={{ marginTop: 12 }}>{err}</div>}
      <div className="form-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy || !sel}>Agregar y descontar stock</button>
      </div>
    </Modal>
  );
}

function EditItemModal({ item, onClose, onDone }: { item: OrdenItem; onClose: () => void; onDone: () => void }) {
  const [cant, setCant] = useState(String(item.cantidad));
  const [precio, setPrecio] = useState(String(item.precio_unitario));
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    await api.put(`/ordenes/items/${item.id}`, { cantidad: cant, precio_unitario: precio });
    setBusy(false);
    onDone();
    onClose();
  };

  return (
    <Modal title="Editar repuesto" onClose={onClose}>
      <div className="form-grid">
        <Field label="Descripción"><input defaultValue={item.descripcion} disabled /></Field>
        <Field label="Cantidad"><input type="number" value={cant} onChange={(e) => setCant(e.target.value)} /></Field>
        <Field label="Precio unitario"><input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} /></Field>
      </div>
      <div className="form-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>Guardar</button>
      </div>
    </Modal>
  );
}
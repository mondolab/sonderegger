import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { Modal, Field, Empty, Spinner } from '../components/UI';
import { Icon } from '../components/Icons';
import { dateShort, fullName, money } from '../lib/format';
import { waLink, msgComprobante } from '../lib/whatsapp';
import { printDoc } from '../lib/pdf';
import { METODOS_PAGO } from '../lib/types';
import type { Comprobante, Cliente, ConfigMap, Vehiculo } from '../lib/types';

export function Comprobantes() {
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<Comprobante | null>(null);
  const [params] = useSearchParams();
  const opened = useRef<number | null>(null);

  const { data, loading, reload } = useAsync<{ comprobantes: Comprobante[] }>(
    () => api.get(`/comprobantes?q=${encodeURIComponent(q)}`),
    [q]
  );
  const comps = data?.comprobantes || [];

  useEffect(() => {
    const n = params.get('nuevo');
    if (n && comps.length && opened.current !== +n) {
      const found = comps.find((c) => c.id === +n);
      opened.current = +n;
      if (found) {
        setView(found);
        window.history.replaceState({}, '', '/comprobantes');
      }
    }
  }, [comps, params]);

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title">Comprobantes</h2>
        <div className="left">
          <div className="search-bar">
            <Icon name="search" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cliente, patente…" />
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Icon name="plus" /> Nuevo comprobante
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : !comps.length ? (
        <Empty icon="receipt" text="No hay comprobantes." />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Vehículo</th>
                  <th>Pago</th>
                  <th className="num">Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {comps.map((c) => (
                  <tr key={c.id} className="row-link" onClick={() => setView(c)}>
                    <td>{c.numero}</td>
                    <td>{dateShort(c.fecha)}</td>
                    <td>{fullName(c)}</td>
                    <td>{[c.marca, c.modelo].filter(Boolean).join(' ')} {c.patente ? `· ${c.patente}` : ''}</td>
                    <td><span className="badge badge-gray">{c.metodo_pago}</span></td>
                    <td className="num"><strong>{money(c.total)}</strong></td>
                    <td>
                      <div className="td-actions">
                        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setView(c); }}><Icon name="eye" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && <ComprobanteForm onClose={() => setShowForm(false)} onSaved={reload} />}
      {view && <ComprobanteView comprobante={view} onClose={() => setView(null)} />}
    </>
  );
}

function ComprobanteView({ comprobante, onClose }: { comprobante: Comprobante; onClose: () => void }) {
  const { data: detailData } = useAsync<{ comprobante: Comprobante; items: any[] }>(
    () => api.get(`/comprobantes/${comprobante.id}`),
    [comprobante.id]
  );
  const { data: cfgData } = useAsync<{ config: ConfigMap }>(() => api.get('/config'), []);
  const cfg = cfgData?.config || {};
  const c = detailData?.comprobante || comprobante;
  const items = detailData?.items || [];

  const wa = waLink(c.whatsapp, msgComprobante(c, cfg));

  const openPdf = () => {
    printDoc({
      titulo: 'Comprobante interno',
      numero: c.numero,
      config: cfg,
      cliente: fullName(c),
      vehiculo: [c.marca, c.modelo].filter(Boolean).join(' ') + (c.patente ? ` · ${c.patente}` : ''),
      fecha: dateShort(c.fecha),
      items: items.map((i) => ({ descripcion: i.descripcion, cantidad: i.cantidad, importe: i.importe })),
      repuestosTotal: c.repuestos_total,
      manoObra: c.mano_obra,
      descuento: c.descuento,
      total: c.total,
      observaciones: c.observaciones,
      metodoPago: c.metodo_pago,
    }, `comprobante-${c.numero}.pdf`);
  };

  return (
    <Modal title={`Comprobante Nº ${c.numero}`} onClose={onClose} wide>
      <div className="card" style={{ boxShadow: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <div>
            <strong>{fullName(c)}</strong>
            <div style={{ color: 'var(--gris)', fontSize: '0.85rem' }}>{[c.marca, c.modelo].filter(Boolean).join(' ')} {c.patente}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 800, fontStyle: 'italic' }}>{money(c.total)}</div>
            <div style={{ color: 'var(--gris)', fontSize: '0.8rem' }}>{dateShort(c.fecha)} · {c.metodo_pago}</div>
          </div>
        </div>

        {c.trabajos && <div style={{ marginBottom: 12, fontSize: '0.9rem' }}><strong>Trabajos:</strong> {c.trabajos}</div>}

        {items.length > 0 && (
          <div className="table-wrap" style={{ marginBottom: 12 }}>
            <table>
              <thead><tr><th>Descripción</th><th className="num">Cant.</th><th className="num">Importe</th></tr></thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.descripcion}</td>
                    <td className="num">{i.cantidad}</td>
                    <td className="num">{money(i.importe)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', color: 'var(--gris)', fontSize: '0.85rem', marginBottom: 14 }}>
          <span>Repuestos: {money(c.repuestos_total)}</span>
          <span>Mano de obra: {money(c.mano_obra)}</span>
          <span>Descuento: {money(c.descuento)}</span>
        </div>
        {c.observaciones && <div className="alert alert-warn" style={{ fontSize: '0.85rem' }}>{c.observaciones}</div>}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <a className="btn btn-whatsapp" href={wa} target="_blank" rel="noreferrer"><Icon name="whatsapp" /> Enviar por WhatsApp</a>
        <button className="btn btn-primary" onClick={openPdf}><Icon name="print" /> PDF</button>
      </div>
    </Modal>
  );
}

function ComprobanteForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<any>({
    cliente_id: '', vehiculo_id: '', fecha: new Date().toISOString().slice(0, 10),
    trabajos: '', items: [] as { descripcion: string; cantidad: string; importe: string }[],
    mano_obra: '', descuento: '0', metodo_pago: 'Efectivo', observaciones: '',
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: clientesData } = useAsync<{ clientes: Cliente[] }>(() => api.get('/clientes?limit=500'), []);
  const { data: vehsData } = useAsync<{ vehiculos: Vehiculo[] }>(
    () => (f.cliente_id ? api.get(`/vehiculos?cliente_id=${f.cliente_id}`) : Promise.resolve({ vehiculos: [] })),
    [f.cliente_id]
  );
  const clientes = clientesData?.clientes || [];
  const vehiculos = vehsData?.vehiculos || [];

  const addRow = () => setF({ ...f, items: [...f.items, { descripcion: '', cantidad: '1', importe: '' }] });
  const setRow = (i: number, k: string, v: string) => {
    const items = f.items.map((r: any, idx: number) => (idx === i ? { ...r, [k]: v } : r));
    setF({ ...f, items });
  };

  const submit = async () => {
    if (!f.cliente_id) return setErr('Seleccioná el cliente');
    if (!f.trabajos && f.items.every((i: any) => !i.descripcion)) return setErr('Indicá los trabajos o un ítem');
    setBusy(true);
    await api.post('/comprobantes', {
      ...f,
      items: f.items.filter((i: any) => i.descripcion.trim()).map((i: any) => ({ descripcion: i.descripcion, cantidad: i.cantidad, importe: i.importe })),
    });
    setBusy(false);
    onSaved();
    onClose();
  };

  return (
    <Modal title="Nuevo comprobante" onClose={onClose} wide>
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
        <Field label="Método de pago">
          <select value={f.metodo_pago} onChange={(e) => setF({ ...f, metodo_pago: e.target.value })}>
            {METODOS_PAGO.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Trabajos realizados" className="full">
          <input value={f.trabajos} onChange={(e) => setF({ ...f, trabajos: e.target.value })} placeholder="Cambio de aceite y filtros…" />
        </Field>
      </div>

      <div className="form-actions" style={{ justifyContent: 'flex-start', marginBottom: 8 }}>
        <button className="btn btn-dark btn-sm" onClick={addRow}><Icon name="plus" /> Agregar ítem</button>
      </div>

      {f.items.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {f.items.map((r: any, idx: number) => (
            <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <input
                style={{ flex: 1, minWidth: 160, border: '1px solid #ccc', borderRadius: 6, padding: '9px 12px' }}
                placeholder="Descripción"
                value={r.descripcion}
                onChange={(e) => setRow(idx, 'descripcion', e.target.value)}
              />
              <input
                style={{ width: 70, border: '1px solid #ccc', borderRadius: 6, padding: '9px 12px' }}
                placeholder="Cant."
                value={r.cantidad}
                onChange={(e) => setRow(idx, 'cantidad', e.target.value)}
              />
              <input
                style={{ width: 110, border: '1px solid #ccc', borderRadius: 6, padding: '9px 12px' }}
                placeholder="Importe"
                value={r.importe}
                onChange={(e) => setRow(idx, 'importe', e.target.value)}
              />
              <button className="icon-btn danger" onClick={() => setF({ ...f, items: f.items.filter((_: any, j: number) => j !== idx) })}><Icon name="trash" /></button>
            </div>
          ))}
        </div>
      )}

      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <Field label="Mano de obra">
          <input type="number" value={f.mano_obra} onChange={(e) => setF({ ...f, mano_obra: e.target.value })} />
        </Field>
        <Field label="Descuento">
          <input type="number" value={f.descuento} onChange={(e) => setF({ ...f, descuento: e.target.value })} />
        </Field>
        <Field label="Observaciones">
          <input value={f.observaciones} onChange={(e) => setF({ ...f, observaciones: e.target.value })} placeholder="Nota interna…" />
        </Field>
      </div>

      {err && <div className="alert alert-error" style={{ marginTop: 12 }}>{err}</div>}
      <div className="form-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>
          <Icon name="check" /> Generar comprobante
        </button>
      </div>
    </Modal>
  );
}
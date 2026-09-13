import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { Modal, Field, Empty, Spinner } from '../components/UI';
import { Icon } from '../components/Icons';
import { fullName } from '../lib/format';
import type { Cliente } from '../lib/types';

const EMPTY: any = { nombre: '', apellido: '', telefono: '', whatsapp: '', email: '', direccion: '', observaciones: '' };

export function Clientes() {
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<null | { edit: Cliente | null }>(null);
  const navigate = useNavigate();

  const { data, loading, reload } = useAsync<{ clientes: Cliente[] }>(
    () => api.get(`/clientes?q=${encodeURIComponent(q)}`),
    [q]
  );
  const clientes = data?.clientes || [];

  const save = async (form: any, edit: Cliente | null) => {
    if (edit) await api.put(`/clientes/${edit.id}`, form);
    else await api.post('/clientes', form);
    reload();
  };

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title">Clientes</h2>
        <div className="left">
          <div className="search-bar">
            <Icon name="search" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente…" />
          </div>
          <button className="btn btn-primary" onClick={() => setModal({ edit: null })}>
            <Icon name="plus" /> Nuevo
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : !clientes.length ? (
        <Empty icon="users" text="No hay clientes cargados." />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Teléfono</th>
                  <th>WhatsApp</th>
                  <th>Email</th>
                  <th className="num">Vehículos</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id} className="row-link" onClick={() => navigate(`/clientes/${c.id}`)}>
                    <td><strong>{fullName(c)}</strong></td>
                    <td>{c.telefono}</td>
                    <td>{c.whatsapp}</td>
                    <td>{c.email}</td>
                    <td className="num">{c.total_vehiculos ?? 0}</td>
                    <td>
                      <div className="td-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="icon-btn" title="Editar" onClick={() => setModal({ edit: c })}>
                          <Icon name="edit" />
                        </button>
                        <a className="icon-btn" title="WhatsApp" href={`https://wa.me/${(c.whatsapp || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                          <Icon name="whatsapp" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <ClienteModal
          cliente={modal.edit}
          onClose={() => setModal(null)}
          onSave={async (form) => {
            await save(form, modal.edit);
            setModal(null);
          }}
        />
      )}
    </>
  );
}

function ClienteModal({ cliente, onClose, onSave }: { cliente: Cliente | null; onClose: () => void; onSave: (f: any) => void }) {
  const [f, setF] = useState<any>(cliente ? { ...cliente } : { ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    if (!f.nombre.trim()) return setErr('El nombre es obligatorio');
    setBusy(true);
    try {
      await onSave(f);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={cliente ? 'Editar cliente' : 'Nuevo cliente'} onClose={onClose}>
      <div className="form-grid">
        <Field label="Nombre" required>
          <input value={f.nombre} onChange={set('nombre')} />
        </Field>
        <Field label="Apellido">
          <input value={f.apellido} onChange={set('apellido')} />
        </Field>
        <Field label="Teléfono">
          <input value={f.telefono} onChange={set('telefono')} inputMode="tel" />
        </Field>
        <Field label="WhatsApp">
          <input value={f.whatsapp} onChange={set('whatsapp')} inputMode="tel" />
        </Field>
        <Field label="Email">
          <input value={f.email} onChange={set('email')} type="email" />
        </Field>
        <Field label="Dirección">
          <input value={f.direccion} onChange={set('direccion')} />
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
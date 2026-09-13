import { useState } from 'react';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { Field, Spinner, Alert } from '../components/UI';
import { Icon } from '../components/Icons';
import type { ConfigMap } from '../lib/types';

const FIELDS: { key: string; label: string; tipo?: string; ayuda?: string }[] = [
  { key: 'taller_nombre', label: 'Nombre del taller' },
  { key: 'taller_direccion', label: 'Dirección' },
  { key: 'taller_telefono', label: 'Teléfono' },
  { key: 'taller_whatsapp', label: 'WhatsApp (solo números)' },
  { key: 'taller_email', label: 'Email' },
  { key: 'taller_instagram', label: 'Instagram', ayuda: 'URL del perfil (se muestra en los PDFs)' },
  { key: 'taller_cuit', label: 'CUIT' },
  { key: 'taller_condicion', label: 'Condición fiscal' },
  { key: 'taller_logo', label: 'Logo (URL)', ayuda: 'URL pública de una imagen' },
  { key: 'comprobante_next', label: 'Próximo nº de comprobante', tipo: 'number', ayuda: 'Número correlativo que seguirá' },
  { key: 'presupuesto_next', label: 'Próximo nº de presupuesto', tipo: 'number' },
  { key: 'orden_next', label: 'Próximo nº de orden', tipo: 'number' },
];

export function Configuracion() {
  const { data, loading, reload } = useAsync<{ config: ConfigMap }>(() => api.get('/config'), []);
  const [f, setF] = useState<ConfigMap>({});
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  if (!loaded && data) {
    setF({ ...data.config });
    setLoaded(true);
  }

  const save = async () => {
    setMsg('');
    setErr('');
    try {
      await api.put('/config', {
        taller_nombre: f.taller_nombre,
        taller_direccion: f.taller_direccion,
        taller_telefono: f.taller_telefono,
        taller_whatsapp: f.taller_whatsapp,
        taller_email: f.taller_email,
        taller_cuit: f.taller_cuit,
        taller_condicion: f.taller_condicion,
        taller_logo: f.taller_logo,
        taller_instagram: f.taller_instagram,
        comprobante_next: f.comprobante_next,
        presupuesto_next: f.presupuesto_next,
        orden_next: f.orden_next,
      });
      setMsg('Configuración guardada.');
      setTimeout(() => setMsg(''), 2200);
      reload();
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  return (
    <>
      <h2 className="page-title">Configuración del taller</h2>

      {loading ? (
        <Spinner />
      ) : (
        <div className="grid grid-2">
          <section className="card">
            <h3 className="card-title"><Icon name="settings" /> Datos del taller</h3>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {FIELDS.filter((x) => !/next$/.test(x.key)).map((fd) => (
                <Field key={fd.key} label={fd.label} className={fd.key === 'taller_nombre' ? 'full' : ''}>
                  <input
                    type={fd.tipo || 'text'}
                    value={f[fd.key] || ''}
                    onChange={set(fd.key)}
                    placeholder={fd.ayuda || ''}
                  />
                  {fd.ayuda && <small style={{ color: 'var(--gris)' }}>{fd.ayuda}</small>}
                </Field>
              ))}
            </div>
          </section>

          <div>
            <section className="card" style={{ marginBottom: 16 }}>
              <h3 className="card-title"><Icon name="doc" /> Numeración</h3>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                {FIELDS.filter((x) => /next$/.test(x.key)).map((fd) => (
                  <Field key={fd.key} label={fd.label}>
                    <input type="number" value={f[fd.key] || ''} onChange={set(fd.key)} />
                  </Field>
                ))}
              </div>
              <div className="alert alert-warn" style={{ marginTop: 12, fontSize: '0.82rem' }}>
                La numeración avanza sola al crear comprobantes, presupuestos y órdenes. Solo tocá estos valores si necesitás corregir un número.
              </div>
            </section>

            <section className="card">
              <h3 className="card-title"><Icon name="users" /> Cambiar contraseña</h3>
              <PasswordChange />
            </section>
          </div>
        </div>
      )}

      {msg && <div className="alert alert-success" style={{ marginTop: 16 }}>{msg}</div>}
      {err && <div className="alert alert-error" style={{ marginTop: 16 }}>{err}</div>}

      <div className="form-actions">
        <button className="btn btn-primary" onClick={save}><Icon name="check" /> Guardar configuración</button>
      </div>
    </>
  );
}

function PasswordChange() {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const submit = async () => {
    setMsg('');
    setErr('');
    try {
      await api.post('/auth/password', { actual, nueva });
      setMsg('Contraseña actualizada.');
      setActual('');
      setNueva('');
    } catch (e: any) {
      setErr(e.message);
    }
  };

  return (
    <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
      <Field label="Contraseña actual">
        <input type="password" value={actual} onChange={(e) => setActual(e.target.value)} />
      </Field>
      <Field label="Nueva contraseña">
        <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} />
      </Field>
      {msg && <div className="alert alert-success">{msg}</div>}
      {err && <div className="alert alert-error">{err}</div>}
      <button className="btn btn-dark" onClick={submit}>Actualizar contraseña</button>
    </div>
  );
}
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../auth';
import { Alert } from '../components/UI';

export function Login() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get<{ configured: boolean }>('/auth/status')
      .then((r) => setConfigured(!!r?.configured))
      .catch(() => setConfigured(false));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (configured) {
        await login(usuario.trim(), password);
      } else {
        if (password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres');
          setBusy(false);
          return;
        }
        if (password !== password2) {
          setError('Las contraseñas no coinciden');
          setBusy(false);
          return;
        }
        await api.post('/auth/setup', { usuario: usuario.trim(), password });
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0e0e', padding: 16 }}>
      <div className="card" style={{ maxWidth: 420, width: '100%', padding: '34px 30px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 className="logo-name" style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 900, fontStyle: 'italic', fontSize: '1.7rem', margin: 0 }}>
            MECÁNICA <span style={{ color: 'var(--naranja)' }}>SONDERGGER</span>
          </h1>
          <div style={{ color: 'var(--gris)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 2, marginTop: 6 }}>
            Sistema de taller
          </div>
        </div>

        {configured === null ? (
          <div className="spinner" />
        ) : (
          <>
            {configured ? (
              <Alert kind="warn">Acceso restringido al dueño del taller.</Alert>
            ) : (
              <Alert kind="warn">
                Primer uso: creá tu usuario y contraseña maestra. Este paso se realiza una sola vez.
              </Alert>
            )}

            <form onSubmit={submit} className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <div className="field">
                <label>Usuario</label>
                <input
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="usuario"
                  autoFocus
                  required
                />
              </div>
              <div className="field">
                <label>Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  required
                />
              </div>
              {!configured && (
                <div className="field">
                  <label>Repetir contraseña</label>
                  <input
                    type="password"
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    placeholder="••••••"
                    required
                  />
                </div>
              )}
              {error && <Alert kind="error">{error}</Alert>}
              <button className="btn btn-primary btn-block" disabled={busy}>
                {configured ? 'Entrar al taller' : 'Configurar acceso'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
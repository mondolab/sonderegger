import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { useAsync } from '../lib/hooks';
import { api } from '../lib/api';
import { Icon } from './Icons';
import type { ConfigMap } from '../lib/types';

const MENU = [
  { to: '/', icon: 'dashboard', label: 'Inicio', end: true },
  { to: '/clientes', icon: 'users', label: 'Clientes' },
  { to: '/vehiculos', icon: 'car', label: 'Vehículos' },
  { to: '/turnos', icon: 'calendar', label: 'Turnos' },
  { to: '/trabajos', icon: 'wrench', label: 'Trabajos' },
  { to: '/presupuestos', icon: 'doc', label: 'Presupuestos' },
  { to: '/comprobantes', icon: 'receipt', label: 'Comprobantes' },
  { to: '/inventario', icon: 'box', label: 'Inventario' },
  { to: '/caja', icon: 'money', label: 'Caja' },
  { to: '/reportes', icon: 'chart', label: 'Reportes' },
  { to: '/configuracion', icon: 'settings', label: 'Configuración' },
];

export function Layout() {
  const [drawer, setDrawer] = useState(false);
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const { data } = useAsync<{ config: ConfigMap }>(() => api.get('/config'), []);

  const nombre = data?.config?.taller_nombre || 'MECÁNICA SONDERGGER';

  const nav = (
    <nav className="sidebar-nav">
      {MENU.map((m) => (
        <NavLink
          key={m.to}
          to={m.to}
          end={m.end}
          onClick={() => setDrawer(false)}
          className={({ isActive }) => `menu-item${isActive ? ' active' : ''}`}
        >
          <Icon name={m.icon} />
          {m.label}
        </NavLink>
      ))}
    </nav>
  );

  const sidebar = (
    <aside className="sidebar">
      <div className="logo-area">
        <h2 className="logo-name">
          Mecánica <span>Sonderegger</span>
        </h2>
        <div className="logo-sub">Taller • Automotor</div>
      </div>
      {nav}
      <div className="sidebar-foot">
        <span>@{usuario || 'dueño'}</span>
        <button
          className="icon-btn"
          style={{ background: 'transparent', borderColor: '#333' }}
          title="Salir"
          onClick={async () => {
            await logout();
            navigate('/');
          }}
        >
          <Icon name="logout" />
        </button>
      </div>
    </aside>
  );

  return (
    <div className="app-shell">
      {sidebar}

      <div className={`drawer-overlay ${drawer ? 'open' : ''}`} onClick={() => setDrawer(false)} />
      <div className={`drawer ${drawer ? 'open' : ''}`}>{sidebar}</div>

      <div className="app-main">
        <header className="header">
          <button className="mobile-nav-btn" onClick={() => setDrawer(true)} aria-label="Menú">
            <Icon name="menu" />
          </button>
          <h1>{nombre}</h1>
          <div className="header-actions">
            <div className="header-user">
              <span className="avatar">{(usuario || 'T')[0].toUpperCase()}</span>
              {usuario}
            </div>
          </div>
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
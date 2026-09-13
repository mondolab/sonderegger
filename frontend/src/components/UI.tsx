import { ReactNode } from 'react';
import { Icon } from './Icons';

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={wide ? { maxWidth: 960 } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} title="Cerrar">
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Badge({ estado }: { estado?: string }) {
  const cls: Record<string, string> = {
    Pendiente: 'badge-yellow',
    Confirmado: 'badge-blue',
    'En atención': 'badge-orange',
    'En diagnóstico': 'badge-orange',
    'Esperando repuestos': 'badge-yellow',
    'En reparación': 'badge-orange',
    Realizado: 'badge-green',
    Terminado: 'badge-green',
    Entregado: 'badge-green',
    Cancelado: 'badge-red',
    Rechazado: 'badge-red',
    Vencido: 'badge-red',
    Enviado: 'badge-blue',
    Aprobado: 'badge-green',
  };
  return <span className={`badge ${cls[estado || ''] || 'badge-dark'}`}>{estado || '—'}</span>;
}

export function StatCard({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="card stat-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub ? <div className="sub">{sub}</div> : null}
    </div>
  );
}

export function Spinner() {
  return <div className="spinner" />;
}

export function Empty({ icon = 'box', text }: { icon?: string; text: string }) {
  return (
    <div className="empty">
      <Icon name={icon} size={42} />
      <div>{text}</div>
    </div>
  );
}

export function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`field ${className || ''}`}>
      <label>
        {label} {required ? <span className="req">*</span> : null}
      </label>
      {children}
    </div>
  );
}

export function Alert({ kind, children }: { kind: 'error' | 'success' | 'warn'; children: ReactNode }) {
  return <div className={`alert alert-${kind}`}>{children}</div>;
}
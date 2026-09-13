export function money(n: number | string | null | undefined): string {
  const v = Number(n) || 0;
  return '$ ' + v.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

export function dateShort(iso: string | null | undefined): string {
  if (!iso) return '';
  const s = String(iso).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

export function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addMonths(iso: string, months: number): string {
  const [y, m] = iso.split('-').map(Number);
  const d = new Date(y, m - 1 + months, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function monthLabel(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  const names = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return `${names[m - 1]} ${y}`;
}

export function monthMatrix(iso: string): string[][] {
  const [y, m] = iso.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const startDow = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: string[] = [];
  for (let i = 0; i < startDow; i++) cells.push('');
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  while (cells.length % 7) cells.push('');
  const weeks: string[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function startOfWeek(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d.toISOString().slice(0, 10);
}

export function fullName(r?: { nombre?: string; apellido?: string; cliente_nombre?: string; cliente_apellido?: string } | null): string {
  if (!r) return '';
  const first = r.cliente_nombre ?? r.nombre;
  const last = r.cliente_apellido ?? r.apellido;
  return [first, last].filter(Boolean).join(' ');
}

export function statusClass(estado?: string): string {
  const map: Record<string, string> = {
    'Pendiente': 'badge-yellow',
    'Confirmado': 'badge-blue',
    'En atención': 'badge-orange',
    'En diagnóstico': 'badge-orange',
    'Esperando repuestos': 'badge-yellow',
    'En reparación': 'badge-orange',
    'Realizado': 'badge-green',
    'Terminado': 'badge-green',
    'Entregado': 'badge-green',
    'Cancelado': 'badge-red',
    'Rechazado': 'badge-red',
    'Vencido': 'badge-red',
    'Enviado': 'badge-blue',
    'Aprobado': 'badge-green',
  };
  return map[estado || ''] || 'badge-dark';
}
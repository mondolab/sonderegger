import { dateShort, money } from './format';

export function waLink(phone: string | null | undefined, text: string): string {
  const p = String(phone || '').replace(/\D/g, '');
  if (!p) return '#';
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}

export interface MsgCtx {
  tallerNombre?: string;
  tallerWhatsapp?: string;
}

const TURNOS = ['Pendiente', 'Confirmado', 'En atención', 'Realizado', 'Cancelado'];

export function msgConfirmarTurno(t: any, cfg: MsgCtx): string {
  const lines = [
    `Hola ${t.cliente_nombre || ''}!`,
    `Te confirmamos tu turno en ${cfg.tallerNombre || 'el taller'}:`,
    '',
    `📅 Fecha: ${dateShort(t.fecha)}`,
    t.motivo ? `🕐 Hora: ${t.hora}` : '',
    t.motivo ? `🔧 Motivo: ${t.motivo}` : '',
    t.patente ? `🚗 Vehículo: ${[t.marca, t.modelo].filter(Boolean).join(' ')} ${t.patente}`.trim() : '',
    '',
    '¡Nos vemos! Saludos.',
  ].filter((l) => l !== '');
  return lines.join('\n');
}

export function msgTurnoCancelado(t: any, cfg: MsgCtx): string {
  return [
    `Hola ${t.cliente_nombre || ''}!`,
    `Te avisamos que decidimos reprogramar tu turno del ${dateShort(t.fecha)} en ${cfg.tallerNombre || 'el taller'}.`,
    'Nos comunicamos a la brevedad para fijar una nueva fecha.',
    '',
    'Saludos. ¡Gracias por tu comprensión!',
  ].join('\n');
}

export function msgPresupuesto(p: any, cfg: MsgCtx): string {
  const lines = [
    `Hola ${p.cliente_nombre || ''}!`,
    `Te enviamos el presupuesto Nº ${p.numero} de ${cfg.tallerNombre || 'el taller'}:`,
    '',
    p.patente ? `🚗 Vehículo: ${[p.marca, p.modelo].filter(Boolean).join(' ')} ${p.patente}`.trim() : '',
    p.vencimiento ? `⏳ Válido hasta: ${dateShort(p.vencimiento)}` : '',
    p.detalle ? `📝 Detalle: ${p.detalle}` : '',
    '',
    `💰 Total: ${money(p.total)}`,
    '',
    '¿Lo aprobamos y coordinamos la reparación?',
  ].filter(Boolean);
  return lines.join('\n');
}

export function msgVehiculoListo(o: any, cfg: MsgCtx): string {
  const lines = [
    `Hola ${o.cliente_nombre || ''}!`,
    `Tu vehículo ${[o.marca, o.modelo].filter(Boolean).join(' ') || ''} ${o.patente || ''}`.replace(/\s+/g, ' ').trim() + ' ya está listo en ' + (cfg.tallerNombre || 'el taller') + '!',
    o.trabajo_realizado ? `🔧 Trabajo realizado: ${o.trabajo_realizado}` : '',
    '',
    `💰 Total: ${money(o.total)}`,
    '',
    'Pasá a retirarlo cuando puedas. ¡Gracias por confiar en nosotros!',
  ].filter(Boolean);
  return lines.join('\n');
}

export function msgComprobante(c: any, cfg: MsgCtx): string {
  return [
    `Hola ${c.cliente_nombre || ''}!`,
    `Te dejamos el comprobante Nº ${c.numero} de ${cfg.tallerNombre || 'el taller'}:`,
    '',
    c.patente ? `🚗 Vehículo: ${[c.marca, c.modelo].filter(Boolean).join(' ')} ${c.patente}`.trim() : '',
    c.metodo_pago ? `💳 Pago: ${c.metodo_pago}` : '',
    '',
    `💰 Total: ${money(c.total)}`,
    '',
    '¡Gracias y a disposición por cualquier consulta!',
  ].filter(Boolean).join('\n');
}

export function msgRecordatorioMantenimiento(p: any, cfg: MsgCtx): string {
  return [
    `Hola ${p.cliente_nombre || ''}! 👋`,
    `Te recordamos en ${cfg.tallerNombre || 'el taller'} que tu vehículo ${[p.marca, p.modelo].filter(Boolean).join(' ') || ''} ${p.patente || ''}`.replace(/\s+/g, ' ').trim() + ' necesita mantenimiento.',
    '',
    'No te olvides de agendar tu turno para que lo revisemos.',
    '',
    '¡Saludos!',
  ].join('\n');
}

export const TURNO_ESTADOS = TURNOS;
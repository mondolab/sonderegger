import { jsPDF } from 'jspdf';
import type { ConfigMap } from './types';

const NEGRO: [number, number, number] = [17, 17, 17];
const NARANJA: [number, number, number] = [242, 106, 33];
const GRIS: [number, number, number] = [119, 119, 119];
const BLANCO: [number, number, number] = [255, 255, 255];

export interface DocItem {
  descripcion: string;
  cantidad: number;
  importe: number;
}

export interface DocData {
  titulo: string;
  numero?: number | string;
  config: ConfigMap;
  cliente: string;
  vehiculo?: string;
  fecha?: string;
  items?: DocItem[];
  repuestosTotal?: number;
  manoObra?: number;
  descuento?: number;
  total: number;
  observaciones?: string;
  metodoPago?: string;
  extra?: { label: string; value: string }[];
}

function money(n: number): string {
  return '$ ' + (n || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

export function printDoc(data: DocData, downloadName: string): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const M = 14;
  let y = 0;

  // ---- Header: banda negra + acento naranja ----
  doc.setFillColor(...NEGRO);
  doc.rect(0, 0, W, 30, 'F');
  doc.setFillColor(...NARANJA);
  doc.rect(0, 30, W, 1.6, 'F');
  doc.setFillColor(...NARANJA);
  doc.triangle(W - 62, 6, W - 28, 6, W - 45, 30, 'F');

  doc.setTextColor(...BLANCO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  const marca = String(data.config.taller_nombre || 'MECÁNICA SONDERGGER').toUpperCase();
  doc.text(marca, M, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const dir = data.config.taller_direccion || '';
  const tel = data.config.taller_telefono || '';
  const email = data.config.taller_email || '';
  const ig = data.config.taller_instagram || '';
  const igTxt = ig ? (ig.match(/instagram\.com\/([^/?#]+)/)?.[1] ? `IG: @${ig.match(/instagram\.com\/([^/?#]+)/)![1]}` : ig) : '';
  const contact = [dir, tel, igTxt, email].filter(Boolean).join('  •  ');
  if (contact) doc.text(contact, M, 21);
  const cuit = data.config.taller_cuit ? `CUIT: ${data.config.taller_cuit}` : '';
  const cond = data.config.taller_condicion || '';
  const fiscal = [cuit, cond].filter(Boolean).join('  •  ');
  if (fiscal) doc.text(fiscal, M, 26);

  // ---- Título y número del documento ----
  y = 42;
  doc.setTextColor(...NARANJA);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(String(data.titulo).toUpperCase(), M, y);

  if (data.numero !== undefined && data.numero !== '') {
    doc.setTextColor(...NEGRO);
    doc.setFontSize(11);
    doc.text(`Nº ${String(data.numero).padStart(4, '0')}`, W - M, y, { align: 'right' });
  }
  if (data.fecha) {
    doc.setFontSize(9);
    doc.setTextColor(...GRIS);
    doc.text(`Fecha: ${data.fecha}`, W - M, y + 5, { align: 'right' });
  }
  y += 12;

  // ---- Datos del cliente / vehículo ----
  doc.setDrawColor(...NARANJA);
  doc.setLineWidth(0.7);
  doc.line(M, y, W - M, y);

  doc.setTextColor(...GRIS);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('CLIENTE', M, y + 6);
  doc.text('VEHÍCULO', W * 0.55, y + 6);
  doc.setTextColor(...NEGRO);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(data.cliente || '', M, y + 12);
  if (data.vehiculo) doc.text(data.vehiculo, W * 0.55, y + 12);

  for (const ex of data.extra || []) {
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(...GRIS);
    doc.setFont('helvetica', 'bold');
    doc.text(`${ex.label.toUpperCase()}: `, M, y + 12);
    doc.setTextColor(...NEGRO);
    doc.setFont('helvetica', 'normal');
    doc.text(String(ex.value), M + 45, y + 12);
  }

  y += 26;

  // ---- Tabla de ítems ----
  if (data.items && data.items.length) {
    doc.setFillColor(...NEGRO);
    doc.rect(M, y, W - 2 * M, 8, 'F');
    doc.setTextColor(...BLANCO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('DESCRIPCIÓN', M + 3, y + 5.5);
    doc.text('CANT.', W * 0.72, y + 5.5, { align: 'right' });
    doc.text('IMPORTE', W - M - 3, y + 5.5, { align: 'right' });
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    for (const it of data.items) {
      if (y > 270) { doc.addPage(); y = 30; }
      let fill = false;
      if ((y - 8) / 4 % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(M, y, W - 2 * M, 7.5, 'F');
        fill = true;
        void fill;
      }
      doc.setTextColor(...NEGRO);
      doc.text(doc.splitTextToSize(String(it.descripcion), 100).slice(0, 2).join(' '), M + 3, y + 5);
      doc.text(String(it.cantidad), W * 0.72, y + 5, { align: 'right' });
      doc.text(money(it.importe), W - M - 3, y + 5, { align: 'right' });
      y += 7.5;
    }
    y += 6;
  }

  // ---- Totales ----
  const tX = W - M - 60;
  let tY = y;
  const row = (label: string, value: string, bold = false, color: [number, number, number] = NEGRO) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    doc.setFontSize(bold ? 12 : 9);
    doc.text(label, tX, tY);
    doc.text(value, W - M, tY, { align: 'right' });
    tY += bold ? 8 : 6;
  };

  if (data.repuestosTotal !== undefined) row('Repuestos', money(data.repuestosTotal));
  if (data.manoObra !== undefined) row('Mano de obra', money(data.manoObra));
  if (data.descuento) row('Descuento', `- ${money(data.descuento)}`);
  if (data.metodoPago) row('Método de pago', data.metodoPago);

  doc.setDrawColor(...NARANJA);
  doc.setLineWidth(0.7);
  doc.line(tX, tY - 1, W - M, tY - 1);
  row('TOTAL', money(data.total), true, NARANJA);
  tY += 4;

  // ---- Observaciones ----
  if (data.observaciones) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRIS);
    doc.setFontSize(8);
    doc.text('OBSERVACIONES', M, tY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...NEGRO);
    doc.setFontSize(9);
    const obs = doc.splitTextToSize(String(data.observaciones), W - 2 * M);
    doc.text(obs.slice(0, 4), M, tY + 12);
  }

  // ---- Footer ----
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.setFont('helvetica', 'normal');
  doc.text('MECÁNICA SONDERGGER - Documento generado por sistema interno del taller', W / 2, 290, { align: 'center' });

  doc.save(downloadName);
}
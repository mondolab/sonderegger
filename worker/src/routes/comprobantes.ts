import type { Ctx } from '../types';
import { error, json, nextNumero, round2 } from '../util';

export function registerComprobantes(r: any): void {
  r.get('/api/comprobantes', async (ctx: Ctx) => {
    const q = ctx.url.searchParams.get('q') || '';
    const desde = ctx.url.searchParams.get('desde');
    const hasta = ctx.url.searchParams.get('hasta');
    const limit = Math.min(parseInt(ctx.url.searchParams.get('limit') || '300', 10), 500);

    let sql = `SELECT co.id, co.numero, co.fecha, co.cliente_id, co.total, co.metodo_pago, co.observaciones, co.trabajos,
                      c.nombre AS cliente_nombre, c.apellido AS cliente_apellido,
                      v.marca, v.modelo, v.patente
               FROM comprobantes co
               LEFT JOIN clientes c ON c.id = co.cliente_id
               LEFT JOIN vehiculos v ON v.id = co.vehiculo_id`;
    const where: string[] = [];
    const params: (string | number)[] = [];
    if (desde) {
      where.push('co.fecha >= ?');
      params.push(desde);
    }
    if (hasta) {
      where.push('co.fecha <= ?');
      params.push(hasta);
    }
    if (q) {
      where.push('(c.nombre LIKE ? OR c.apellido LIKE ? OR v.patente LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY co.id DESC LIMIT ?';
    params.push(limit);

    const res = await ctx.env.DB.prepare(sql).bind(...params).all();
    return json({ comprobantes: res.results });
  });

  r.get('/api/comprobantes/:id', async (ctx: Ctx) => {
    const id = Number(ctx.params.id);
    const c = await ctx.env.DB.prepare(
      `SELECT co.*, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido, c.whatsapp, c.email, c.direccion,
              v.patente, v.marca, v.modelo, v.anio
       FROM comprobantes co
       LEFT JOIN clientes c ON c.id = co.cliente_id
       LEFT JOIN vehiculos v ON v.id = co.vehiculo_id
       WHERE co.id = ?`
    ).bind(id).first();
    if (!c) return error('Comprobante no encontrado', 404);
    const items = await ctx.env.DB.prepare(
      'SELECT * FROM comprobante_items WHERE comprobante_id = ? ORDER BY id'
    ).bind(id).all();
    return json({ comprobante: c, items: items.results });
  });

  r.post('/api/comprobantes', async (ctx: Ctx) => {
    const b = ctx.body || {};
    const itemsRaw: any[] = Array.isArray(b.items) ? b.items : [];
    const items = itemsRaw
      .filter((i) => (i.descripcion || '').trim() !== '')
      .map((i) => ({
        descripcion: String(i.descripcion).trim(),
        cantidad: round2(i.cantidad ?? 1),
        importe: round2(i.importe ?? 0),
      }));
    const repuestos_total = round2(items.reduce((s, i) => s + i.importe, 0));
    const mano_obra = round2(b.mano_obra);
    const descuento = round2(b.descuento);
    const total = round2(repuestos_total + mano_obra - descuento);

    const numero = await nextNumero(ctx.env, 'comprobante_next');

    const res = await ctx.env.DB.prepare(
      `INSERT INTO comprobantes (numero, fecha, cliente_id, vehiculo_id, orden_id, trabajos,
               mano_obra, repuestos_total, descuento, total, metodo_pago, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(numero, b.fecha || '', parseInt(b.cliente_id, 10) || null, parseInt(b.vehiculo_id, 10) || null,
      parseInt(b.orden_id, 10) || null, b.trabajos || '', mano_obra, repuestos_total, descuento, total,
      b.metodo_pago || 'Efectivo', b.observaciones || '').run();
    const comprobanteId = Number(res.meta.last_row_id);

    const batch: ReturnType<D1Database['prepare']>[] = [];
    for (const it of items) {
      batch.push(ctx.env.DB.prepare(
        'INSERT INTO comprobante_items (comprobante_id, descripcion, cantidad, importe) VALUES (?, ?, ?, ?)'
      ).bind(comprobanteId, it.descripcion, it.cantidad, it.importe));
    }
    if (b.cliente_id && total >= 0) {
      batch.push(ctx.env.DB.prepare(
        `INSERT INTO movimientos_caja (fecha, tipo, categoria, concepto, importe, metodo_pago, observaciones)
         VALUES (?, 'ingreso', 'reparación', ?, ?, ?, ?)`
      ).bind(b.fecha || '', `Comprobante Nº ${numero}`, total, b.metodo_pago || 'Efectivo',
        b.observaciones || ''));
    }
    if (batch.length) await ctx.env.DB.batch(batch);

    const row = await ctx.env.DB.prepare('SELECT * FROM comprobantes WHERE id = ?').bind(comprobanteId).first();
    return json({ comprobante: row });
  });

  r.put('/api/comprobantes/:id', async (ctx: Ctx) => {
    const id = Number(ctx.params.id);
    const b = ctx.body || {};
    const itemsRaw: any[] = Array.isArray(b.items) ? b.items : [];
    const items = itemsRaw
      .filter((i) => (i.descripcion || '').trim() !== '')
      .map((i) => ({
        descripcion: String(i.descripcion).trim(),
        cantidad: round2(i.cantidad ?? 1),
        importe: round2(i.importe ?? 0),
      }));
    const repuestos_total = round2(items.reduce((s, i) => s + i.importe, 0));
    const mano_obra = round2(b.mano_obra);
    const descuento = round2(b.descuento);
    const total = round2(repuestos_total + mano_obra - descuento);

    await ctx.env.DB.prepare(
      `UPDATE comprobantes SET fecha = ?, cliente_id = ?, vehiculo_id = ?, orden_id = ?, trabajos = ?,
              mano_obra = ?, repuestos_total = ?, descuento = ?, total = ?, metodo_pago = ?, observaciones = ?
       WHERE id = ?`
    ).bind(b.fecha || '', parseInt(b.cliente_id, 10) || null, parseInt(b.vehiculo_id, 10) || null,
      parseInt(b.orden_id, 10) || null, b.trabajos || '', mano_obra, repuestos_total, descuento, total,
      b.metodo_pago || 'Efectivo', b.observaciones || '', id).run();

    await ctx.env.DB.prepare('DELETE FROM comprobante_items WHERE comprobante_id = ?').bind(id).run();
    const batch: ReturnType<D1Database['prepare']>[] = [];
    for (const it of items) {
      batch.push(ctx.env.DB.prepare(
        'INSERT INTO comprobante_items (comprobante_id, descripcion, cantidad, importe) VALUES (?, ?, ?, ?)'
      ).bind(id, it.descripcion, it.cantidad, it.importe));
    }
    if (batch.length) await ctx.env.DB.batch(batch);

    const row = await ctx.env.DB.prepare('SELECT * FROM comprobantes WHERE id = ?').bind(id).first();
    return json({ comprobante: row });
  });

  r.del('/api/comprobantes/:id', async (ctx: Ctx) => {
    await ctx.env.DB.prepare('DELETE FROM comprobantes WHERE id = ?').bind(ctx.params.id).run();
    return json({ ok: true });
  });
}
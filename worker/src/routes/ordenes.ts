import type { Ctx } from '../types';
import { error, json, nextNumero, round2 } from '../util';

async function recomputeOrden(env: any, id: number): Promise<void> {
  const sums = await env.DB.prepare(
    `SELECT COALESCE(SUM(importe), 0) AS repuestos_total FROM orden_items WHERE orden_id = ?`
  ).bind(id).first();
  const orden = await env.DB.prepare(
    'SELECT mano_obra, descuento FROM ordenes_trabajo WHERE id = ?'
  ).bind(id).first();
  if (!orden) return;
  const repuestos_total = round2(sums.repuestos_total);
  const total = round2(repuestos_total + (+orden.mano_obra || 0) - (+orden.descuento || 0));
  await env.DB.prepare(
    'UPDATE ordenes_trabajo SET repuestos_total = ?, total = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).bind(repuestos_total, total, id).run();
}

async function adjustStock(env: any, productoId: number, cantidad: number, motivo: string, referencia: string): Promise<void> {
  const prod = await env.DB.prepare('SELECT stock FROM productos WHERE id = ?').bind(productoId).first();
  if (!prod) return;
  const nuevoStock = (+prod.stock || 0) - cantidad;
  await env.DB.prepare(
    'UPDATE productos SET stock = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).bind(nuevoStock, productoId).run();
  await env.DB.prepare(
    'INSERT INTO movimientos_stock (producto_id, tipo, cantidad, motivo, referencia) VALUES (?, \'salida\', ?, ?, ?)'
  ).bind(productoId, cantidad, motivo, referencia).run();
}

const HEAD_FIELDS = ['cliente_id', 'vehiculo_id', 'turno_id', 'fecha_ingreso', 'kilometraje',
  'problema_informado', 'diagnostico', 'trabajo_realizado', 'observaciones', 'mano_obra', 'descuento'];

export function registerOrdenes(r: any): void {
  r.get('/api/ordenes', async (ctx: Ctx) => {
    const estado = ctx.url.searchParams.get('estado');
    const cliente = ctx.url.searchParams.get('cliente_id');
    const vehiculo = ctx.url.searchParams.get('vehiculo_id');
    const desde = ctx.url.searchParams.get('desde');
    const hasta = ctx.url.searchParams.get('hasta');
    const q = ctx.url.searchParams.get('q') || '';
    const limit = Math.min(parseInt(ctx.url.searchParams.get('limit') || '300', 10), 500);

    let sql = `SELECT o.id, o.numero, o.cliente_id, o.vehiculo_id, o.fecha_ingreso, o.kilometraje,
                      o.problema_informado, o.mano_obra, o.repuestos_total, o.descuento, o.total, o.estado,
                      c.nombre AS cliente_nombre, c.apellido AS cliente_apellido,
                      v.marca, v.modelo, v.patente
               FROM ordenes_trabajo o
               LEFT JOIN clientes c ON c.id = o.cliente_id
               LEFT JOIN vehiculos v ON v.id = o.vehiculo_id`;
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (estado) {
      where.push('o.estado = ?');
      params.push(estado);
    }
    if (cliente) {
      where.push('o.cliente_id = ?');
      params.push(Number(cliente));
    }
    if (vehiculo) {
      where.push('o.vehiculo_id = ?');
      params.push(Number(vehiculo));
    }
    if (desde) {
      where.push('o.fecha_ingreso >= ?');
      params.push(desde);
    }
    if (hasta) {
      where.push('o.fecha_ingreso <= ?');
      params.push(hasta);
    }
    if (q) {
      where.push('(c.nombre LIKE ? OR c.apellido LIKE ? OR v.patente LIKE ? OR v.marca LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY o.id DESC LIMIT ?';
    params.push(limit);

    const res = await ctx.env.DB.prepare(sql).bind(...params).all();
    return json({ ordenes: res.results });
  });

  r.get('/api/ordenes/:id', async (ctx: Ctx) => {
    const id = Number(ctx.params.id);
    const orden = await ctx.env.DB.prepare(
      `SELECT o.*, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido, c.whatsapp,
              v.patente, v.marca, v.modelo, v.anio
       FROM ordenes_trabajo o
       LEFT JOIN clientes c ON c.id = o.cliente_id
       LEFT JOIN vehiculos v ON v.id = o.vehiculo_id
       WHERE o.id = ?`
    ).bind(id).first();
    if (!orden) return error('Orden de trabajo no encontrada', 404);
    const items = await ctx.env.DB.prepare(
      `SELECT oi.id, oi.tipo, oi.descripcion, oi.producto_id, oi.cantidad, oi.precio_unitario, oi.importe,
              p.nombre AS producto_nombre, p.stock AS product_stock
       FROM orden_items oi LEFT JOIN productos p ON p.id = oi.producto_id
       WHERE oi.orden_id = ? ORDER BY oi.id`
    ).bind(id).all();
    return json({ orden, items: items.results });
  });

  r.post('/api/ordenes', async (ctx: Ctx) => {
    const b = ctx.body || {};
    const clienteId = parseInt(b.cliente_id, 10);
    if (!clienteId) return error('Debe seleccionar un cliente');

    const mano_obra = round2(b.mano_obra);
    const descuento = round2(b.descuento);
    const total = round2(mano_obra - descuento);
    const numero = await nextNumero(ctx.env, 'orden_next');

    const res = await ctx.env.DB.prepare(
      `INSERT INTO ordenes_trabajo (numero, cliente_id, vehiculo_id, turno_id, fecha_ingreso, kilometraje,
               problema_informado, diagnostico, trabajo_realizado, observaciones, mano_obra, descuento, total, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      numero, clienteId, parseInt(b.vehiculo_id, 10) || null, parseInt(b.turno_id, 10) || null,
      b.fecha_ingreso || '', parseInt(b.kilometraje, 10) || 0,
      b.problema_informado || '', b.diagnostico || '', b.trabajo_realizado || '', b.observaciones || '',
      mano_obra, descuento, total, b.estado || 'Pendiente'
    ).run();

    const row = await ctx.env.DB.prepare('SELECT * FROM ordenes_trabajo WHERE id = ?').bind(res.meta.last_row_id).first();
    return json({ orden: row });
  });

  r.put('/api/ordenes/:id', async (ctx: Ctx) => {
    const id = Number(ctx.params.id);
    const b = ctx.body || {};
    const sets = HEAD_FIELDS.map((f) => `${f} = ?`).join(', ');
    await ctx.env.DB.prepare(
      `UPDATE ordenes_trabajo SET ${sets}, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      parseInt(b.cliente_id, 10) || null, parseInt(b.vehiculo_id, 10) || null, parseInt(b.turno_id, 10) || null,
      b.fecha_ingreso || '', parseInt(b.kilometraje, 10) || 0,
      b.problema_informado || '', b.diagnostico || '', b.trabajo_realizado || '', b.observaciones || '',
      round2(b.mano_obra), round2(b.descuento), id
    ).run();
    await recomputeOrden(ctx.env, id);
    const row = await ctx.env.DB.prepare('SELECT * FROM ordenes_trabajo WHERE id = ?').bind(id).first();
    return json({ orden: row });
  });

  r.post('/api/ordenes/:id/items', async (ctx: Ctx) => {
    const id = Number(ctx.params.id);
    const b = ctx.body || {};
    const cantidad = round2(b.cantidad || 1);
    const precio = round2(b.precio_unitario || 0);
    const descripcion = String(b.descripcion || '').trim();
    if (!descripcion) return error('Debe indicar la descripción del repuesto');
    if (cantidad <= 0) return error('La cantidad debe ser mayor a cero');
    const importe = round2(cantidad * precio);

    if (b.producto_id) {
      await adjustStock(ctx.env, Number(b.producto_id), cantidad, 'Repuesto en orden de trabajo', `Orden #${id}`);
    }

    await ctx.env.DB.prepare(
      `INSERT INTO orden_items (orden_id, tipo, descripcion, producto_id, cantidad, precio_unitario, importe)
       VALUES (?, 'repuesto', ?, ?, ?, ?, ?)`
    ).bind(id, descripcion, b.producto_id || null, cantidad, precio, importe).run();

    await recomputeOrden(ctx.env, id);
    const items = await ctx.env.DB.prepare('SELECT * FROM orden_items WHERE orden_id = ?').bind(id).all();
    return json({ items: items.results });
  });

  r.put('/api/ordenes/items/:itemId', async (ctx: Ctx) => {
    const itemId = Number(ctx.params.itemId);
    const b = ctx.body || {};
    const item = (await ctx.env.DB.prepare('SELECT * FROM orden_items WHERE id = ?').bind(itemId).first()) as any;
    if (!item) return error('Ítem no encontrado', 404);

    const cantidad = round2(b.cantidad ?? item.cantidad);
    const precio = round2(b.precio_unitario ?? item.precio_unitario);
    const importe = round2(cantidad * precio);
    const descripcion = b.descripcion ?? item.descripcion;

    if (item.producto_id && cantidad !== +item.cantidad) {
      const diff = cantidad - +item.cantidad;
      await adjustStock(ctx.env, Number(item.producto_id), diff, 'Ajuste en orden de trabajo', `Orden #${item.orden_id}`);
    }

    await ctx.env.DB.prepare(
      'UPDATE orden_items SET descripcion = ?, cantidad = ?, precio_unitario = ?, importe = ? WHERE id = ?'
    ).bind(descripcion, cantidad, precio, importe, itemId).run();
    await recomputeOrden(ctx.env, Number(item.orden_id));
    return json({ ok: true });
  });

  r.del('/api/ordenes/items/:itemId', async (ctx: Ctx) => {
    const itemId = Number(ctx.params.itemId);
    const item = (await ctx.env.DB.prepare('SELECT * FROM orden_items WHERE id = ?').bind(itemId).first()) as any;
    if (!item) return error('Ítem no encontrado', 404);
    if (item.producto_id) {
      await adjustStock(ctx.env, Number(item.producto_id), -(+item.cantidad), 'Eliminación de ítem', `Orden #${item.orden_id}`);
    }
    await ctx.env.DB.prepare('DELETE FROM orden_items WHERE id = ?').bind(itemId).run();
    await recomputeOrden(ctx.env, Number(item.orden_id));
    return json({ ok: true });
  });

  r.post('/api/ordenes/:id/estado', async (ctx: Ctx) => {
    const id = Number(ctx.params.id);
    const { estado } = ctx.body || {};
    if (!estado) return error('Falta el estado');
    await ctx.env.DB.prepare(
      'UPDATE ordenes_trabajo SET estado = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(estado, id).run();
    return json({ ok: true });
  });

  r.del('/api/ordenes/:id', async (ctx: Ctx) => {
    const id = Number(ctx.params.id);
    const items = (await ctx.env.DB.prepare(
      'SELECT producto_id, cantidad FROM orden_items WHERE orden_id = ? AND producto_id IS NOT NULL'
    ).bind(id).all()) as any;
    for (const it of items.results) {
      await adjustStock(ctx.env, Number(it.producto_id), -(+it.cantidad), 'Eliminación de orden', `Orden #${id}`);
    }
    await ctx.env.DB.prepare('DELETE FROM ordenes_trabajo WHERE id = ?').bind(id).run();
    return json({ ok: true });
  });
}
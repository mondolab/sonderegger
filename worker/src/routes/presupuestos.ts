import type { Ctx } from '../types';
import { error, json, nextNumero, round2 } from '../util';

async function recomputePresupuesto(env: any, id: number): Promise<void> {
  const sums = await env.DB.prepare(
    'SELECT COALESCE(SUM(importe), 0) AS repuestos_total FROM presupuesto_items WHERE presupuesto_id = ?'
  ).bind(id).first();
  const p = await env.DB.prepare('SELECT mano_obra, descuento FROM presupuestos WHERE id = ?').bind(id).first();
  if (!p) return;
  const repuestos_total = round2(sums.repuestos_total);
  const total = round2(repuestos_total + (+p.mano_obra || 0) - (+p.descuento || 0));
  await env.DB.prepare(
    'UPDATE presupuestos SET repuestos_total = ?, total = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).bind(repuestos_total, total, id).run();
}

const HEAD_FIELDS = ['cliente_id', 'vehiculo_id', 'fecha', 'vencimiento', 'detalle',
  'mano_obra', 'descuento', 'observaciones'];

export function registerPresupuestos(r: any): void {
  r.get('/api/presupuestos', async (ctx: Ctx) => {
    const estado = ctx.url.searchParams.get('estado');
    const q = ctx.url.searchParams.get('q') || '';
    const limit = Math.min(parseInt(ctx.url.searchParams.get('limit') || '300', 10), 500);

    let sql = `SELECT p.id, p.numero, p.cliente_id, p.vehiculo_id, p.fecha, p.vencimiento, p.estado,
                      p.mano_obra, p.repuestos_total, p.descuento, p.total, p.detalle,
                      c.nombre AS cliente_nombre, c.apellido AS cliente_apellido,
                      v.marca, v.modelo, v.patente
               FROM presupuestos p
               LEFT JOIN clientes c ON c.id = p.cliente_id
               LEFT JOIN vehiculos v ON v.id = p.vehiculo_id`;
    const where: string[] = [];
    const params: string[] = [];
    if (estado) {
      where.push('p.estado = ?');
      params.push(estado);
    }
    if (q) {
      where.push('(c.nombre LIKE ? OR c.apellido LIKE ? OR v.patente LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY p.id DESC LIMIT ?';
    params.push(String(limit));

    const res = await ctx.env.DB.prepare(sql).bind(...params).all();
    return json({ presupuestos: res.results });
  });

  r.get('/api/presupuestos/:id', async (ctx: Ctx) => {
    const id = Number(ctx.params.id);
    const p = await ctx.env.DB.prepare(
      `SELECT p.*, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido, c.whatsapp, c.email,
              v.patente, v.marca, v.modelo, v.anio
       FROM presupuestos p
       LEFT JOIN clientes c ON c.id = p.cliente_id
       LEFT JOIN vehiculos v ON v.id = p.vehiculo_id
       WHERE p.id = ?`
    ).bind(id).first();
    if (!p) return error('Presupuesto no encontrado', 404);
    const items = await ctx.env.DB.prepare(
      `SELECT pi.id, pi.tipo, pi.descripcion, pi.producto_id, pi.cantidad, pi.precio_unitario, pi.importe,
              p.nombre AS producto_nombre
       FROM presupuesto_items pi LEFT JOIN productos p ON p.id = pi.producto_id
       WHERE pi.presupuesto_id = ? ORDER BY pi.id`
    ).bind(id).all();
    return json({ presupuesto: p, items: items.results });
  });

  r.post('/api/presupuestos', async (ctx: Ctx) => {
    const b = ctx.body || {};
    const clienteId = parseInt(b.cliente_id, 10);
    if (!clienteId) return error('Debe seleccionar un cliente');
    const numero = await nextNumero(ctx.env, 'presupuesto_next');
    const mano_obra = round2(b.mano_obra);
    const descuento = round2(b.descuento);
    const total = round2(mano_obra - descuento);
    const res = await ctx.env.DB.prepare(
      `INSERT INTO presupuestos (numero, cliente_id, vehiculo_id, fecha, vencimiento, detalle,
               mano_obra, descuento, total, observaciones, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(numero, clienteId, parseInt(b.vehiculo_id, 10) || null, b.fecha || '',
      b.vencimiento || '', b.detalle || '', mano_obra, descuento, total,
      b.observaciones || '', b.estado || 'Pendiente').run();
    const row = await ctx.env.DB.prepare('SELECT * FROM presupuestos WHERE id = ?').bind(res.meta.last_row_id).first();
    return json({ presupuesto: row });
  });

  r.put('/api/presupuestos/:id', async (ctx: Ctx) => {
    const id = Number(ctx.params.id);
    const b = ctx.body || {};
    const sets = HEAD_FIELDS.map((f) => `${f} = ?`).join(', ');
    const vals = [
      parseInt(b.cliente_id, 10) || null, parseInt(b.vehiculo_id, 10) || null, b.fecha || '',
      b.vencimiento || '', b.detalle || '', round2(b.mano_obra), round2(b.descuento),
      b.observaciones || '', id,
    ];
    await ctx.env.DB.prepare(
      `UPDATE presupuestos SET ${sets}, updated_at = datetime('now') WHERE id = ?`
    ).bind(...vals).run();
    await recomputePresupuesto(ctx.env, id);
    const row = await ctx.env.DB.prepare('SELECT * FROM presupuestos WHERE id = ?').bind(id).first();
    return json({ presupuesto: row });
  });

  r.post('/api/presupuestos/:id/items', async (ctx: Ctx) => {
    const id = Number(ctx.params.id);
    const b = ctx.body || {};
    const cantidad = round2(b.cantidad || 1);
    const precio = round2(b.precio_unitario || 0);
    const descripcion = String(b.descripcion || '').trim();
    if (!descripcion) return error('Debe indicar la descripción');
    if (cantidad <= 0) return error('La cantidad debe ser mayor a cero');
    const importe = round2(cantidad * precio);
    await ctx.env.DB.prepare(
      `INSERT INTO presupuesto_items (presupuesto_id, tipo, descripcion, producto_id, cantidad, precio_unitario, importe)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, b.tipo || 'repuesto', descripcion, b.producto_id || null, cantidad, precio, importe).run();
    await recomputePresupuesto(ctx.env, id);
    return json({ ok: true });
  });

  r.put('/api/presupuestos/items/:itemId', async (ctx: Ctx) => {
    const itemId = Number(ctx.params.itemId);
    const b = ctx.body || {};
    const item = await ctx.env.DB.prepare('SELECT * FROM presupuesto_items WHERE id = ?').bind(itemId).first();
    if (!item) return error('Ítem no encontrado', 404);
    const cantidad = round2(b.cantidad ?? item.cantidad);
    const precio = round2(b.precio_unitario ?? item.precio_unitario);
    const importe = round2(cantidad * precio);
    await ctx.env.DB.prepare(
      'UPDATE presupuesto_items SET descripcion = ?, cantidad = ?, precio_unitario = ?, importe = ? WHERE id = ?'
    ).bind(b.descripcion ?? item.descripcion, cantidad, precio, importe, itemId).run();
    await recomputePresupuesto(ctx.env, Number(item.presupuesto_id));
    return json({ ok: true });
  });

  r.del('/api/presupuestos/items/:itemId', async (ctx: Ctx) => {
    const itemId = Number(ctx.params.itemId);
    const item = await ctx.env.DB.prepare('SELECT * FROM presupuesto_items WHERE id = ?').bind(itemId).first();
    if (!item) return error('Ítem no encontrado', 404);
    await ctx.env.DB.prepare('DELETE FROM presupuesto_items WHERE id = ?').bind(itemId).run();
    await recomputePresupuesto(ctx.env, Number(item.presupuesto_id));
    return json({ ok: true });
  });

  r.post('/api/presupuestos/:id/estado', async (ctx: Ctx) => {
    const id = Number(ctx.params.id);
    const { estado } = ctx.body || {};
    if (!estado) return error('Falta el estado');
    await ctx.env.DB.prepare(
      'UPDATE presupuestos SET estado = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(estado, id).run();
    return json({ ok: true });
  });

  r.post('/api/presupuestos/:id/convertir', async (ctx: Ctx) => {
    const id = Number(ctx.params.id);
    const p = (await ctx.env.DB.prepare('SELECT * FROM presupuestos WHERE id = ?').bind(id).first()) as any;
    if (!p) return error('Presupuesto no encontrado', 404);
    const items = (await ctx.env.DB.prepare(
      'SELECT * FROM presupuesto_items WHERE presupuesto_id = ?'
    ).bind(id).all()) as any;

    const numero = await nextNumero(ctx.env, 'orden_next');
    const ordenRes = await ctx.env.DB.prepare(
      `INSERT INTO ordenes_trabajo (numero, cliente_id, vehiculo_id, fecha_ingreso, problema_informado,
               diagnostico, observaciones, mano_obra, repuestos_total, descuento, total, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente')`
    ).bind(numero, p.cliente_id, p.vehiculo_id || null, p.fecha, p.detalle || '',
      p.detalle || '', p.observaciones || '', p.mano_obra, p.repuestos_total, p.descuento, p.total).run();
    const ordenId = Number(ordenRes.meta.last_row_id);

    const batch: ReturnType<D1Database['prepare']>[] = [];
    for (const it of items.results) {
      batch.push(ctx.env.DB.prepare(
        `INSERT INTO orden_items (orden_id, tipo, descripcion, producto_id, cantidad, precio_unitario, importe)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(ordenId, it.tipo, it.descripcion, it.producto_id, it.cantidad, it.precio_unitario, it.importe));
    }
    if (batch.length) await ctx.env.DB.batch(batch);

    for (const it of items.results) {
      if (it.tipo === 'repuesto' && it.producto_id && +it.cantidad > 0) {
        const prod = (await ctx.env.DB.prepare('SELECT stock FROM productos WHERE id = ?').bind(it.producto_id).first()) as any;
        if (prod) {
          const nuevo = (+prod.stock || 0) - (+it.cantidad);
          await ctx.env.DB.prepare(
            'UPDATE productos SET stock = ?, updated_at = datetime(\'now\') WHERE id = ?'
          ).bind(nuevo, it.producto_id).run();
          await ctx.env.DB.prepare(
            'INSERT INTO movimientos_stock (producto_id, tipo, cantidad, motivo, referencia) VALUES (?, \'salida\', ?, ?, ?)'
          ).bind(it.producto_id, it.cantidad, 'Presupuesto aprobado convertido en orden', `Orden #${numero}`).run();
        }
      }
    }

    await ctx.env.DB.prepare(
      'UPDATE presupuestos SET estado = \'Aprobado\', updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(id).run();

    return json({ orden_id: ordenId });
  });

  r.del('/api/presupuestos/:id', async (ctx: Ctx) => {
    await ctx.env.DB.prepare('DELETE FROM presupuestos WHERE id = ?').bind(ctx.params.id).run();
    return json({ ok: true });
  });
}
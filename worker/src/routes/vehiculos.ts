import type { Ctx } from '../types';
import { error, json } from '../util';

const FIELDS = ['cliente_id', 'patente', 'marca', 'modelo', 'anio', 'version', 'combustible', 'color'];

export function registerVehiculos(r: any): void {
  r.get('/api/vehiculos', async (ctx: Ctx) => {
    const q = ctx.url.searchParams.get('q') || '';
    const clienteId = ctx.url.searchParams.get('cliente_id');
    let sql = `SELECT v.id, v.cliente_id, v.patente, v.marca, v.modelo, v.anio, v.version, v.kilometraje,
                      v.combustible, v.color, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido
               FROM vehiculos v LEFT JOIN clientes c ON c.id = v.cliente_id`;
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (clienteId) {
      where.push('v.cliente_id = ?');
      params.push(Number(clienteId));
    }
    if (q) {
      where.push('(v.patente LIKE ? OR v.marca LIKE ? OR v.modelo LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY v.marca, v.modelo';
    const res = await ctx.env.DB.prepare(sql).bind(...params).all();
    return json({ vehiculos: res.results });
  });

  r.get('/api/vehiculos/all', async (ctx: Ctx) => {
    const res = await ctx.env.DB.prepare(
      `SELECT v.id, v.patente, v.marca, v.modelo, v.cliente_id, c.nombre || ' ' || c.apellido AS cliente
       FROM vehiculos v LEFT JOIN clientes c ON c.id = v.cliente_id ORDER BY v.marca, v.modelo`
    ).all();
    return json({ vehiculos: res.results });
  });

  r.get('/api/vehiculos/:id', async (ctx: Ctx) => {
    const id = ctx.params.id;
    const vehiculo = await ctx.env.DB.prepare('SELECT * FROM vehiculos WHERE id = ?').bind(id).first();
    if (!vehiculo) return error('Vehículo no encontrado', 404);
    const cliente = await ctx.env.DB.prepare('SELECT * FROM clientes WHERE id = ?').bind(vehiculo.cliente_id).first();
    const historial = await ctx.env.DB.prepare(
      `SELECT 'orden' AS tipo, o.id, o.fecha_ingreso AS fecha, o.kilometraje, o.trabajo_realizado AS detalle,
              o.total, o.estado,
              (SELECT GROUP_CONCAT(oi.descripcion, ' | ') FROM orden_items oi WHERE oi.orden_id = o.id) AS repuestos
       FROM ordenes_trabajo o WHERE o.vehiculo_id = ?
       UNION ALL
       SELECT 'presupuesto', p.id, p.fecha, 0, p.detalle, p.total, p.estado, '' FROM presupuestos p WHERE p.vehiculo_id = ?
       UNION ALL
       SELECT 'comprobante', co.id, co.fecha, 0, co.trabajos, co.total, 'Comprobante', '' FROM comprobantes co WHERE co.vehiculo_id = ?
       ORDER BY fecha DESC`
    ).bind(id, id, id).all();
    return json({ vehiculo, cliente, historial: historial.results });
  });

  r.post('/api/vehiculos', async (ctx: Ctx) => {
    const b = ctx.body || {};
    const clienteId = parseInt(b.cliente_id, 10);
    if (!clienteId) return error('Debe seleccionar un cliente');
    const res = await ctx.env.DB.prepare(
      `INSERT INTO vehiculos (cliente_id, patente, marca, modelo, anio, version, kilometraje, combustible, color, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(clienteId, b.patente || '', b.marca || '', b.modelo || '', b.anio || '', b.version || '',
      parseInt(b.kilometraje, 10) || 0, b.combustible || '', b.color || '', b.observaciones || '').run();
    const row = await ctx.env.DB.prepare('SELECT * FROM vehiculos WHERE id = ?').bind(res.meta.last_row_id).first();
    return json({ vehiculo: row });
  });

  r.put('/api/vehiculos/:id', async (ctx: Ctx) => {
    const id = ctx.params.id;
    const b = ctx.body || {};
    const clienteId = parseInt(b.cliente_id, 10);
    if (!clienteId) return error('Debe seleccionar un cliente');
    const sets = FIELDS.map((f) => `${f} = ?`).join(', ');
    await ctx.env.DB.prepare(
      `UPDATE vehiculos SET ${sets}, kilometraje = ?, observaciones = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(clienteId, b.patente || '', b.marca || '', b.modelo || '', b.anio || '', b.version || '',
      b.combustible || '', b.color || '', parseInt(b.kilometraje, 10) || 0, b.observaciones || '', id).run();
    const row = await ctx.env.DB.prepare('SELECT * FROM vehiculos WHERE id = ?').bind(id).first();
    return json({ vehiculo: row });
  });

  r.del('/api/vehiculos/:id', async (ctx: Ctx) => {
    await ctx.env.DB.prepare('DELETE FROM vehiculos WHERE id = ?').bind(ctx.params.id).run();
    return json({ ok: true });
  });
}
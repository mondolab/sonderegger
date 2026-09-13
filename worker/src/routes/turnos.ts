import type { Ctx } from '../types';
import { error, json } from '../util';

const FIELDS = ['cliente_id', 'vehiculo_id', 'fecha', 'hora', 'motivo', 'observaciones', 'estado'];

export function registerTurnos(r: any): void {
  r.get('/api/turnos', async (ctx: Ctx) => {
    const fecha = ctx.url.searchParams.get('fecha');
    const desde = ctx.url.searchParams.get('desde');
    const hasta = ctx.url.searchParams.get('hasta');
    const estado = ctx.url.searchParams.get('estado');

    let sql = `SELECT t.id, t.cliente_id, t.vehiculo_id, t.fecha, t.hora, t.motivo, t.observaciones, t.estado,
                      c.nombre AS cliente_nombre, c.apellido AS cliente_apellido, c.whatsapp,
                      v.patente, v.marca, v.modelo
               FROM turnos t
               LEFT JOIN clientes c ON c.id = t.cliente_id
               LEFT JOIN vehiculos v ON v.id = t.vehiculo_id`;
    const where: string[] = [];
    const params: string[] = [];

    if (desde) {
      where.push('t.fecha >= ?');
      params.push(desde);
    }
    if (hasta) {
      where.push('t.fecha <= ?');
      params.push(hasta);
    }
    if (fecha) {
      where.push('t.fecha = ?');
      params.push(fecha);
    }
    if (estado) {
      where.push('t.estado = ?');
      params.push(estado);
    }

    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY t.fecha, t.hora';

    const res = await ctx.env.DB.prepare(sql).bind(...params).all();
    return json({ turnos: res.results });
  });

  r.get('/api/turnos/:id', async (ctx: Ctx) => {
    const row = await ctx.env.DB.prepare(
      `SELECT t.*, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido, c.whatsapp,
              v.patente, v.marca, v.modelo
       FROM turnos t
       LEFT JOIN clientes c ON c.id = t.cliente_id
       LEFT JOIN vehiculos v ON v.id = t.vehiculo_id
       WHERE t.id = ?`
    ).bind(ctx.params.id).first();
    if (!row) return error('Turno no encontrado', 404);
    return json({ turno: row });
  });

  r.post('/api/turnos', async (ctx: Ctx) => {
    const b = ctx.body || {};
    const clienteId = parseInt(b.cliente_id, 10);
    if (!clienteId) return error('Debe seleccionar un cliente');
    if (!b.fecha) return error('Debe indicar la fecha');
    const res = await ctx.env.DB.prepare(
      `INSERT INTO turnos (cliente_id, vehiculo_id, fecha, hora, motivo, observaciones, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(clienteId, parseInt(b.vehiculo_id, 10) || null, b.fecha,
      b.hora || '', b.motivo || '', b.observaciones || '', b.estado || 'Pendiente').run();
    const row = await ctx.env.DB.prepare('SELECT * FROM turnos WHERE id = ?').bind(res.meta.last_row_id).first();
    return json({ turno: row });
  });

  r.put('/api/turnos/:id', async (ctx: Ctx) => {
    const id = ctx.params.id;
    const b = ctx.body || {};
    if (!b.fecha) return error('Debe indicar la fecha');
    const sets = FIELDS.map((f) => `${f} = ?`).join(', ');
    await ctx.env.DB.prepare(
      `UPDATE turnos SET ${sets}, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      parseInt(b.cliente_id, 10) || null, parseInt(b.vehiculo_id, 10) || null, b.fecha,
      b.hora || '', b.motivo || '', b.observaciones || '', b.estado || 'Pendiente', id
    ).run();
    const row = await ctx.env.DB.prepare('SELECT * FROM turnos WHERE id = ?').bind(id).first();
    return json({ turno: row });
  });

  r.del('/api/turnos/:id', async (ctx: Ctx) => {
    await ctx.env.DB.prepare('DELETE FROM turnos WHERE id = ?').bind(ctx.params.id).run();
    return json({ ok: true });
  });
}
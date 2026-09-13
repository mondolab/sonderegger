import type { Ctx } from '../types';
import { error, json } from '../util';

const FIELDS = ['nombre', 'apellido', 'telefono', 'whatsapp', 'email', 'direccion', 'observaciones'];

export function registerClientes(r: any): void {
  r.get('/api/clientes', async (ctx: Ctx) => {
    const q = ctx.url.searchParams.get('q') || '';
    const limit = Math.min(parseInt(ctx.url.searchParams.get('limit') || '200', 10), 500);
    const like = `%${q}%`;
    const res = await ctx.env.DB.prepare(
      `SELECT c.id, c.nombre, c.apellido, c.telefono, c.whatsapp, c.email, c.direccion, c.observaciones,
              (SELECT COUNT(*) FROM vehiculos v WHERE v.cliente_id = c.id) AS total_vehiculos
       FROM clientes c
       WHERE (? = '' OR c.nombre LIKE ? OR c.apellido LIKE ? OR c.telefono LIKE ?)
       ORDER BY c.nombre, c.apellido
       LIMIT ?`
    ).bind(q, like, like, like, limit).all();
    return json({ clientes: res.results });
  });

  r.get('/api/clientes/:id', async (ctx: Ctx) => {
    const id = ctx.params.id;
    const cliente = await ctx.env.DB.prepare('SELECT * FROM clientes WHERE id = ?').bind(id).first();
    if (!cliente) return error('Cliente no encontrado', 404);
    const vehiculos = await ctx.env.DB.prepare(
      'SELECT id, patente, marca, modelo, anio, version, kilometraje, color FROM vehiculos WHERE cliente_id = ? ORDER BY id DESC'
    ).bind(id).all();
    return json({ cliente, vehiculos: vehiculos.results });
  });

  r.post('/api/clientes', async (ctx: Ctx) => {
    const b = ctx.body || {};
    const nombre = String(b.nombre || '').trim();
    if (!nombre) return error('El nombre es obligatorio');
    const res = await ctx.env.DB.prepare(
      `INSERT INTO clientes (nombre, apellido, telefono, whatsapp, email, direccion, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(nombre, b.apellido || '', b.telefono || '', b.whatsapp || '', b.email || '',
      b.direccion || '', b.observaciones || '').run();
    const row = await ctx.env.DB.prepare('SELECT * FROM clientes WHERE id = ?').bind(res.meta.last_row_id).first();
    return json({ cliente: row });
  });

  r.put('/api/clientes/:id', async (ctx: Ctx) => {
    const id = ctx.params.id;
    const b = ctx.body || {};
    const nombre = String(b.nombre || '').trim();
    if (!nombre) return error('El nombre es obligatorio');
    const sets = FIELDS.map((f) => `${f} = ?`).join(', ');
    await ctx.env.DB.prepare(
      `UPDATE clientes SET ${sets}, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      nombre, b.apellido || '', b.telefono || '', b.whatsapp || '', b.email || '',
      b.direccion || '', b.observaciones || '', id
    ).run();
    const row = await ctx.env.DB.prepare('SELECT * FROM clientes WHERE id = ?').bind(id).first();
    return json({ cliente: row });
  });

  r.del('/api/clientes/:id', async (ctx: Ctx) => {
    await ctx.env.DB.prepare('DELETE FROM clientes WHERE id = ?').bind(ctx.params.id).run();
    return json({ ok: true });
  });
}
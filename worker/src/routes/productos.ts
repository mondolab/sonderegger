import type { Ctx } from '../types';
import { error, json, round2 } from '../util';

const FIELDS = ['nombre', 'categoria', 'marca', 'codigo', 'proveedor', 'costo', 'precio',
  'stock', 'stock_minimo', 'unidad', 'ubicacion', 'observaciones'];

export function registerProductos(r: any): void {
  r.get('/api/productos', async (ctx: Ctx) => {
    const q = ctx.url.searchParams.get('q') || '';
    const stockBajo = ctx.url.searchParams.get('stock_bajo') === '1';
    const categoria = ctx.url.searchParams.get('categoria');
    const limit = Math.min(parseInt(ctx.url.searchParams.get('limit') || '300', 10), 500);

    let sql = `SELECT p.* FROM productos p`;
    const where: string[] = [];
    const params: (string | number)[] = [];
    if (categoria) {
      where.push('p.categoria = ?');
      params.push(categoria);
    }
    if (q) {
      where.push('(p.nombre LIKE ? OR p.marca LIKE ? OR p.codigo LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    if (stockBajo) {
      where.push('p.stock <= p.stock_minimo');
    }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY p.nombre LIMIT ?';
    params.push(limit);

    const res = await ctx.env.DB.prepare(sql).bind(...params).all();
    return json({ productos: res.results });
  });

  r.get('/api/productos/categorias', async (ctx: Ctx) => {
    const res = await ctx.env.DB.prepare(
      'SELECT DISTINCT categoria FROM productos WHERE categoria != \'\' ORDER BY categoria'
    ).all();
    return json({ categorias: res.results.map((x: any) => x.categoria) });
  });

  r.post('/api/productos', async (ctx: Ctx) => {
    const b = ctx.body || {};
    const nombre = String(b.nombre || '').trim();
    if (!nombre) return error('El nombre del producto es obligatorio');
    const res = await ctx.env.DB.prepare(
      `INSERT INTO productos (nombre, categoria, marca, codigo, proveedor, costo, precio, stock, stock_minimo, unidad, ubicacion, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(nombre, b.categoria || '', b.marca || '', b.codigo || '', b.proveedor || '',
      round2(b.costo), round2(b.precio), round2(b.stock), round2(b.stock_minimo),
      b.unidad || 'unidad', b.ubicacion || '', b.observaciones || '').run();
    const row = await ctx.env.DB.prepare('SELECT * FROM productos WHERE id = ?').bind(res.meta.last_row_id).first();
    return json({ producto: row });
  });

  r.put('/api/productos/:id', async (ctx: Ctx) => {
    const id = Number(ctx.params.id);
    const b = ctx.body || {};
    const sets = FIELDS.map((f) => `${f} = ?`).join(', ');
    await ctx.env.DB.prepare(
      `UPDATE productos SET ${sets}, updated_at = datetime('now') WHERE id = ?`
    ).bind(String(b.nombre || '').trim(), b.categoria || '', b.marca || '', b.codigo || '', b.proveedor || '',
      round2(b.costo), round2(b.precio), round2(b.stock), round2(b.stock_minimo),
      b.unidad || 'unidad', b.ubicacion || '', b.observaciones || '', id).run();
    const row = await ctx.env.DB.prepare('SELECT * FROM productos WHERE id = ?').bind(id).first();
    return json({ producto: row });
  });

  r.del('/api/productos/:id', async (ctx: Ctx) => {
    const id = Number(ctx.params.id);
    const enUso = await ctx.env.DB.prepare(
      `SELECT COUNT(*) AS n FROM orden_items oi
       JOIN ordenes_trabajo o ON o.id = oi.orden_id
       WHERE oi.producto_id = ? AND o.estado NOT IN ('Entregado', 'Facturado', 'Cancelado')`
    ).bind(id).first();
    if (+((enUso as any)?.n || 0) > 0) {
      return error('No se puede eliminar: está asignado a una orden de trabajo activa.');
    }
    await ctx.env.DB.prepare('DELETE FROM productos WHERE id = ?').bind(id).run();
    return json({ ok: true });
  });

  r.post('/api/productos/:id/movimientos', async (ctx: Ctx) => {
    const id = Number(ctx.params.id);
    const b = ctx.body || {};
    const tipo = b.tipo === 'ingreso' ? 'ingreso' : 'salida';
    const cantidad = round2(b.cantidad);
    if (!cantidad || cantidad <= 0) return error('La cantidad debe ser mayor a cero');
    const prod = (await ctx.env.DB.prepare('SELECT stock FROM productos WHERE id = ?').bind(id).first()) as any;
    if (!prod) return error('Producto no encontrado', 404);

    const nuevo = +prod.stock + (tipo === 'ingreso' ? cantidad : -cantidad);
    await ctx.env.DB.prepare(
      'UPDATE productos SET stock = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(nuevo, id).run();
    await ctx.env.DB.prepare(
      'INSERT INTO movimientos_stock (producto_id, tipo, cantidad, motivo, referencia) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, tipo, cantidad, b.motivo || '', b.referencia || '').run();
    return json({ producto: { ...prod, stock: nuevo } });
  });

  r.get('/api/productos/:id/movimientos', async (ctx: Ctx) => {
    const res = await ctx.env.DB.prepare(
      'SELECT * FROM movimientos_stock WHERE producto_id = ? ORDER BY id DESC LIMIT 50'
    ).bind(ctx.params.id).all();
    return json({ movimientos: res.results });
  });
}
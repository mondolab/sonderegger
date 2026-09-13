import type { Ctx } from '../types';
import { error, json, getConfig, setConfig } from '../util';

export function registerCaja(r: any): void {
  r.get('/api/caja', async (ctx: Ctx) => {
    const fecha = ctx.url.searchParams.get('fecha');
    let sql = 'SELECT * FROM movimientos_caja';
    const params: string[] = [];
    if (fecha) {
      sql += ' WHERE fecha = ?';
      params.push(fecha);
    }
    sql += ' ORDER BY id DESC LIMIT 500';
    const res = await ctx.env.DB.prepare(sql).bind(...params).all();
    return json({ movimientos: res.results });
  });

  r.get('/api/caja/estado', async (ctx: Ctx) => {
    const abierta = await getConfig(ctx.env, 'caja_abierta');
    const desde = await getConfig(ctx.env, 'caja_abierta_desde');
    return json({ abierta: abierta === '1', desde });
  });

  r.get('/api/caja/resumen', async (ctx: Ctx) => {
    const fecha = ctx.url.searchParams.get('fecha') || '';
    const ingresos = await ctx.env.DB.prepare(
      'SELECT COALESCE(SUM(importe), 0) AS total FROM movimientos_caja WHERE fecha = ? AND tipo = \'ingreso\''
    ).bind(fecha).first();
    const egresos = await ctx.env.DB.prepare(
      'SELECT COALESCE(SUM(importe), 0) AS total FROM movimientos_caja WHERE fecha = ? AND tipo = \'egreso\''
    ).bind(fecha).first();
    const saldo = (+(ingresos as any)?.total || 0) - (+(egresos as any)?.total || 0);
    return json({ ingresos: (ingresos as any)?.total || 0, egresos: (egresos as any)?.total || 0, saldo });
  });

  r.post('/api/caja/movimientos', async (ctx: Ctx) => {
    const b = ctx.body || {};
    const importe = parseFloat(b.importe);
    if (!importe || importe <= 0) return error('El importe debe ser mayor a cero');
    if (!b.concepto) return error('El concepto es obligatorio');
    await ctx.env.DB.prepare(
      `INSERT INTO movimientos_caja (fecha, tipo, categoria, concepto, importe, metodo_pago, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(b.fecha || '', b.tipo === 'egreso' ? 'egreso' : 'ingreso', b.categoria || 'otros',
      b.concepto, importe, b.metodo_pago || '', b.observaciones || '').run();
    return json({ ok: true });
  });

  r.post('/api/caja/abrir', async (ctx: Ctx) => {
    const ya = await getConfig(ctx.env, 'caja_abierta');
    if (ya === '1') return error('La caja ya está abierta');
    const b = ctx.body || {};
    await setConfig(ctx.env, 'caja_abierta', '1');
    await setConfig(ctx.env, 'caja_abierta_desde', new Date().toISOString());
    const monto = parseFloat(b.monto_inicial);
    if (monto && monto > 0) {
      await ctx.env.DB.prepare(
        `INSERT INTO movimientos_caja (fecha, tipo, categoria, concepto, importe, metodo_pago)
         VALUES (?, 'ingreso', 'otros', 'Apertura de caja', ?, 'Efectivo')`
      ).bind(b.fecha || '', monto).run();
    }
    return json({ ok: true });
  });

  r.post('/api/caja/cerrar', async (ctx: Ctx) => {
    await setConfig(ctx.env, 'caja_abierta', '0');
    await setConfig(ctx.env, 'caja_abierta_desde', '');
    return json({ ok: true });
  });
}
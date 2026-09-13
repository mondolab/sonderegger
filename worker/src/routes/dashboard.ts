import type { Ctx } from '../types';
import { json } from '../util';

export function registerDashboard(r: any): void {
  r.get('/api/dashboard', async (ctx: Ctx) => {
    const fecha = ctx.url.searchParams.get('fecha');

    const results = await ctx.env.DB.batch([
        ctx.env.DB.prepare(
          'SELECT COUNT(*) AS n FROM turnos WHERE fecha = ? AND estado != \'Cancelado\''
        ).bind(fecha),
        ctx.env.DB.prepare(
          `SELECT COUNT(*) AS n, COALESCE(SUM(total), 0) AS importe FROM ordenes_trabajo
           WHERE estado IN ('En diagnóstico', 'Esperando repuestos', 'En reparación')`
        ),
        ctx.env.DB.prepare(
          `SELECT COUNT(*) AS n FROM ordenes_trabajo WHERE estado NOT IN ('Entregado', 'Cancelado')`
        ),
        ctx.env.DB.prepare(
          `SELECT COUNT(*) AS n FROM presupuestos WHERE estado IN ('Pendiente', 'Enviado')`
        ),
        ctx.env.DB.prepare(
          `SELECT id, nombre, stock, stock_minimo FROM productos WHERE stock <= stock_minimo ORDER BY stock ASC LIMIT 8`
        ),
        ctx.env.DB.prepare(
          `SELECT t.id, t.hora, t.motivo, t.estado, t.fecha,
                  c.nombre AS cliente_nombre, c.apellido AS cliente_apellido, c.whatsapp,
                  v.marca, v.modelo, v.patente
           FROM turnos t
           LEFT JOIN clientes c ON c.id = t.cliente_id
           LEFT JOIN vehiculos v ON v.id = t.vehiculo_id
           WHERE t.fecha = ? AND t.estado != 'Cancelado'
           ORDER BY t.hora LIMIT 8`
        ).bind(fecha),
        ctx.env.DB.prepare(
          `SELECT
             COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN importe END), 0) AS ingresos,
             COALESCE(SUM(CASE WHEN tipo = 'egreso'  THEN importe END), 0) AS egresos
           FROM movimientos_caja WHERE fecha = ?`
        ).bind(fecha),
      ]);

    const res = results as any[];
    const t = (i: number) => res[i].results as any[];

    return json({
      turnos_hoy: t(0)[0]?.n || 0,
      en_taller: t(1)[0]?.n || 0,
      en_taller_importe: t(1)[0]?.importe || 0,
      trabajos_pendientes: t(2)[0]?.n || 0,
      presupuestos_pendientes: t(3)[0]?.n || 0,
      productos_stock_bajo: t(4),
      proximos_turnos: t(5),
      caja_hoy: {
        ingresos: t(6)[0]?.ingresos || 0,
        egresos: t(6)[0]?.egresos || 0,
        saldo: (t(6)[0]?.ingresos || 0) - (t(6)[0]?.egresos || 0),
      },
    });
  });
}
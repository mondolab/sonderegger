import type { Ctx } from '../types';
import { json } from '../util';

export function registerReportes(r: any): void {
  r.get('/api/reportes', async (ctx: Ctx) => {
    const desde = ctx.url.searchParams.get('desde');
    const hasta = ctx.url.searchParams.get('hasta');

    const res = await ctx.env.DB.batch([
      // Totales de caja por rango
      ctx.env.DB.prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN importe END), 0) AS ingresos,
           COALESCE(SUM(CASE WHEN tipo = 'egreso'  THEN importe END), 0) AS egresos,
           COUNT(*) AS movimientos
         FROM movimientos_caja WHERE fecha >= ? AND fecha <= ?`
      ).bind(desde, hasta),

      // Ingresos por categoría
      ctx.env.DB.prepare(
        `SELECT categoria, COALESCE(SUM(importe), 0) AS total, COUNT(*) AS n
         FROM movimientos_caja WHERE tipo = 'ingreso' AND fecha >= ? AND fecha <= ?
         GROUP BY categoria ORDER BY total DESC`
      ).bind(desde, hasta),

      // Egresos por categoría
      ctx.env.DB.prepare(
        `SELECT categoria, COALESCE(SUM(importe), 0) AS total, COUNT(*) AS n
         FROM movimientos_caja WHERE tipo = 'egreso' AND fecha >= ? AND fecha <= ?
         GROUP BY categoria ORDER BY total DESC`
      ).bind(desde, hasta),

      // Órdenes por estado
      ctx.env.DB.prepare(
        `SELECT estado, COUNT(*) AS n, COALESCE(SUM(total), 0) AS total
         FROM ordenes_trabajo WHERE fecha_ingreso >= ? AND fecha_ingreso <= ?
         GROUP BY estado`
      ).bind(desde, hasta),

      // Trabajos por mes
      ctx.env.DB.prepare(
        `SELECT substr(fecha_ingreso, 1, 7) AS mes, COUNT(*) AS n, COALESCE(SUM(total), 0) AS total
         FROM ordenes_trabajo WHERE fecha_ingreso >= ? AND fecha_ingreso <= ?
         GROUP BY mes ORDER BY mes`
      ).bind(desde, hasta),

      // Repuestos más vendidos
      ctx.env.DB.prepare(
        `SELECT oi.descripcion, p.nombre AS producto, SUM(oi.cantidad) AS cantidad, SUM(oi.importe) AS total
         FROM orden_items oi
         JOIN ordenes_trabajo ot ON ot.id = oi.orden_id
         LEFT JOIN productos p ON p.id = oi.producto_id
         WHERE ot.fecha_ingreso >= ? AND ot.fecha_ingreso <= ?
         GROUP BY oi.descripcion ORDER BY total DESC LIMIT 12`
      ).bind(desde, hasta),

      // Turnos por estado (pendientes/confirmados del rango)
      ctx.env.DB.prepare(
        `SELECT estado, COUNT(*) AS n FROM turnos WHERE fecha >= ? AND fecha <= ?
         GROUP BY estado`
      ).bind(desde, hasta),

      // Clientes con más trabajo
      ctx.env.DB.prepare(
        `SELECT c.nombre, c.apellido, COUNT(ot.id) AS trabajos, COALESCE(SUM(ot.total), 0) AS total
         FROM ordenes_trabajo ot JOIN clientes c ON c.id = ot.cliente_id
         WHERE ot.fecha_ingreso >= ? AND ot.fecha_ingreso <= ?
         GROUP BY c.id ORDER BY total DESC LIMIT 8`
      ).bind(desde, hasta),

      // Métodos de pago de comprobantes
      ctx.env.DB.prepare(
        `SELECT metodo_pago, COUNT(*) AS n, COALESCE(SUM(total), 0) AS total
         FROM comprobantes WHERE fecha >= ? AND fecha <= ?
         GROUP BY metodo_pago ORDER BY total DESC`
      ).bind(desde, hasta),
    ]);

    return json({
      desde,
      hasta,
      caja: res[0].results[0] || {},
      ingresos_categoria: res[1].results,
      egresos_categoria: res[2].results,
      ordenes_estado: res[3].results,
      ordenes_mes: res[4].results,
      repuestos_top: res[5].results,
      turnos_estado: res[6].results,
      clientes_top: res[7].results,
      metodos_pago: res[8].results,
    });
  });
}
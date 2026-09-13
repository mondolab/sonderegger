import type { Ctx } from '../types';
import { json } from '../util';

const EDITABLE_KEYS = [
  'taller_nombre', 'taller_direccion', 'taller_telefono', 'taller_whatsapp', 'taller_email',
  'taller_cuit', 'taller_condicion', 'taller_logo', 'taller_instagram',
  'comprobante_next', 'presupuesto_next', 'orden_next',
];

export function registerConfig(r: any): void {
  r.get('/api/config', async (ctx: Ctx) => {
    const res = await ctx.env.DB.prepare('SELECT clave, valor FROM configuracion').all();
    const config: Record<string, string> = {};
    for (const row of res.results as any[]) {
      config[row.clave] = row.valor;
    }
    return json({ config });
  });

  r.put('/api/config', async (ctx: Ctx) => {
    const b = ctx.body || {};
    if (b.usuario && b.usuario.trim()) {
      await ctx.env.DB.prepare(
        `INSERT INTO configuracion (clave, valor, updated_at) VALUES ('usuario', ?, datetime('now'))
         ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`
      ).bind(String(b.usuario).trim()).run();
    }
    for (const key of EDITABLE_KEYS) {
      if (key in b) {
        await ctx.env.DB.prepare(
          `INSERT INTO configuracion (clave, valor, updated_at) VALUES (?, ?, datetime('now'))
           ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`
        ).bind(key, String(b[key] ?? '')).run();
      }
    }
    return json({ ok: true });
  });
}
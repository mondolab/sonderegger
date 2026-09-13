import type { Ctx } from './types';

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export function error(message: string, status = 400): Response {
  return json({ error: message }, status);
}

export function round2(n: number | string): number {
  return Math.round((+n || 0) * 100) / 100;
}

export function localToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function requireAuth(ctx: Ctx): Promise<boolean> {
  const cookie = ctx.req.headers.get('cookie') || '';
  const m = cookie.match(/(?:^|;\s*)msession=([^;]+)/);
  if (!m) return false;
  const token = decodeURIComponent(m[1]);
  const row = await ctx.env.DB.prepare(
    'SELECT token FROM sessions WHERE token = ? AND expires_at > datetime(\'now\')'
  ).bind(token).first();
  return !!row;
}

export async function getConfig(env: any, clave: string): Promise<string | null> {
  const row = await env.DB.prepare('SELECT valor FROM configuracion WHERE clave = ?').bind(clave).first();
  return row?.valor ?? null;
}

export async function setConfig(env: any, clave: string, valor: string | number): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO configuracion (clave, valor, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, updated_at = datetime('now')`
  ).bind(clave, String(valor)).run();
}

export async function nextNumero(env: any, clave: string): Promise<number> {
  const row = await env.DB.prepare('SELECT valor FROM configuracion WHERE clave = ?').bind(clave).first();
  let n = 1;
  if (row) {
    n = parseInt(row.valor, 10) || 1;
    await env.DB.prepare('UPDATE configuracion SET valor = ?, updated_at = datetime(\'now\') WHERE clave = ?')
      .bind(String(n + 1), clave).run();
  } else {
    await env.DB.prepare('INSERT INTO configuracion (clave, valor) VALUES (?, ?)').bind(clave, '2').run();
  }
  return n;
}

export function addCorsHeaders(res: Response, env: any): Response {
  const origin = env.CORS_ORIGIN;
  if (origin) {
    const headers = new Headers(res.headers);
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  }
  return res;
}
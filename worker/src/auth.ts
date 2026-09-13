import type { Ctx, Env } from './types';
import { error, json } from './util';

const iterations = 100000;
const enc = new TextEncoder();

function b64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function unb64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    256
  );
  return `pbkdf2_sha256$${iterations}$${b64(salt)}$${b64(new Uint8Array(bits))}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split('$');
  if (parts.length !== 4) return false;
  const iter = parseInt(parts[1], 10);
  try {
    const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: unb64(parts[2]), iterations: iter },
      key,
      256
    );
    return b64(new Uint8Array(bits)) === parts[3];
  } catch {
    return false;
  }
}

function randToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

async function createSession(env: Env): Promise<string> {
  const token = randToken();
  await env.DB.prepare(
    'INSERT INTO sessions (token, expires_at) VALUES (?, datetime(\'now\', \'+30 days\'))'
  ).bind(token).run();
  return token;
}

function authResponse(token: string, secure: boolean): Response {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  headers.append(
    'Set-Cookie',
    `msession=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure ? '; Secure' : ''}`
  );
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

function clearCookieResponse(): Response {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  headers.append('Set-Cookie', 'msession=; Path=/; HttpOnly; Max-Age=0');
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

export function registerAuth(r: any): void {
  r.get('/api/auth/status', async (ctx: Ctx) => {
    const row = await ctx.env.DB.prepare(
      'SELECT valor FROM configuracion WHERE clave = \'password_hash\''
    ).first();
    const configured = !!row && !!row.valor;
    const user = await ctx.env.DB.prepare(
      'SELECT valor FROM configuracion WHERE clave = \'usuario\''
    ).first();
    return json({ configured, usuario: user?.valor || 'sonderegger' });
  });

  r.post('/api/auth/setup', async (ctx: Ctx) => {
    const existing = await ctx.env.DB.prepare(
      'SELECT valor FROM configuracion WHERE clave = \'password_hash\' AND valor != \'\''
    ).first();
    if (existing) return error('La configuración ya fue realizada', 400);

    const { usuario, password } = ctx.body || {};
    if (!usuario || !password) return error('Faltan datos (usuario y contraseña)', 400);
    if (password.length < 6) return error('La contraseña debe tener al menos 6 caracteres', 400);

    const hash = await hashPassword(password);
    await ctx.env.DB.batch([
      ctx.env.DB.prepare(
        `INSERT INTO configuracion (clave, valor, updated_at) VALUES ('usuario', ?, datetime('now'))
         ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`
      ).bind(usuario),
      ctx.env.DB.prepare(
        `INSERT INTO configuracion (clave, valor, updated_at) VALUES ('password_hash', ?, datetime('now'))
         ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`
      ).bind(hash),
    ]);
    const token = await createSession(ctx.env);
    return authResponse(token, ctx.url.protocol === 'https:');
  });

  r.post('/api/auth/login', async (ctx: Ctx) => {
    await ctx.env.DB.prepare('DELETE FROM sessions WHERE expires_at <= datetime(\'now\')').run();
    const { usuario, password } = ctx.body || {};
    const uRow = await ctx.env.DB.prepare('SELECT valor FROM configuracion WHERE clave = \'usuario\'').first();
    const hRow = await ctx.env.DB.prepare('SELECT valor FROM configuracion WHERE clave = \'password_hash\'').first();
    if (!uRow || !hRow || !hRow.valor) return error('Sistema no configurado', 400);
    if ((uRow as any).valor !== usuario) return error('Usuario o contraseña incorrectos', 401);
    const ok = await verifyPassword(password, (hRow as any).valor);
    if (!ok) return error('Usuario o contraseña incorrectos', 401);
    const token = await createSession(ctx.env);
    return authResponse(token, ctx.url.protocol === 'https:');
  });

  r.post('/api/auth/logout', async (ctx: Ctx) => {
    const cookie = ctx.req.headers.get('cookie') || '';
    const m = cookie.match(/(?:^|;\s*)msession=([^;]+)/);
    if (m) {
      await ctx.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(decodeURIComponent(m[1])).run();
    }
    return clearCookieResponse();
  });

  r.get('/api/auth/me', async (ctx: Ctx) => {
    const cookie = ctx.req.headers.get('cookie') || '';
    const m = cookie.match(/(?:^|;\s*)msession=([^;]+)/);
    if (!m) return json({ usuario: null });
    const row = await ctx.env.DB.prepare(
      'SELECT token FROM sessions WHERE token = ? AND expires_at > datetime(\'now\')'
    ).bind(decodeURIComponent(m[1])).first();
    if (!row) return json({ usuario: null });
    const uRow = await ctx.env.DB.prepare('SELECT valor FROM configuracion WHERE clave = \'usuario\'').first();
    return json({ usuario: String((uRow as any)?.valor ?? 'sonderegger') });
  });

  r.post('/api/auth/password', async (ctx: Ctx) => {
    const { actual, nueva } = ctx.body || {};
    const hRow = (await ctx.env.DB.prepare('SELECT valor FROM configuracion WHERE clave = \'password_hash\'').first()) as any;
    const ok = await verifyPassword(actual || '', hRow?.valor || '');
    if (!ok) return error('La contraseña actual es incorrecta', 400);
    if (!nueva || nueva.length < 6) return error('La nueva contraseña debe tener al menos 6 caracteres', 400);
    const hash = await hashPassword(nueva);
    await ctx.env.DB.prepare(
      `INSERT INTO configuracion (clave, valor, updated_at) VALUES ('password_hash', ?, datetime('now'))
       ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`
    ).bind(hash).run();
    return json({ ok: true });
  });
}
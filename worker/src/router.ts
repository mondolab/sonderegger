import type { Ctx, Env, RouteHandler } from './types';

interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: RouteHandler;
}

export class Router {
  private routes: Route[] = [];

  add(method: string, path: string, handler: RouteHandler): void {
    const parts = path.split('/').filter(Boolean);
    const keys: string[] = [];
    const regexParts = parts.map((p) => {
      if (p.startsWith(':')) {
        keys.push(p.slice(1));
        return '([^/]+)';
      }
      return p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });
    this.routes.push({
      method: method.toUpperCase(),
      pattern: new RegExp(`^/${regexParts.join('/')}/?$`),
      keys,
      handler,
    });
  }

  get = (path: string, h: RouteHandler) => this.add('GET', path, h);
  post = (path: string, h: RouteHandler) => this.add('POST', path, h);
  put = (path: string, h: RouteHandler) => this.add('PUT', path, h);
  del = (path: string, h: RouteHandler) => this.add('DELETE', path, h);

  async handle(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    for (const r of this.routes) {
      if (r.method !== req.method) continue;
      const m = url.pathname.match(r.pattern);
      if (!m) continue;

      const params: Record<string, string> = {};
      r.keys.forEach((k, i) => {
        params[k] = decodeURIComponent(m[i + 1] ?? '');
      });

      let body: any = null;
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        const ct = req.headers.get('content-type') || '';
        body = ct.includes('application/json')
          ? await req.json().catch(() => null)
          : await req.text().catch(() => '');
      }

      return r.handler({ req, url, env, params, body });
    }

    return new Response(JSON.stringify({ error: 'Ruta no encontrada' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
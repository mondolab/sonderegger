import { Router } from './router';
import type { Env } from './types';
import { addCorsHeaders, error, json, requireAuth } from './util';
import { registerAuth } from './auth';
import { registerClientes } from './routes/clientes';
import { registerVehiculos } from './routes/vehiculos';
import { registerTurnos } from './routes/turnos';
import { registerOrdenes } from './routes/ordenes';
import { registerPresupuestos } from './routes/presupuestos';
import { registerComprobantes } from './routes/comprobantes';
import { registerProductos } from './routes/productos';
import { registerCaja } from './routes/caja';
import { registerDashboard } from './routes/dashboard';
import { registerReportes } from './routes/reportes';
import { registerConfig } from './routes/config';

const PUBLIC_PATHS = ['/api/auth/status', '/api/auth/setup', '/api/auth/login'];
const OPTIONS_RE = /^\/api\//;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response('ok', { status: 204 });
    }

    if (!OPTIONS_RE.test(url.pathname)) {
      // El worker sirve también el sitio: todo lo que no es /api/*
      // se resuelve contra los assets estáticos (frontend/dist).
      if (env.ASSETS) return env.ASSETS.fetch(request);
      return json({ error: 'API no encontrada' }, 404);
    }

    if (!PUBLIC_PATHS.includes(url.pathname)) {
      const fakeCtx = { req: request, url, env, params: {}, body: null };
      const authed = await requireAuth(fakeCtx as any);
      if (!authed) {
        return addCorsHeaders(error('No autorizado', 401), env);
      }
    }

    const router = new Router();
    registerAuth(router);
    registerClientes(router);
    registerVehiculos(router);
    registerTurnos(router);
    registerOrdenes(router);
    registerPresupuestos(router);
    registerComprobantes(router);
    registerProductos(router);
    registerCaja(router);
    registerDashboard(router);
    registerReportes(router);
    registerConfig(router);

    const res = await router.handle(request, env);
    return addCorsHeaders(res, env);
  },
} satisfies ExportedHandler<Env>;

export { Router };
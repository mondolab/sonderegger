export interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
  CORS_ORIGIN?: string;
}

export interface Ctx {
  req: Request;
  url: URL;
  env: Env;
  params: Record<string, string>;
  body: any;
}

export type RouteHandler = (ctx: Ctx) => Promise<Response> | Response;
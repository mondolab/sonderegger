# MECÁNICA SONDERGGER

Sistema de gestión para taller mecánico unipersonal. App web (mobile-first) con React + TypeScript, API en Cloudflare Workers y base de datos D1 (SQLite). Deploy gratuito en Cloudflare Pages.

## Funcionalidades

- **Clientes y vehículos**: fichas con teléfono/WhatsApp (mensaje prefabricado) y historial de trabajos.
- **Turnos**: agenda con estados (Confirmado / En taller / Completado / No asistió).
- **Órdenes de trabajo**: numeración automática, repuestos con control de stock, mano de obra, presupuestos, estados (En taller / Facturado / Entregado / Cancelado).
- **Presupuestos**: numeración automática, conversión a orden de trabajo, vencimiento.
- **Comprobantes**: numeración correlativa, descarga en PDF (con logo y datos del taller), registro automático en caja.
- **Inventario**: productos con categoría, marca, stock mínimo, movimientos de stock (ingresos/salidas).
- **Caja**: apertura/cierre, movimientos (ingresos y egresos), categorías y métodos de pago.
- **Reportes** por rango de fechas: ingresos/egresos por categoría, trabajos por mes, repuestos más vendidos, top clientes.
- **Configuración**: datos del taller (calzan en PDFs), numeración y cambio de contraseña.

La aplicación **no** procesa pagos ni emite facturación fiscal: los comprobantes son internos.

## Estructura

```
sonderegger/
├── frontend/            # React 18 + TypeScript + Vite + jsPDF
│   └── src/
│       ├── components/  # Layout, UI (modales, badges…), iconos SVG
│       ├── lib/         # api, hooks, formatos, tipos, pdf, whatsapp
│       └── pages/       # Dashboard, Clientes, Vehículos, Turnos, Trabajos,
│                        # Presupuestos, Comprobantes, Inventario, Caja,
│                        # Reportes, Configuración, Login
├── worker/              # Cloudflare Worker (API + D1)
│   ├── src/routes/      # un router por dominio: clientes, vehículos, turnos,
│   │                    # ordenes, presupuestos, comprobantes, productos,
│   │                    # caja, dashboard, reportes, config
│   ├── schema.sql       # 14 tablas con índices y claves foráneas
│   ├── seed.sql         # configuración inicial
│   └── scripts/hash-password.mjs
└── package.json         # scripts de conveniencia (root)
```

## Requisitos

- Node.js 18+ y npm
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) (se instala como dependencia)
- Cuenta de Cloudflare (plan gratuito)

## Desarrollo local

```bash
# 1) instalar dependencias
npm install            # en la raíz (concurrently)
npm run install:all    # worker + frontend

# 2) base de datos local
npm run db:local-init  # crea las tablas en el D1 local
npm run db:local-seed  # carga la configuración inicial

# 3) levantar todo junto
npm run dev            # worker en :8787 y frontend en :5173 (con Vite proxy al worker)
```

Abrir `http://localhost:5173`. En el primer acceso se pide **usuario y contraseña** (setup inicial): quedan guardados con hash PBKDF2-SHA256; no hay usuarios por omisión.

## Puesta en producción (Cloudflare Pages + Workers)

La app se sirve desde **un único worker** con assets estáticos: el mismo
dominio atiende el sitio (`/`) y la API (`/api/*`). No hace falta CORS.

1. **Publicar el repositorio en GitHub** (o conecta la carpeta a Cloudflare Pages).
   El proyecto de Pages ya está configurado como *Worker with static assets*:
   - Build command: `npm run build` (compila `frontend/dist`)
   - El config raíz `wrangler.jsonc` define que el worker se llama `sonderegger`,
     usa `main = worker/src/index.ts`, sirve `frontend/dist` como assets y
     expone la base D1 como binding `DB`.
   Cada push redisplega solo.

2. **Crear la base de datos D1** (una sola vez, desde tu máquina):
   ```bash
   cd worker
   npx wrangler login
   npx wrangler d1 create mecanica-sonderegger-db
   ```
   El comando imprime el `database_id`.

3. **Poner el id real en la config**: reemplazar `2b63464f-3f2e-4cdc-9c9e-58eb1d419bf7`
   por el id del paso anterior en:
   - `wrangler.jsonc` (raíz, lo usa el deploy de Pages)
   - `worker/wrangler.toml` (lo usan los scripts locales)

4. **Crear esquema y datos** en la base remota:
   ```bash
   npm run db:init      # schema.sql
   npm run db:seed      # datos del taller (incluye el contacto real)
   ```

5. **Redesplegar** (push a GitHub, o `npm run deploy` desde la raíz).

6. **Primer acceso**: abrí `https://sonderegger.ferfjd32.workers.dev` y creá
   usuario y contraseña en la pantalla de setup.

> El `database_id` de ejemplo evita que el deploy falle, pero mientras no
> reemplaces por el id real (paso 3) la API responde "Error de conexión".

### Notas
- El sitio y la API comparten dominio → la cookie de sesión (`msession`, HttpOnly,
  SameSite=Lax) viaja sin problemas y no hace falta `_redirects` ni CORS.
- `frontend/public/_redirects` se conserva por si más adelante querés volver a la
  arquitectura Pages separada del worker.

## Notas

- El setup inicial (`/api/auth/setup`) solo está disponible mientras `password_hash`
  esté vacío en la configuración.
- Sesiones: cookie `msession` HttpOnly, SameSite=Lax, 30 días.
- Al agregar un repuesto a una orden, el stock se descuenta automáticamente; al
  quitarlo o eliminarlo, se repone. Convertir un presupuesto aprobado también descuenta stock.
- Para rehacer el hash de la contraseña manualmente:
  ```bash
  npm run hash -- "mipassword"
  ```
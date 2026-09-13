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

## Puesta en producción (10 pasos)

1. **Publicar el repositorio en GitHub** (o conecta la carpeta a Cloudflare Pages desde el dashboard).

2. **Crear la base de datos D1** en Cloudflare:
   ```bash
   cd worker
   npm run db:create
   ```
   El comando muestra el `database_id` de la nueva base (`mecanica-sonderegger-db`).

3. **Configurar el `database_id`**: abrir `worker/wrangler.toml` y reemplazar
   `REEMPLAZAR_CON_EL_ID_DE_TU_D1` por el id del paso anterior.

4. **Crear las tablas en la base remota**:
   ```bash
   npm run db:init      # aplica schema.sql
   npm run db:seed      # carga la configuración inicial
   ```

5. **Desplegar la API**:
   ```bash
   npm run deploy
   ```
   Anota la URL que muestra el deploy, por ejemplo
   `https://mecanica-sonderegger-api.<subdominio>.workers.dev`.

6. **Conectar el frontend a la API**: el frontend llama a `/api/*` en su propio dominio
   (misma origin) y Pages redirige `/api/*` al worker mediante `_redirects`, por lo que no
   hace falta CORS. Si preferís apuntar directo a otra origin, compilá con
   `VITE_API_BASE` (ver `frontend/src/lib/api.ts`).

7. **Ajustar `frontend/public/_redirects`**: reemplazar
   `https://mecanica-sonderegger-api.SU_DOMINIO.workers.dev` por la URL real de la API
   (paso 5). Mantener la línea `/* /index.html 200` (fallback para rutas SPA).

8. **Publicar el frontend en Cloudflare Pages**:
   - Build command: `npm run build` (instala y compila el frontend desde la raíz)
   - Output directory: `frontend/dist`
   - O bien conecta el repo a Pages; el script raíz ya prepara las dependencias del frontend.

9. **Crear el usuario inicial**: entrar a la URL del sitio, login → **“Primer acceso”**,
   definir usuario y contraseña.

10. **Revisar que todo funcione** y, si querés un dominio propio, agregalo en Pages y
    ajusta el `_redirects` si el worker cambia de origen.

### Si usás dominios distintos (API y web)

Agregar en `worker/wrangler.toml` el origen permitido y descomentar la sección `[vars]`:
```
[vars]
CORS_ORIGIN = "https://tu-dominio.pages.dev"
```

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
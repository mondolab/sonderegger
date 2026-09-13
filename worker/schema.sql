-- ============================================================
-- ESQUEMA DE BASE DE DATOS - MECÁNICA SONDERGGER
-- Cloudflare D1 (SQLite)
-- Ejecutar: wrangler d1 execute mecanica-sonderegger-db --file=./schema.sql
-- ============================================================

PRAGMA defer_foreign_keys = ON;

-- Configuración del taller (clave / valor)
CREATE TABLE IF NOT EXISTS configuracion (
  clave        TEXT PRIMARY KEY,
  valor        TEXT,
  updated_at   TEXT DEFAULT (datetime('now'))
);

-- Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre        TEXT NOT NULL,
  apellido      TEXT NOT NULL DEFAULT '',
  telefono      TEXT DEFAULT '',
  whatsapp      TEXT DEFAULT '',
  email         TEXT DEFAULT '',
  direccion     TEXT DEFAULT '',
  observaciones TEXT DEFAULT '',
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre, apellido);

-- Vehículos (un cliente puede tener varios)
CREATE TABLE IF NOT EXISTS vehiculos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id    INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  patente       TEXT DEFAULT '',
  marca         TEXT DEFAULT '',
  modelo        TEXT DEFAULT '',
  anio          TEXT DEFAULT '',
  version       TEXT DEFAULT '',
  kilometraje   INTEGER DEFAULT 0,
  combustible   TEXT DEFAULT '',
  color         TEXT DEFAULT '',
  observaciones TEXT DEFAULT '',
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_vehiculos_cliente ON vehiculos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vehiculos_patente ON vehiculos(patente);

-- Turnos
CREATE TABLE IF NOT EXISTS turnos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id    INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  vehiculo_id   INTEGER REFERENCES vehiculos(id) ON DELETE SET NULL,
  fecha         TEXT NOT NULL,
  hora          TEXT DEFAULT '',
  motivo        TEXT DEFAULT '',
  observaciones TEXT DEFAULT '',
  estado        TEXT DEFAULT 'Pendiente',
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_turnos_fecha   ON turnos(fecha);
CREATE INDEX IF NOT EXISTS idx_turnos_cliente ON turnos(cliente_id);

-- Órdenes de trabajo
CREATE TABLE IF NOT EXISTS ordenes_trabajo (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  numero             INTEGER,
  cliente_id         INTEGER NOT NULL REFERENCES clientes(id),
  vehiculo_id        INTEGER REFERENCES vehiculos(id) ON DELETE SET NULL,
  turno_id           INTEGER REFERENCES turnos(id) ON DELETE SET NULL,
  fecha_ingreso      TEXT NOT NULL DEFAULT (date('now')),
  kilometraje        INTEGER DEFAULT 0,
  problema_informado TEXT DEFAULT '',
  diagnostico        TEXT DEFAULT '',
  trabajo_realizado  TEXT DEFAULT '',
  observaciones      TEXT DEFAULT '',
  mano_obra          REAL DEFAULT 0,
  repuestos_total    REAL DEFAULT 0,
  descuento          REAL DEFAULT 0,
  total              REAL DEFAULT 0,
  estado             TEXT DEFAULT 'Pendiente',
  created_at         TEXT DEFAULT (datetime('now')),
  updated_at         TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ordenes_cliente ON ordenes_trabajo(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_vehiculo ON ordenes_trabajo(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_estado  ON ordenes_trabajo(estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_fecha   ON ordenes_trabajo(fecha_ingreso);

-- Productos (inventario). Se crea antes que las tablas de items que lo referencian.
CREATE TABLE IF NOT EXISTS productos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre        TEXT NOT NULL,
  categoria     TEXT DEFAULT '',
  marca         TEXT DEFAULT '',
  codigo        TEXT DEFAULT '',
  proveedor     TEXT DEFAULT '',
  costo         REAL DEFAULT 0,
  precio        REAL DEFAULT 0,
  stock         REAL DEFAULT 0,
  stock_minimo  REAL DEFAULT 0,
  unidad        TEXT DEFAULT 'unidad',
  ubicacion     TEXT DEFAULT '',
  observaciones TEXT DEFAULT '',
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);
CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo);

-- Items de órdenes de trabajo (repuestos con descuento de stock)
CREATE TABLE IF NOT EXISTS orden_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  orden_id       INTEGER NOT NULL REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
  tipo           TEXT NOT NULL DEFAULT 'repuesto',
  descripcion    TEXT NOT NULL,
  producto_id    INTEGER REFERENCES productos(id) ON DELETE SET NULL,
  cantidad       REAL DEFAULT 1,
  precio_unitario REAL DEFAULT 0,
  importe        REAL DEFAULT 0,
  created_at     TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orden_items_orden ON orden_items(orden_id);

-- Movimientos de stock
CREATE TABLE IF NOT EXISTS movimientos_stock (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL,
  cantidad    REAL NOT NULL,
  motivo      TEXT DEFAULT '',
  referencia  TEXT DEFAULT '',
  created_at  TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_movimientos_stock_producto ON movimientos_stock(producto_id);

-- Presupuestos
CREATE TABLE IF NOT EXISTS presupuestos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  numero          INTEGER,
  cliente_id      INTEGER NOT NULL REFERENCES clientes(id),
  vehiculo_id     INTEGER REFERENCES vehiculos(id) ON DELETE SET NULL,
  fecha           TEXT NOT NULL DEFAULT (date('now')),
  vencimiento     TEXT DEFAULT '',
  detalle         TEXT DEFAULT '',
  mano_obra       REAL DEFAULT 0,
  repuestos_total REAL DEFAULT 0,
  descuento       REAL DEFAULT 0,
  total           REAL DEFAULT 0,
  observaciones   TEXT DEFAULT '',
  estado          TEXT DEFAULT 'Pendiente',
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_presupuestos_cliente ON presupuestos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_presupuestos_estado ON presupuestos(estado);

CREATE TABLE IF NOT EXISTS presupuesto_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  presupuesto_id  INTEGER NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
  tipo            TEXT DEFAULT 'repuesto',
  descripcion     TEXT NOT NULL,
  producto_id     INTEGER REFERENCES productos(id) ON DELETE SET NULL,
  cantidad        REAL DEFAULT 1,
  precio_unitario REAL DEFAULT 0,
  importe         REAL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_presupuesto_items_pres ON presupuesto_items(presupuesto_id);

-- Comprobantes internos (recibos del taller)
CREATE TABLE IF NOT EXISTS comprobantes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  numero          INTEGER,
  fecha           TEXT NOT NULL DEFAULT (date('now')),
  cliente_id      INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  vehiculo_id     INTEGER REFERENCES vehiculos(id) ON DELETE SET NULL,
  orden_id        INTEGER REFERENCES ordenes_trabajo(id) ON DELETE SET NULL,
  trabajos        TEXT DEFAULT '',
  mano_obra       REAL DEFAULT 0,
  repuestos_total REAL DEFAULT 0,
  descuento       REAL DEFAULT 0,
  total           REAL DEFAULT 0,
  metodo_pago     TEXT DEFAULT 'Efectivo',
  observaciones   TEXT DEFAULT '',
  created_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comprobantes_fecha ON comprobantes(fecha);
CREATE INDEX IF NOT EXISTS idx_comprobantes_cliente ON comprobantes(cliente_id);

CREATE TABLE IF NOT EXISTS comprobante_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  comprobante_id  INTEGER NOT NULL REFERENCES comprobantes(id) ON DELETE CASCADE,
  descripcion     TEXT NOT NULL,
  cantidad        REAL DEFAULT 1,
  importe         REAL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_comprobante_items ON comprobante_items(comprobante_id);

-- Movimientos de caja
CREATE TABLE IF NOT EXISTS movimientos_caja (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha        TEXT NOT NULL DEFAULT (date('now')),
  tipo         TEXT NOT NULL,
  categoria    TEXT DEFAULT 'otros',
  concepto     TEXT NOT NULL,
  importe      REAL NOT NULL,
  metodo_pago  TEXT DEFAULT '',
  observaciones TEXT DEFAULT '',
  created_at   TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_movimientos_caja_fecha ON movimientos_caja(fecha);

-- Sesiones de acceso (token único del dueño del taller)
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
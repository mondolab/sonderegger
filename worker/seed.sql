-- ============================================================
-- DATOS INICIALES - MECÁNICA SONDERGGER
-- Ejecutar: wrangler d1 execute mecanica-sonderegger-db --file=./seed.sql
--
-- NO incluye la contraseña: la primera vez que entras a la app,
-- la pantalla de Login muestra el "Setup inicial" para crear
-- el usuario y la contraseña maestra.
-- ============================================================

INSERT OR IGNORE INTO configuracion (clave, valor) VALUES
  ('taller_nombre',         'MECÁNICA SONDERGGER'),
  ('taller_direccion',      'Miguel David 1847, Paraná, Entre Ríos'),
  ('taller_telefono',       '343 4577279'),
  ('taller_whatsapp',       '3434577279'),
  ('taller_email',          ''),
  ('taller_cuit',           ''),
  ('taller_condicion',      'Responsable Inscripto'),
  ('taller_logo',           ''),
  ('taller_instagram',      'https://www.instagram.com/mecanicasonderegger/'),
  ('usuario',               'sonderegger'),
  ('password_hash',         ''),
  ('comprobante_next',      '1'),
  ('presupuesto_next',      '1'),
  ('orden_next',            '1'),
  ('tipo_cambio',           ''),
  ('caja_abierta',          '0'),
  ('caja_abierta_desde',    '');

-- Actualiza (sin borrar) datos de contacto si el seed ya se corrió antes.
-- Nunca toca 'password_hash': la contraseña la define el setup inicial.
UPDATE configuracion SET valor =
  CASE clave
    WHEN 'taller_nombre'    THEN 'MECÁNICA SONDERGGER'
    WHEN 'taller_direccion' THEN 'Miguel David 1847, Paraná, Entre Ríos'
    WHEN 'taller_telefono'  THEN '343 4577279'
    WHEN 'taller_whatsapp'  THEN '3434577279'
    WHEN 'taller_instagram' THEN 'https://www.instagram.com/mecanicasonderegger/'
    WHEN 'taller_condicion' THEN 'Responsable Inscripto'
    ELSE valor
  END
WHERE clave IN ('taller_nombre','taller_direccion','taller_telefono','taller_whatsapp','taller_instagram','taller_condicion');

-- ============================================================
-- DATOS DE EJEMPLO (opcional)
-- Borra o descomenta para cargar datos de prueba
-- ============================================================
/*
INSERT INTO clientes (nombre, apellido, telefono, whatsapp, email, direccion, observaciones) VALUES
  ('Juan', 'Pérez', '3515550101', '3515550101', 'juan@mail.com', 'Av. Siempre Viva 123, Córdoba', 'Cliente frecuente'),
  ('Carlos', 'Gómez', '3515550202', '3515550202', '', 'Calle Falsa 456, Córdoba', '');

INSERT INTO vehiculos (cliente_id, patente, marca, modelo, anio, version, kilometraje, combustible, color) VALUES
  (1, 'AB123CD', 'Volkswagen', 'Gol', '2015', '1.6 Trendline', 185430, 'Nafta', 'Gris'),
  (1, 'DE456FG', 'Toyota', 'Hilux', '2019', '4x4 SRX', 98000, 'Diesel', 'Blanca'),
  (2, 'HI789JK', 'Ford', 'Fiesta', '2013', '1.6 Titanium', 142000, 'Nafta', 'Negro');

INSERT INTO productos (nombre, categoria, marca, codigo, proveedor, costo, precio, stock, stock_minimo, unidad, ubicacion) VALUES
  ('Aceite 10W40', 'Lubricantes', 'Elf', 'ACE-10W40', 'Distribuidora X', 3800, 5200, 24, 6, 'litro', 'Estante A1'),
  ('Filtro de aceite', 'Filtros', 'Fram', 'FIL-OIL-GOL', 'Distribuidora X', 2500, 3800, 15, 4, 'unidad', 'Estante B2'),
  ('Filtro de aire', 'Filtros', 'Fram', 'FIL-AIR-GOL', 'Distribuidora X', 3200, 4600, 9, 4, 'unidad', 'Estante B2'),
  ('Bujía', 'Encendido', 'NGK', 'BUJ-NGK-BKR', 'Distribuidora X', 2100, 3400, 30, 8, 'unidad', 'Estante C1'),
  ('Pastillas de freno', 'Frenos', 'Bosch', 'PAS-BOSCH-GOL', 'Distribuidora X', 8500, 11500, 3, 4, 'juego', 'Estante C3'),
  ('Refrigerante', 'Lubricantes', 'Yacco', 'REF-G12', 'Distribuidora X', 2900, 4100, 0, 4, 'litro', 'Estante A2');

INSERT INTO movimientos_caja (fecha, tipo, categoria, concepto, importe, metodo_pago) VALUES
  (date('now'), 'ingreso', 'reparación', 'Cambio de aceite - Gol AB123CD', 85000, 'Efectivo'),
  (date('now'), 'egreso', 'compra de repuestos', 'Compra aceite y filtros', 120000, 'Transferencia');
*/
export interface Cliente {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  whatsapp: string;
  email: string;
  direccion: string;
  observaciones: string;
  total_vehiculos?: number;
}

export interface Vehiculo {
  id: number;
  cliente_id: number;
  patente: string;
  marca: string;
  modelo: string;
  anio: string;
  version: string;
  kilometraje: number;
  combustible: string;
  color: string;
  observaciones: string;
  cliente_nombre?: string;
  cliente_apellido?: string;
  cliente?: string;
}

export interface Turno {
  id: number;
  cliente_id: number;
  vehiculo_id: number | null;
  fecha: string;
  hora: string;
  motivo: string;
  observaciones: string;
  estado: string;
  cliente_nombre?: string;
  cliente_apellido?: string;
  whatsapp?: string;
  patente?: string;
  marca?: string;
  modelo?: string;
  vehiculoLabel?: string;
}

export interface OrdenItem {
  id: number;
  orden_id?: number;
  tipo: string;
  descripcion: string;
  producto_id: number | null;
  cantidad: number;
  precio_unitario: number;
  importe: number;
  producto_nombre?: string;
  product_stock?: number;
}

export interface Orden {
  id: number;
  numero: number;
  cliente_id: number;
  vehiculo_id: number | null;
  turno_id: number | null;
  fecha_ingreso: string;
  kilometraje: number;
  problema_informado: string;
  diagnostico: string;
  trabajo_realizado: string;
  observaciones: string;
  mano_obra: number;
  repuestos_total: number;
  descuento: number;
  total: number;
  estado: string;
  cliente_nombre?: string;
  cliente_apellido?: string;
  marca?: string;
  modelo?: string;
  patente?: string;
  whatsapp?: string;
  anio?: string;
}

export interface PresupuestoItem {
  id: number;
  presupuesto_id?: number;
  tipo: string;
  descripcion: string;
  producto_id: number | null;
  cantidad: number;
  precio_unitario: number;
  importe: number;
  producto_nombre?: string;
}

export interface Presupuesto {
  id: number;
  numero: number;
  cliente_id: number;
  vehiculo_id: number | null;
  fecha: string;
  vencimiento: string;
  detalle: string;
  mano_obra: number;
  repuestos_total: number;
  descuento: number;
  total: number;
  observaciones: string;
  estado: string;
  cliente_nombre?: string;
  cliente_apellido?: string;
  marca?: string;
  modelo?: string;
  patente?: string;
  whatsapp?: string;
  email?: string;
  anio?: string;
}

export interface ComprobanteItem {
  id: number;
  descripcion: string;
  cantidad: number;
  importe: number;
}

export interface Comprobante {
  id: number;
  numero: number;
  fecha: string;
  cliente_id: number | null;
  vehiculo_id: number | null;
  orden_id: number | null;
  trabajos: string;
  mano_obra: number;
  repuestos_total: number;
  descuento: number;
  total: number;
  metodo_pago: string;
  observaciones: string;
  cliente_nombre?: string;
  cliente_apellido?: string;
  marca?: string;
  modelo?: string;
  patente?: string;
  whatsapp?: string;
  email?: string;
  direccion?: string;
  anio?: string;
}

export interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  marca: string;
  codigo: string;
  proveedor: string;
  costo: number;
  precio: number;
  stock: number;
  stock_minimo: number;
  unidad: string;
  ubicacion: string;
  observaciones: string;
}

export interface MovimientoStock {
  id: number;
  producto_id: number;
  tipo: string;
  cantidad: number;
  motivo: string;
  referencia: string;
  created_at: string;
}

export interface MovimientoCaja {
  id: number;
  fecha: string;
  tipo: string;
  categoria: string;
  concepto: string;
  importe: number;
  metodo_pago: string;
  observaciones: string;
}

export interface ConfigMap {
  [key: string]: string;
}

export const ORDEN_ESTADOS = ['Pendiente', 'En diagnóstico', 'Esperando repuestos', 'En reparación', 'Terminado', 'Entregado', 'Cancelado'];
export const TURNO_ESTADOS = ['Pendiente', 'Confirmado', 'En atención', 'Realizado', 'Cancelado'];
export const PRESUPUESTO_ESTADOS = ['Pendiente', 'Enviado', 'Aprobado', 'Rechazado', 'Vencido'];
export const METODOS_PAGO = ['Efectivo', 'Transferencia', 'Tarjeta', 'Mercado Pago', 'Otro'];
export const CATEGORIAS_INGRESO = ['reparación', 'servicio', 'venta de repuesto', 'otros'];
export const CATEGORIAS_EGRESO = ['compra de repuestos', 'combustible', 'herramientas', 'gastos generales', 'otros'];
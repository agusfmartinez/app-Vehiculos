export const DATA_VERSION = 3;

/**
 * La clave conserva el sufijo "-v1" por compatibilidad: es el slot de storage
 * de la app, no la versión del schema. Esa vive en `VehiculoData.version` y
 * se migra en `migrar()` (src/lib/storage.ts).
 */
export const STORAGE_KEY = 'vehiculo-data-v1';

export type Carroceria = 'hatchback' | 'sedan' | 'suv' | 'pickup' | 'furgon';

export const CARROCERIAS: { value: Carroceria; label: string }[] = [
  { value: 'hatchback', label: 'Hatchback' },
  { value: 'sedan', label: 'Sedán' },
  { value: 'suv', label: 'SUV / Crossover' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'furgon', label: 'Furgón' },
];

export interface Vehiculo {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  patente: string;
  kmActual: number;
  /**
   * Capacidad nominal del tanque en litros. No se puede deducir automáticamente:
   * sale del manual del vehículo o del catálogo local. Sólo se usa para el
   * medidor estimado de cargas.
   */
  capacidadTanque?: number;
  /** Define la silueta del modelo 3D del tablero. */
  carroceria?: Carroceria;
  /** Color de la carrocería en el modelo 3D (hex). */
  color?: string;
}

export interface Service {
  id: string;
  vehiculoId: string;
  fecha: string; // ISO date (YYYY-MM-DD)
  km: number;
  tipo: string;
  descripcion: string;
  costo: number;
  taller?: string;
  proximoKm?: number;
  proximaFecha?: string;
}

export type TipoCombustible = 'super' | 'premium';

export const TIPOS_COMBUSTIBLE: { value: TipoCombustible; label: string }[] = [
  { value: 'super', label: 'Súper' },
  { value: 'premium', label: 'Premium' },
];

export interface CargaCombustible {
  id: string;
  vehiculoId: string;
  fecha: string; // ISO date (YYYY-MM-DD)
  km: number;
  litros: number;
  /**
   * Derivado de `total / litros`; no se carga a mano. En la estación se paga
   * un monto, no un precio unitario. Se guarda calculado para los gráficos.
   */
  precioPorLitro: number;
  /** Lo que salió la carga. Es el dato que se ingresa. */
  total: number;
  /** Opcional: las cargas anteriores a este campo no lo tienen. */
  tipoCombustible?: TipoCombustible;
  estacion?: string;
  /** Si el tanque quedó lleno tras la carga. Requisito para autonomía confiable. */
  tanqueLleno: boolean;
  /** true si los litros salieron del medidor estimado en vez del ticket del surtidor. */
  estimada?: boolean;
  /** Nivel de aguja antes de cargar, 0 (E) a 1 (F). Sólo en cargas estimadas. */
  nivelAntes?: number;
  /** Nivel de aguja después de cargar, 0 (E) a 1 (F). Sólo en cargas estimadas. */
  nivelDespues?: number;
}

/**
 * Lectura del medidor sin cargar nafta: aguja + kilometraje.
 * Permite saber cuánto queda en el tanque y medir consumo entre dos lecturas
 * aunque nunca se llene el tanque.
 */
export interface LecturaTanque {
  id: string;
  vehiculoId: string;
  fecha: string; // ISO date (YYYY-MM-DD)
  km: number;
  /** Nivel de aguja, 0 (E) a 1 (F). */
  nivel: number;
  nota?: string;
}

export type ResultadoVTV = 'aprobada' | 'rechazada' | 'pendiente';

export interface RegistroVTV {
  id: string;
  vehiculoId: string;
  fechaRealizada: string;
  fechaVencimiento: string;
  resultado: ResultadoVTV;
  costo?: number;
  observaciones?: string;
}

export interface VehiculoData {
  version: number;
  vehiculos: Vehiculo[];
  vehiculoActivoId: string | null;
  services: Service[];
  cargasCombustible: CargaCombustible[];
  lecturasTanque: LecturaTanque[];
  vtv: RegistroVTV[];
}

/** Shape del schema v1, sólo para migrar datos viejos. */
export interface VehiculoDataV1 {
  version: 1;
  vehiculo: Omit<Vehiculo, 'id'>;
  services: Omit<Service, 'vehiculoId'>[];
  cargasCombustible: Omit<CargaCombustible, 'vehiculoId'>[];
  vtv: Omit<RegistroVTV, 'vehiculoId'>[];
}

export const TIPOS_SERVICE = [
  'Cambio de aceite y filtro',
  'Filtro de aire',
  'Filtro de habitáculo',
  'Filtro de combustible',
  'Bujías',
  'Frenos',
  'Correa de distribución',
  'Neumáticos',
  'Alineación y balanceo',
  'Batería',
  'Amortiguadores',
  'Embrague',
  'Refrigerante',
  'Service general',
  'Otro',
] as const;

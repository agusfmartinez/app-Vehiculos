import {
  DATA_VERSION,
  type Carroceria,
  type CargaCombustible,
  type LecturaTanque,
  type Poliza,
  type RegistroVTV,
  type Service,
  type Vehiculo,
  type VehiculoData,
} from '@/types';

export const datosIniciales: VehiculoData = {
  version: DATA_VERSION,
  vehiculos: [],
  vehiculoActivoId: null,
  services: [],
  cargasCombustible: [],
  lecturasTanque: [],
  polizas: [],
  vtv: [],
};

/** Genera un id único sin dependencias externas. */
export function nuevoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function vehiculoVacio(): Vehiculo {
  return {
    id: nuevoId(),
    marca: '',
    modelo: '',
    anio: new Date().getFullYear(),
    patente: '',
    kmActual: 0,
    carroceria: 'hatchback',
    color: '#c8ced8',
  };
}

const CARROCERIAS_VALIDAS: Carroceria[] = ['hatchback', 'sedan', 'suv', 'pickup', 'furgon'];

function normalizarVehiculo(v: Partial<Vehiculo> | undefined, id?: string): Vehiculo {
  const capacidad = Number(v?.capacidadTanque);
  return {
    id: v?.id ?? id ?? nuevoId(),
    marca: v?.marca ?? '',
    modelo: v?.modelo ?? '',
    anio: Number(v?.anio) || new Date().getFullYear(),
    patente: v?.patente ?? '',
    kmActual: Number(v?.kmActual) || 0,
    capacidadTanque: capacidad > 0 ? capacidad : undefined,
    carroceria:
      v?.carroceria && CARROCERIAS_VALIDAS.includes(v.carroceria) ? v.carroceria : 'hatchback',
    color: typeof v?.color === 'string' && v.color ? v.color : '#c8ced8',
  };
}

/** ¿El vehículo del schema v1 tenía algo cargado, o era el placeholder vacío? */
function tieneDatos(v: Partial<Vehiculo> | undefined): boolean {
  if (!v) return false;
  return Boolean(v.marca || v.modelo || v.patente || Number(v.kmActual) > 0);
}

/**
 * Normaliza cualquier objeto (leído de localStorage o de un backup importado)
 * al shape actual, completando lo que falte y migrando desde v1.
 *
 * v1 → v2: el `vehiculo` único pasa a ser el primer elemento de `vehiculos`,
 * y todos los registros existentes quedan asociados a su id.
 * v2 → v3: aparece `lecturasTanque`, que arranca vacío.
 * v3 → v4: aparece `polizas`, que arranca vacío.
 */
export function migrar(raw: unknown): VehiculoData {
  if (!raw || typeof raw !== 'object') return datosIniciales;
  const d = raw as Record<string, unknown>;

  const services = Array.isArray(d.services) ? (d.services as Service[]) : [];
  const cargas = Array.isArray(d.cargasCombustible)
    ? (d.cargasCombustible as CargaCombustible[])
    : [];
  const lecturas = Array.isArray(d.lecturasTanque)
    ? (d.lecturasTanque as LecturaTanque[]).filter(
        (l) => Number.isFinite(Number(l.nivel)) && Number.isFinite(Number(l.km)),
      )
    : [];
  const polizas = Array.isArray(d.polizas) ? (d.polizas as Poliza[]) : [];
  const vtv = Array.isArray(d.vtv) ? (d.vtv as RegistroVTV[]) : [];

  let vehiculos: Vehiculo[];
  let idPorDefecto: string | null;

  if (Array.isArray(d.vehiculos)) {
    // Ya es v2 (o posterior).
    vehiculos = (d.vehiculos as Partial<Vehiculo>[]).map((v) => normalizarVehiculo(v));
    const activoGuardado = typeof d.vehiculoActivoId === 'string' ? d.vehiculoActivoId : null;
    idPorDefecto =
      activoGuardado && vehiculos.some((v) => v.id === activoGuardado)
        ? activoGuardado
        : (vehiculos[0]?.id ?? null);
  } else {
    // v1: un único vehículo suelto en `vehiculo`.
    const viejo = d.vehiculo as Partial<Vehiculo> | undefined;
    if (
      tieneDatos(viejo) ||
      services.length ||
      cargas.length ||
      lecturas.length ||
      polizas.length ||
      vtv.length
    ) {
      const migrado = normalizarVehiculo(viejo);
      vehiculos = [migrado];
      idPorDefecto = migrado.id;
    } else {
      vehiculos = [];
      idPorDefecto = null;
    }
  }

  // Los registros sin vehiculoId (v1) o con uno que ya no existe se adoptan
  // por el vehículo por defecto; si no hay ninguno, se descartan.
  const idsValidos = new Set(vehiculos.map((v) => v.id));
  const asignar = <T extends { vehiculoId?: string }>(items: T[]): (T & { vehiculoId: string })[] =>
    items
      .map((r) => ({
        ...r,
        vehiculoId: r.vehiculoId && idsValidos.has(r.vehiculoId) ? r.vehiculoId : (idPorDefecto ?? ''),
      }))
      .filter((r) => r.vehiculoId !== '');

  return {
    version: DATA_VERSION,
    vehiculos,
    vehiculoActivoId: idPorDefecto,
    services: asignar(services),
    cargasCombustible: asignar(cargas),
    lecturasTanque: asignar(lecturas).map((l) => ({
      ...l,
      // El nivel siempre queda dentro de 0..1 aunque venga sucio de un backup.
      nivel: Math.min(1, Math.max(0, Number(l.nivel))),
    })),
    polizas: asignar(polizas),
    vtv: asignar(vtv),
  };
}

/** Valida que un JSON importado tenga la forma mínima esperada (v1, v2 o v3). */
export function esBackupValido(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const d = raw as Record<string, unknown>;
  return (
    Array.isArray(d.vehiculos) ||
    'vehiculo' in d ||
    Array.isArray(d.services) ||
    Array.isArray(d.cargasCombustible) ||
    Array.isArray(d.lecturasTanque) ||
    Array.isArray(d.polizas) ||
    Array.isArray(d.vtv)
  );
}

export function descargarBackup(data: VehiculoData): void {
  const contenido = JSON.stringify(data, null, 2);
  const blob = new Blob([contenido], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const hoy = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `vehiculos-backup-${hoy}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

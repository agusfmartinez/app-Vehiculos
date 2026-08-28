import type { CargaCombustible, LecturaTanque, RegistroVTV, Service } from '@/types';
import { diasHasta, parseFecha } from '@/lib/format';

/* ------------------------------------------------------------------ */
/* Combustible / autonomía                                             */
/* ------------------------------------------------------------------ */

export interface TramoCombustible {
  carga: CargaCombustible;
  /** Carga inmediatamente anterior; null en la primera. */
  anterior: CargaCombustible | null;
  kmRecorridos: number | null;
  kmPorLitro: number | null;
  /**
   * El cálculo full-to-full sólo es válido si ambas cargas dejaron el tanque
   * lleno y ninguna fue estimada a ojo con el medidor.
   */
  confiable: boolean;
  motivoNoConfiable?: string;
}

/** Cargas ordenadas cronológicamente (más vieja primero), desempatando por km. */
export function ordenarCargasAsc(cargas: CargaCombustible[]): CargaCombustible[] {
  return [...cargas].sort((a, b) => {
    const t = parseFecha(a.fecha).getTime() - parseFecha(b.fecha).getTime();
    return t !== 0 ? t : a.km - b.km;
  });
}

/**
 * Método full-to-full: los litros de una carga son los que se consumieron
 * desde la carga anterior, así que km/L = (km actual - km anterior) / litros
 * de la carga actual. La primera carga no tiene tramo.
 */
export function calcularTramos(cargas: CargaCombustible[]): TramoCombustible[] {
  const asc = ordenarCargasAsc(cargas);

  return asc.map((carga, i) => {
    const anterior = i > 0 ? asc[i - 1] : null;
    if (!anterior) {
      return {
        carga,
        anterior: null,
        kmRecorridos: null,
        kmPorLitro: null,
        confiable: false,
        motivoNoConfiable: 'Primera carga registrada: no hay tramo previo.',
      };
    }

    const kmRecorridos = carga.km - anterior.km;
    const kmPorLitro =
      kmRecorridos > 0 && carga.litros > 0 ? kmRecorridos / carga.litros : null;

    const motivos: string[] = [];
    if (kmRecorridos <= 0) motivos.push('el kilometraje no avanzó respecto de la carga anterior');
    if (!carga.tanqueLleno) motivos.push('esta carga no dejó el tanque lleno');
    if (!anterior.tanqueLleno) motivos.push('la carga anterior no dejó el tanque lleno');
    if (carga.estimada || anterior.estimada) motivos.push('hay litros estimados con el medidor');

    return {
      carga,
      anterior,
      kmRecorridos,
      kmPorLitro,
      confiable: motivos.length === 0 && kmPorLitro != null,
      motivoNoConfiable: motivos.length ? `No confiable: ${motivos.join('; ')}.` : undefined,
    };
  });
}

/** Promedio de km/L sobre los últimos `ultimasN` tramos confiables. */
export function autonomiaPromedio(
  cargas: CargaCombustible[],
  ultimasN = 5,
): { kmPorLitro: number | null; tramosUsados: number } {
  const confiables = calcularTramos(cargas).filter(
    (t): t is TramoCombustible & { kmPorLitro: number } => t.confiable && t.kmPorLitro != null,
  );
  const usados = confiables.slice(-ultimasN);
  if (usados.length === 0) return { kmPorLitro: null, tramosUsados: 0 };
  const suma = usados.reduce((acc, t) => acc + t.kmPorLitro, 0);
  return { kmPorLitro: suma / usados.length, tramosUsados: usados.length };
}

/** Litros cada 100 km, la otra forma de leer el mismo dato. */
export function litrosPor100km(kmPorLitro: number | null): number | null {
  if (kmPorLitro == null || kmPorLitro <= 0) return null;
  return 100 / kmPorLitro;
}

export function precioPromedioPorLitro(cargas: CargaCombustible[]): number | null {
  const validas = cargas.filter((c) => c.precioPorLitro > 0);
  if (!validas.length) return null;
  return validas.reduce((a, c) => a + c.precioPorLitro, 0) / validas.length;
}

/* ------------------------------------------------------------------ */
/* Gastos                                                              */
/* ------------------------------------------------------------------ */

function enAnio(iso: string, anio: number): boolean {
  const d = parseFecha(iso);
  return !Number.isNaN(d.getTime()) && d.getFullYear() === anio;
}

function enMes(iso: string, anio: number, mes: number): boolean {
  const d = parseFecha(iso);
  return !Number.isNaN(d.getTime()) && d.getFullYear() === anio && d.getMonth() === mes;
}

export function gastoCombustibleMes(cargas: CargaCombustible[], ref = new Date()): number {
  return cargas
    .filter((c) => enMes(c.fecha, ref.getFullYear(), ref.getMonth()))
    .reduce((a, c) => a + (c.total || 0), 0);
}

export function gastoCombustibleAnio(cargas: CargaCombustible[], anio = new Date().getFullYear()) {
  return cargas.filter((c) => enAnio(c.fecha, anio)).reduce((a, c) => a + (c.total || 0), 0);
}

export function gastoServicesAnio(services: Service[], anio = new Date().getFullYear()): number {
  return services.filter((s) => enAnio(s.fecha, anio)).reduce((a, s) => a + (s.costo || 0), 0);
}

/* ------------------------------------------------------------------ */
/* Services                                                            */
/* ------------------------------------------------------------------ */

export function ordenarServicesDesc(services: Service[]): Service[] {
  return [...services].sort((a, b) => {
    const t = parseFecha(b.fecha).getTime() - parseFecha(a.fecha).getTime();
    return t !== 0 ? t : b.km - a.km;
  });
}

export function ultimoService(services: Service[]): Service | null {
  return ordenarServicesDesc(services)[0] ?? null;
}

export type Urgencia = 'ok' | 'proximo' | 'vencido';

export interface AlertaService {
  service: Service;
  urgencia: Urgencia;
  /** km que faltan para el próximo (negativo = pasado). */
  kmRestantes: number | null;
  /** días que faltan para la próxima fecha (negativo = pasado). */
  diasRestantes: number | null;
  detalle: string;
}

const UMBRAL_KM = 1000;
const UMBRAL_DIAS = 30;

/**
 * Services con próximo km o próxima fecha cargados que ya vencieron o están
 * por vencer. Se queda con el registro más reciente de cada tipo para no
 * alertar por services viejos ya reemplazados por uno nuevo.
 */
export function alertasServices(services: Service[], kmActual: number): AlertaService[] {
  const masRecientePorTipo = new Map<string, Service>();
  for (const s of ordenarServicesDesc(services)) {
    if (!masRecientePorTipo.has(s.tipo)) masRecientePorTipo.set(s.tipo, s);
  }

  const alertas: AlertaService[] = [];

  for (const s of masRecientePorTipo.values()) {
    if (s.proximoKm == null && !s.proximaFecha) continue;

    const kmRestantes = s.proximoKm != null ? s.proximoKm - kmActual : null;
    const diasRestantes = s.proximaFecha ? diasHasta(s.proximaFecha) : null;

    const vencido =
      (kmRestantes != null && kmRestantes <= 0) ||
      (diasRestantes != null && Number.isFinite(diasRestantes) && diasRestantes <= 0);
    const proximo =
      (kmRestantes != null && kmRestantes > 0 && kmRestantes <= UMBRAL_KM) ||
      (diasRestantes != null &&
        Number.isFinite(diasRestantes) &&
        diasRestantes > 0 &&
        diasRestantes <= UMBRAL_DIAS);

    const urgencia: Urgencia = vencido ? 'vencido' : proximo ? 'proximo' : 'ok';
    if (urgencia === 'ok') continue;

    const partes: string[] = [];
    if (kmRestantes != null) {
      partes.push(
        kmRestantes <= 0
          ? `${Math.abs(kmRestantes).toLocaleString('es-AR')} km pasados`
          : `faltan ${kmRestantes.toLocaleString('es-AR')} km`,
      );
    }
    if (diasRestantes != null && Number.isFinite(diasRestantes)) {
      partes.push(
        diasRestantes <= 0
          ? `${Math.abs(diasRestantes)} días vencido`
          : `faltan ${diasRestantes} días`,
      );
    }

    alertas.push({
      service: s,
      urgencia,
      kmRestantes,
      diasRestantes,
      detalle: partes.join(' · '),
    });
  }

  const peso: Record<Urgencia, number> = { vencido: 0, proximo: 1, ok: 2 };
  return alertas.sort((a, b) => peso[a.urgencia] - peso[b.urgencia]);
}

/* ------------------------------------------------------------------ */
/* VTV                                                                 */
/* ------------------------------------------------------------------ */

export type EstadoVTV = 'sin-datos' | 'vigente' | 'por-vencer' | 'vencida' | 'rechazada';

export interface ResumenVTV {
  estado: EstadoVTV;
  registro: RegistroVTV | null;
  diasRestantes: number | null;
  etiqueta: string;
}

const UMBRAL_VTV_DIAS = 30;

export function ordenarVtvDesc(vtvs: RegistroVTV[]): RegistroVTV[] {
  return [...vtvs].sort(
    (a, b) => parseFecha(b.fechaVencimiento).getTime() - parseFecha(a.fechaVencimiento).getTime(),
  );
}

/** Estado actual según el vencimiento más lejano registrado. */
export function estadoVTV(vtvs: RegistroVTV[]): ResumenVTV {
  const ordenadas = ordenarVtvDesc(vtvs);
  const registro = ordenadas[0] ?? null;

  if (!registro) {
    return { estado: 'sin-datos', registro: null, diasRestantes: null, etiqueta: 'Sin registros' };
  }

  if (registro.resultado === 'rechazada') {
    return {
      estado: 'rechazada',
      registro,
      diasRestantes: null,
      etiqueta: 'Rechazada — requiere reverificación',
    };
  }

  const dias = diasHasta(registro.fechaVencimiento);
  if (!Number.isFinite(dias)) {
    return { estado: 'sin-datos', registro, diasRestantes: null, etiqueta: 'Fecha inválida' };
  }
  if (dias < 0) {
    return { estado: 'vencida', registro, diasRestantes: dias, etiqueta: 'Vencida' };
  }
  if (dias <= UMBRAL_VTV_DIAS) {
    return { estado: 'por-vencer', registro, diasRestantes: dias, etiqueta: 'Por vencer' };
  }
  return { estado: 'vigente', registro, diasRestantes: dias, etiqueta: 'Vigente' };
}

/* ------------------------------------------------------------------ */
/* Resumen para el dashboard                                           */
/* ------------------------------------------------------------------ */

export interface ResumenDashboard {
  vtv: ResumenVTV;
  ultimoService: Service | null;
  autonomia: { kmPorLitro: number | null; tramosUsados: number };
  litros100: number | null;
  gastoCombustibleMes: number;
  gastoCombustibleAnio: number;
  gastoServicesAnio: number;
  alertas: AlertaService[];
  totalRegistros: number;
}

/** Recibe ya filtrado por vehículo activo. */
export function resumenDashboard(entrada: {
  services: Service[];
  cargas: CargaCombustible[];
  vtv: RegistroVTV[];
  kmActual: number;
}): ResumenDashboard {
  const { services, cargas, vtv, kmActual } = entrada;
  const autonomia = autonomiaPromedio(cargas);
  return {
    vtv: estadoVTV(vtv),
    ultimoService: ultimoService(services),
    autonomia,
    litros100: litrosPor100km(autonomia.kmPorLitro),
    gastoCombustibleMes: gastoCombustibleMes(cargas),
    gastoCombustibleAnio: gastoCombustibleAnio(cargas),
    gastoServicesAnio: gastoServicesAnio(services),
    alertas: alertasServices(services, kmActual),
    totalRegistros: services.length + cargas.length + vtv.length,
  };
}

/* ------------------------------------------------------------------ */
/* Nivel de tanque                                                     */
/* ------------------------------------------------------------------ */

/** Evento que afecta al tanque, ordenable en una sola línea de tiempo. */
export interface EventoTanque {
  km: number;
  fecha: string;
  tipo: 'carga' | 'lectura';
  /** Litros que ENTRAN al tanque (una lectura no suma). */
  litrosCargados: number;
  /**
   * Nivel conocido justo después del evento, 0..1. Sólo lo saben las lecturas,
   * las cargas a tanque lleno y las estimadas con el medidor: una carga
   * parcial por ticket no dice en qué quedó la aguja.
   */
  nivelResultante: number | null;
}

export function eventosTanque(
  cargas: CargaCombustible[],
  lecturas: LecturaTanque[],
): EventoTanque[] {
  const deCargas: EventoTanque[] = cargas.map((c) => ({
    km: c.km,
    fecha: c.fecha,
    tipo: 'carga',
    litrosCargados: c.litros,
    nivelResultante: c.tanqueLleno ? 1 : (c.estimada && c.nivelDespues != null ? c.nivelDespues : null),
  }));

  const deLecturas: EventoTanque[] = lecturas.map((l) => ({
    km: l.km,
    fecha: l.fecha,
    tipo: 'lectura',
    litrosCargados: 0,
    nivelResultante: l.nivel,
  }));

  return [...deCargas, ...deLecturas].sort((a, b) => {
    const t = parseFecha(a.fecha).getTime() - parseFecha(b.fecha).getTime();
    return t !== 0 ? t : a.km - b.km;
  });
}

export type MotivoSinTanque =
  | 'sin-capacidad'
  | 'sin-autonomia'
  | 'sin-referencia'
  | null;

export interface EstadoTanque {
  litros: number | null;
  /** 0..1, para dibujar la aguja. */
  nivel: number | null;
  /** Km que todavía se pueden hacer con lo que queda. */
  autonomiaRestante: number | null;
  /** Km recorridos desde el último nivel conocido. */
  kmDesdeReferencia: number | null;
  referencia: EventoTanque | null;
  /** Por qué no se pudo calcular, si no se pudo. */
  motivo: MotivoSinTanque;
}

const SIN_ESTADO = (motivo: MotivoSinTanque): EstadoTanque => ({
  litros: null,
  nivel: null,
  autonomiaRestante: null,
  kmDesdeReferencia: null,
  referencia: null,
  motivo,
});

/**
 * Balance de litros desde el último nivel conocido:
 *
 *   litros = nivelReferencia × capacidad
 *          + litros cargados después de esa referencia
 *          − (kmActual − kmReferencia) / (km por litro)
 *
 * Necesita la capacidad del tanque y una autonomía medida; sin eso no hay
 * forma de convertir kilómetros en litros.
 */
export function estadoTanque(entrada: {
  cargas: CargaCombustible[];
  lecturas: LecturaTanque[];
  kmActual: number;
  capacidad?: number;
  kmPorLitro: number | null;
}): EstadoTanque {
  const { cargas, lecturas, kmActual, capacidad, kmPorLitro } = entrada;

  if (!capacidad || capacidad <= 0) return SIN_ESTADO('sin-capacidad');
  if (!kmPorLitro || kmPorLitro <= 0) return SIN_ESTADO('sin-autonomia');

  const eventos = eventosTanque(cargas, lecturas);
  let iRef = -1;
  for (let i = eventos.length - 1; i >= 0; i--) {
    if (eventos[i].nivelResultante != null) {
      iRef = i;
      break;
    }
  }
  if (iRef === -1) return SIN_ESTADO('sin-referencia');

  const referencia = eventos[iRef];
  const litrosEnReferencia = referencia.nivelResultante! * capacidad;
  const cargadoDespues = eventos
    .slice(iRef + 1)
    .reduce((acc, e) => acc + e.litrosCargados, 0);

  const kmDesdeReferencia = Math.max(0, kmActual - referencia.km);
  const consumido = kmDesdeReferencia / kmPorLitro;

  const litros = Math.min(capacidad, Math.max(0, litrosEnReferencia + cargadoDespues - consumido));

  return {
    litros,
    nivel: litros / capacidad,
    autonomiaRestante: litros * kmPorLitro,
    kmDesdeReferencia,
    referencia,
    motivo: null,
  };
}

/* ------------------------------------------------------------------ */
/* Consumo medido con el medidor (sin llenar el tanque)                */
/* ------------------------------------------------------------------ */

export interface TramoMedidor {
  desde: LecturaTanque;
  hasta: LecturaTanque;
  kmRecorridos: number;
  litrosConsumidos: number;
  kmPorLitro: number;
}

/**
 * km/L entre dos lecturas consecutivas del medidor. Lo que se consumió es la
 * caída de la aguja más cualquier carga hecha en el medio:
 *
 *   litros = (nivelDesde − nivelHasta) × capacidad + litros cargados entre ambas
 *
 * Es menos preciso que el full-to-full — la aguja no es lineal — pero permite
 * medir consumo sin llenar nunca el tanque.
 */
export function tramosMedidor(
  lecturas: LecturaTanque[],
  cargas: CargaCombustible[],
  capacidad?: number,
): TramoMedidor[] {
  if (!capacidad || capacidad <= 0) return [];

  const asc = [...lecturas].sort((a, b) => {
    const t = parseFecha(a.fecha).getTime() - parseFecha(b.fecha).getTime();
    return t !== 0 ? t : a.km - b.km;
  });

  const tramos: TramoMedidor[] = [];

  for (let i = 1; i < asc.length; i++) {
    const desde = asc[i - 1];
    const hasta = asc[i];
    const kmRecorridos = hasta.km - desde.km;
    if (kmRecorridos <= 0) continue;

    const cargadoEnElMedio = cargas
      .filter((c) => c.km > desde.km && c.km <= hasta.km)
      .reduce((acc, c) => acc + c.litros, 0);

    const litrosConsumidos = (desde.nivel - hasta.nivel) * capacidad + cargadoEnElMedio;
    if (litrosConsumidos <= 0) continue;

    tramos.push({
      desde,
      hasta,
      kmRecorridos,
      litrosConsumidos,
      kmPorLitro: kmRecorridos / litrosConsumidos,
    });
  }

  return tramos;
}

/** Promedio de km/L medido con el medidor, sobre los últimos tramos. */
export function autonomiaPorMedidor(
  lecturas: LecturaTanque[],
  cargas: CargaCombustible[],
  capacidad?: number,
  ultimosN = 5,
): { kmPorLitro: number | null; tramosUsados: number } {
  const tramos = tramosMedidor(lecturas, cargas, capacidad).slice(-ultimosN);
  if (!tramos.length) return { kmPorLitro: null, tramosUsados: 0 };
  return {
    kmPorLitro: tramos.reduce((a, t) => a + t.kmPorLitro, 0) / tramos.length,
    tramosUsados: tramos.length,
  };
}

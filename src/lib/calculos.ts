import type { CargaCombustible, LecturaTanque, RegistroVTV, Service } from '@/types';
import { diasHasta, parseFecha } from '@/lib/format';

/* ------------------------------------------------------------------ */
/* Combustible / autonomía                                             */
/* ------------------------------------------------------------------ */

/** Cargas ordenadas cronológicamente (más vieja primero), desempatando por km. */
export function ordenarCargasAsc(cargas: CargaCombustible[]): CargaCombustible[] {
  return [...cargas].sort((a, b) => {
    const t = parseFecha(a.fecha).getTime() - parseFecha(b.fecha).getTime();
    return t !== 0 ? t : a.km - b.km;
  });
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
  autonomia: ResumenAutonomia;
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
  lecturas: LecturaTanque[];
  vtv: RegistroVTV[];
  kmActual: number;
  capacidad?: number;
}): ResumenDashboard {
  const { services, cargas, lecturas, vtv, kmActual, capacidad } = entrada;
  const autonomia = autonomiaPromedio({ cargas, lecturas, capacidad });
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
  id: string;
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
  /**
   * El nivel salió de mirar la aguja (impreciso, no lineal) en vez de un
   * tanque lleno hasta el tope. Define la precisión de los tramos que toca.
   */
  nivelDeMedidor: boolean;
}

export function eventosTanque(
  cargas: CargaCombustible[],
  lecturas: LecturaTanque[],
): EventoTanque[] {
  const deCargas: EventoTanque[] = cargas.map((c) => {
    const nivelDelMedidor = Boolean(c.estimada) && c.nivelDespues != null;
    return {
      id: c.id,
      km: c.km,
      fecha: c.fecha,
      tipo: 'carga' as const,
      litrosCargados: c.litros,
      nivelResultante: c.tanqueLleno ? 1 : (nivelDelMedidor ? c.nivelDespues! : null),
      // Si los litros salieron del medidor, el tramo es estimado aunque la
      // aguja haya terminado en F: los litros mismos son una aproximación.
      nivelDeMedidor: Boolean(c.estimada),
    };
  });

  const deLecturas: EventoTanque[] = lecturas.map((l) => ({
    id: l.id,
    km: l.km,
    fecha: l.fecha,
    tipo: 'lectura' as const,
    litrosCargados: 0,
    nivelResultante: l.nivel,
    nivelDeMedidor: true,
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
/* Consumo entre eventos                                               */
/* ------------------------------------------------------------------ */

/**
 * `exacto`  — los dos extremos son tanques llenos hasta el tope. No depende
 *             de la aguja ni de la capacidad declarada.
 * `estimado`— algún extremo salió de mirar la aguja. Sirve, pero el medidor
 *             no es lineal: tomalo como aproximado.
 */
export type PrecisionTramo = 'exacto' | 'estimado';

export interface TramoConsumo {
  desde: EventoTanque;
  hasta: EventoTanque;
  kmRecorridos: number;
  litrosConsumidos: number;
  /** null cuando el tramo no da una medición utilizable. */
  kmPorLitro: number | null;
  precision: PrecisionTramo;
  /** Cargas intermedias que no dejaron nivel conocido pero suman litros. */
  cargasIntermedias: number;
  /** Por qué queda fuera del promedio; null si el tramo sirve. */
  descarte: MotivoDescarte | null;
}

/**
 * Un auto naftero rinde entre 5 y 20 km/L; una moto llega a 40. Fuera de esta
 * banda el problema no es el vehículo sino el dato: un kilometraje tipeado con
 * un dígito de más, o una aguja marcada al revés. Esos tramos se marcan y
 * quedan fuera del promedio en vez de arrastrarlo.
 */
export const KM_POR_LITRO_MIN = 1;
export const KM_POR_LITRO_MAX = 60;

export function esPlausible(kmPorLitro: number): boolean {
  return kmPorLitro >= KM_POR_LITRO_MIN && kmPorLitro <= KM_POR_LITRO_MAX;
}

/**
 * Divisiones del medidor (E, 1/8, ..., F). Es el paso del control de nivel y,
 * por lo tanto, la resolución real del instrumento.
 */
export const DIVISIONES_MEDIDOR = 8;

/** Litros que representa una muesca de la aguja: el mínimo que se puede leer. */
export function resolucionMedidor(capacidad: number): number {
  return capacidad / DIVISIONES_MEDIDOR;
}

/**
 * Primera muesca del medidor (1/8 ≈ 13 %): la zona roja donde el auto entra en
 * reserva y se prende la luz. Se pinta igual en todos los medidores de la app.
 */
export const NIVEL_RESERVA = 1 / DIVISIONES_MEDIDOR;

/** True si la aguja está en la muesca de reserva o por debajo. */
export function enReserva(nivel: number | null | undefined): boolean {
  return nivel != null && nivel <= NIVEL_RESERVA + 1e-6;
}

export type MotivoDescarte =
  /** Rendimiento fuera de lo posible: hay un dato mal cargado. */
  | 'implausible'
  /** Consumo por debajo de lo que el medidor puede distinguir. */
  | 'bajo-resolucion';

/**
 * Consumo entre cada par de eventos consecutivos con nivel conocido, sean
 * cargas a tanque lleno o mediciones del medidor:
 *
 *   litros = nivelDesde × capacidad
 *          + litros cargados en el medio (incluida la carga del extremo final)
 *          − nivelHasta × capacidad
 *
 * Generaliza el full-to-full en vez de reemplazarlo: si ambos extremos son
 * tanque lleno, los términos de capacidad se cancelan y queda `litros =
 * los litros cargados`, que es exactamente el método clásico. Por eso un tramo
 * exacto no necesita que la capacidad esté cargada.
 *
 * Las cargas parciales por ticket no cortan un tramo: no dicen en qué quedó la
 * aguja, pero sus litros entran al balance. Antes se perdían dos tramos por
 * cada carga parcial en el medio; ahora se aprovecha el span completo.
 */
/** Arma el tramo entre dos anclas cualesquiera, no necesariamente vecinas. */
function construirTramo(
  eventos: EventoTanque[],
  iDesde: number,
  iHasta: number,
  capacidad?: number,
): TramoConsumo | null {
  const desde = eventos[iDesde];
  const hasta = eventos[iHasta];

  const kmRecorridos = hasta.km - desde.km;
  if (kmRecorridos <= 0) return null;

  // Todo lo que entró al tanque después del ancla inicial y hasta la final
  // inclusive: los litros del extremo son los que repusieron lo gastado.
  let litrosEnMedio = 0;
  let cargasIntermedias = 0;
  for (let i = iDesde + 1; i <= iHasta; i++) {
    litrosEnMedio += eventos[i].litrosCargados;
    if (i < iHasta && eventos[i].litrosCargados > 0) cargasIntermedias++;
  }

  const exacto = !desde.nivelDeMedidor && !hasta.nivelDeMedidor;

  let litrosConsumidos: number;
  if (exacto) {
    // nivelDesde = nivelHasta = 1, así que la capacidad se cancela.
    litrosConsumidos = litrosEnMedio;
  } else {
    if (!capacidad || capacidad <= 0) return null;
    litrosConsumidos =
      desde.nivelResultante! * capacidad + litrosEnMedio - hasta.nivelResultante! * capacidad;
  }

  const comun = { desde, hasta, kmRecorridos, litrosConsumidos, cargasIntermedias };

  // La aguja se lee de a muescas: un consumo menor a una muesca es ruido del
  // instrumento, no una medición.
  if (!exacto && Math.abs(litrosConsumidos) < resolucionMedidor(capacidad!)) {
    return { ...comun, kmPorLitro: null, precision: 'estimado', descarte: 'bajo-resolucion' };
  }

  if (litrosConsumidos <= 0) {
    // Fuera del ruido, un consumo negativo significa que la aguja subió sin que
    // haya una carga registrada en el medio: los datos se contradicen.
    if (exacto) return null;
    return {
      ...comun,
      kmPorLitro: kmRecorridos / litrosConsumidos,
      precision: 'estimado',
      descarte: 'implausible',
    };
  }

  const kmPorLitro = kmRecorridos / litrosConsumidos;
  return {
    ...comun,
    kmPorLitro,
    precision: exacto ? 'exacto' : 'estimado',
    descarte: esPlausible(kmPorLitro) ? null : 'implausible',
  };
}

/**
 * Segmentación golosa sobre un conjunto de anclas ya elegido.
 *
 * Un ancla no obliga a cortar: el tramo se cierra sólo cuando da una medición
 * utilizable, y si no, se extiende hasta la siguiente. Registrar un dato de más
 * nunca debería empeorar el cálculo.
 */
function segmentar(eventos: EventoTanque[], anclas: number[], capacidad?: number): TramoConsumo[] {
  if (anclas.length < 2) return [];

  const construir = (iDesde: number, iHasta: number) =>
    construirTramo(eventos, iDesde, iHasta, capacidad);

  const tramos: TramoConsumo[] = [];
  const inicios: number[] = [];
  let iInicio = anclas[0];

  for (let k = 1; k < anclas.length; k++) {
    const iFin = anclas[k];
    const esUltima = k === anclas.length - 1;
    const tramo = construir(iInicio, iFin);

    if (!tramo) {
      if (esUltima) break;
      continue;
    }

    if (tramo.descarte === 'bajo-resolucion') {
      if (!esUltima) continue;

      // Cola corta al final: en vez de tirar sus kilómetros, se absorben en el
      // tramo anterior extendiéndolo hasta acá.
      const ultimo = tramos.length - 1;
      if (ultimo >= 0) {
        const fusionado = construir(inicios[ultimo], iFin);
        if (fusionado && fusionado.descarte === null) {
          tramos[ultimo] = fusionado;
          break;
        }
      }
      tramos.push(tramo);
      inicios.push(iInicio);
      break;
    }

    tramos.push(tramo);
    inicios.push(iInicio);
    iInicio = iFin;
  }

  return tramos;
}

function indicesAncla(eventos: EventoTanque[], incluirMediciones: boolean): number[] {
  return eventos
    .map((e, i) => (e.nivelResultante != null && (incluirMediciones || e.tipo === 'carga') ? i : -1))
    .filter((i) => i >= 0);
}

/**
 * Paso de cada medición contra el evento inmediatamente anterior, sea una carga
 * u otra medición.
 *
 * No es la medición de referencia — esa es de carga a carga — pero muestra cómo
 * viene el consumo dentro del ciclo: cuántos kilómetros y litros van desde el
 * último registro. Sólo se calcula para mediciones: las cargas se comparan
 * entre sí.
 */
export function pasosMedicion(
  cargas: CargaCombustible[],
  lecturas: LecturaTanque[],
  capacidad?: number,
): Map<string, TramoConsumo> {
  const eventos = eventosTanque(cargas, lecturas);
  const anclas = indicesAncla(eventos, true);
  const pasos = new Map<string, TramoConsumo>();

  for (let k = 1; k < anclas.length; k++) {
    const iHasta = anclas[k];
    if (eventos[iHasta].tipo !== 'lectura') continue;
    const tramo = construirTramo(eventos, anclas[k - 1], iHasta, capacidad);
    if (tramo) pasos.set(eventos[iHasta].id, tramo);
  }

  return pasos;
}

export type BaseConsumo = 'cargas' | 'mediciones';

export interface AnalisisConsumo {
  /** Tramos que sirven de referencia, de carga a carga siempre que se pueda. */
  tramos: TramoConsumo[];
  /** De dónde salieron: de las cargas, o de las mediciones a falta de cargas. */
  base: BaseConsumo;
  /**
   * Consumo del tanque en curso: desde la última carga hasta la última
   * medición posterior. Es un parcial del ciclo abierto, no una medición
   * cerrada, así que no entra al promedio.
   */
  enCurso: TramoConsumo | null;
}

/** Tramo abierto: de la última carga a la última medición posterior. */
function cicloEnCurso(eventos: EventoTanque[], capacidad?: number): TramoConsumo | null {
  let iCarga = -1;
  for (let i = eventos.length - 1; i >= 0; i--) {
    if (eventos[i].tipo === 'carga' && eventos[i].nivelResultante != null) {
      iCarga = i;
      break;
    }
  }
  if (iCarga < 0) return null;

  const iUltimo = eventos.length - 1;
  if (iUltimo <= iCarga || eventos[iUltimo].tipo !== 'lectura') return null;

  const [tramo] = segmentar(eventos, [iCarga, iUltimo], capacidad);
  return tramo && tramo.descarte === null ? tramo : null;
}

/**
 * Elige sobre qué comparar el consumo.
 *
 * La referencia es **de carga a carga**: una carga fija un nivel conocido, y el
 * ciclo entre dos cargas es el tramo más largo y con menos lecturas de aguja
 * involucradas, o sea el menos ruidoso. Las mediciones intermedias son puntos
 * *dentro* de ese ciclo — sirven para saber cuánto queda y cómo viene el tanque
 * en curso, pero no parten el tramo de referencia.
 *
 * Sólo cuando todavía no hay dos cargas comparables se cae a las mediciones,
 * para no dejar al usuario sin ningún número.
 */
export function analizarConsumo(
  cargas: CargaCombustible[],
  lecturas: LecturaTanque[],
  capacidad?: number,
): AnalisisConsumo {
  const eventos = eventosTanque(cargas, lecturas);

  const entreCargas = segmentar(eventos, indicesAncla(eventos, false), capacidad);
  if (entreCargas.some((t) => t.descarte === null)) {
    return { tramos: entreCargas, base: 'cargas', enCurso: cicloEnCurso(eventos, capacidad) };
  }

  const conMediciones = segmentar(eventos, indicesAncla(eventos, true), capacidad);
  return { tramos: conMediciones, base: 'mediciones', enCurso: null };
}

/** Los tramos de referencia sueltos, para el listado y los gráficos. */
export function tramosConsumo(
  cargas: CargaCombustible[],
  lecturas: LecturaTanque[],
  capacidad?: number,
): TramoConsumo[] {
  return analizarConsumo(cargas, lecturas, capacidad).tramos;
}

/** Tramos indexados por el evento donde terminan, para pintar el listado. */
export function tramosPorEventoFinal(tramos: TramoConsumo[]): Map<string, TramoConsumo> {
  return new Map(tramos.map((t) => [t.hasta.id, t]));
}

export interface ResumenAutonomia {
  kmPorLitro: number | null;
  tramosUsados: number;
  /** Con qué calidad se midió; null si no se pudo medir. */
  precision: PrecisionTramo | null;
  /** Cuántos tramos exactos hay en total, se hayan usado o no. */
  tramosExactos: number;
  /** Cuántos tramos estimados hay en total. */
  tramosEstimados: number;
  /** Tramos descartados por dar un rendimiento imposible. */
  tramosImplausibles: number;
  /** Tramos demasiado cortos para que el medidor los distinga. */
  tramosNoMedibles: number;
  /** Si se comparó entre cargas o, a falta de ellas, entre mediciones. */
  base: BaseConsumo;
  /** Consumo del tanque en curso, aparte del promedio. */
  enCurso: TramoConsumo | null;
}

/**
 * Promedio de km/L sobre los últimos tramos. Si hay tramos exactos usa sólo
 * esos: mezclar un full-to-full con una lectura a ojo empeora el número en vez
 * de mejorarlo. Sin exactos, cae a los estimados y lo declara.
 */
export function autonomiaPromedio(
  entrada: { cargas: CargaCombustible[]; lecturas: LecturaTanque[]; capacidad?: number },
  ultimosN = 5,
): ResumenAutonomia {
  const analisis = analizarConsumo(entrada.cargas, entrada.lecturas, entrada.capacidad);
  const todos = analisis.tramos;
  const tramos = todos.filter(
    (t): t is TramoConsumo & { kmPorLitro: number } => t.descarte === null && t.kmPorLitro != null,
  );
  const exactos = tramos.filter((t) => t.precision === 'exacto');
  const estimados = tramos.filter((t) => t.precision === 'estimado');
  const implausibles = todos.filter((t) => t.descarte === 'implausible').length;
  const noMedibles = todos.filter((t) => t.descarte === 'bajo-resolucion').length;

  const base = exactos.length ? exactos : estimados;
  if (!base.length) {
    return {
      kmPorLitro: null,
      tramosUsados: 0,
      precision: null,
      tramosExactos: 0,
      tramosEstimados: 0,
      tramosImplausibles: implausibles,
      tramosNoMedibles: noMedibles,
      base: analisis.base,
      enCurso: analisis.enCurso,
    };
  }

  const usados = base.slice(-ultimosN);

  // Total de km sobre total de litros, no el promedio de los km/L de cada
  // tramo: promediar razones le da el mismo peso a un tramo de 50 km que a uno
  // de 600, y un tramo corto con pocos litros distorsiona todo.
  const km = usados.reduce((a, t) => a + t.kmRecorridos, 0);
  const litros = usados.reduce((a, t) => a + t.litrosConsumidos, 0);

  return {
    kmPorLitro: litros > 0 ? km / litros : null,
    tramosUsados: usados.length,
    precision: exactos.length ? 'exacto' : 'estimado',
    tramosExactos: exactos.length,
    tramosEstimados: estimados.length,
    tramosImplausibles: implausibles,
    tramosNoMedibles: noMedibles,
    base: analisis.base,
    enCurso: analisis.enCurso,
  };
}

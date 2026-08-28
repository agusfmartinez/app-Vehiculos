import { parseFecha } from '@/lib/format';

export interface Intervalo {
  /** Kilómetros hasta el próximo. */
  km?: number;
  /** Meses hasta el próximo. */
  meses?: number;
}

/**
 * Intervalos de referencia para vehículos nafteros de uso urbano/mixto.
 *
 * Son GENÉRICOS: el manual del fabricante manda. La app los usa sólo para
 * precargar los campos "próximo km" y "próxima fecha" del formulario, que
 * quedan siempre editables.
 */
export const INTERVALOS: Record<string, Intervalo> = {
  'Cambio de aceite y filtro': { km: 10_000, meses: 12 },
  'Filtro de aire': { km: 20_000, meses: 24 },
  'Filtro de habitáculo': { km: 20_000, meses: 12 },
  'Filtro de combustible': { km: 30_000, meses: 24 },
  Bujías: { km: 40_000 },
  Frenos: { km: 40_000 },
  'Correa de distribución': { km: 60_000, meses: 60 },
  Neumáticos: { km: 50_000 },
  'Alineación y balanceo': { km: 15_000, meses: 12 },
  Batería: { meses: 48 },
  Amortiguadores: { km: 80_000 },
  Embrague: { km: 100_000 },
  Refrigerante: { km: 60_000, meses: 48 },
  'Service general': { km: 10_000, meses: 12 },
};

export function intervaloDe(tipo: string): Intervalo | undefined {
  return INTERVALOS[tipo];
}

function sumarMeses(iso: string, meses: number): string | undefined {
  const d = parseFecha(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const diaOriginal = d.getDate();
  d.setMonth(d.getMonth() + meses);
  // Si el mes destino es más corto (31/01 + 1 mes), JS desborda al mes
  // siguiente; lo empujamos al último día del mes esperado.
  if (d.getDate() < diaOriginal) d.setDate(0);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export interface SugerenciaProximo {
  proximoKm?: number;
  proximaFecha?: string;
}

/**
 * A partir del tipo de service y del momento en que se hizo, calcula cuándo
 * tocaría el próximo. Devuelve vacío si el tipo no está en la tabla.
 */
export function sugerirProximo(
  tipo: string,
  km: number,
  fecha: string,
): SugerenciaProximo {
  const intervalo = intervaloDe(tipo);
  if (!intervalo) return {};
  return {
    proximoKm:
      intervalo.km != null && Number.isFinite(km) && km > 0 ? km + intervalo.km : undefined,
    proximaFecha: intervalo.meses != null && fecha ? sumarMeses(fecha, intervalo.meses) : undefined,
  };
}

/** Texto corto del intervalo, para mostrar de dónde salió la sugerencia. */
export function descripcionIntervalo(tipo: string): string | null {
  const i = intervaloDe(tipo);
  if (!i) return null;
  const partes: string[] = [];
  if (i.km) partes.push(`${i.km.toLocaleString('es-AR')} km`);
  if (i.meses) partes.push(i.meses % 12 === 0 ? `${i.meses / 12} año${i.meses > 12 ? 's' : ''}` : `${i.meses} meses`);
  if (!partes.length) return null;
  return `Sugerido: cada ${partes.join(' o ')}`;
}

import { parseFecha } from '@/lib/format';
import { periodoDe } from '@/lib/periodos';

export interface LecturaKm {
  fecha: string; // ISO date (YYYY-MM-DD)
  km: number;
}

const MS_DIA = 86_400_000;

function iso(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/**
 * Deja una lectura por día (la de más km) y descarta las que bajan respecto de
 * la anterior: un odómetro no retrocede, así que es un error de carga.
 */
function lecturasMonotonas(lecturas: LecturaKm[]): LecturaKm[] {
  const validas = lecturas
    .filter((l) => l.fecha && Number.isFinite(l.km) && l.km > 0)
    .sort((a, b) => (a.fecha === b.fecha ? a.km - b.km : a.fecha < b.fecha ? -1 : 1));

  const salida: LecturaKm[] = [];
  for (const l of validas) {
    const ultima = salida[salida.length - 1];
    if (ultima && l.km < ultima.km) continue;
    if (ultima && ultima.fecha === l.fecha) ultima.km = l.km;
    else salida.push({ ...l });
  }
  return salida;
}

/**
 * Km recorridos por mes (clave YYYY-MM).
 *
 * Entre dos lecturas consecutivas se reparten los km en partes iguales por día,
 * y cada día suma al mes que le toca. Así un tramo que cruza fin de mes se
 * divide en vez de caer entero en uno. Es una estimación: sólo hay odómetro en
 * los días que cargaste algo, y el resto se asume parejo.
 */
export function kmPorMes(lecturas: LecturaKm[]): Map<string, number> {
  const pts = lecturasMonotonas(lecturas);
  const porMes = new Map<string, number>();

  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const d0 = parseFecha(a.fecha);
    const d1 = parseFecha(b.fecha);
    const dias = Math.round((d1.getTime() - d0.getTime()) / MS_DIA);
    if (dias <= 0) continue;
    const porDia = (b.km - a.km) / dias;

    for (let n = 1; n <= dias; n++) {
      const dia = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + n);
      const periodo = periodoDe(iso(dia));
      porMes.set(periodo, (porMes.get(periodo) ?? 0) + porDia);
    }
  }
  return porMes;
}

/** Suma de los meses de un mapa YYYY-MM agrupados por año. */
export function kmPorAnio(porMes: Map<string, number>): Map<string, number> {
  const porAnio = new Map<string, number>();
  for (const [periodo, km] of porMes) {
    const anio = periodo.slice(0, 4);
    porAnio.set(anio, (porAnio.get(anio) ?? 0) + km);
  }
  return porAnio;
}

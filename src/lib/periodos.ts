import { parseFecha } from '@/lib/format';

/** Todos los meses = sin filtro. */
export const TODOS = '__todos__';

/** Mes de una fecha ISO, en formato YYYY-MM. */
export function periodoDe(iso: string): string {
  return iso.slice(0, 7);
}

/** "2026-08" → "agosto 2026". */
export function etiquetaPeriodo(periodo: string): string {
  const [anio, mes] = periodo.split('-').map(Number);
  if (!anio || !mes) return periodo;
  const d = new Date(anio, mes - 1, 1);
  return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

/** "2026-08" → "ago 26", para chips angostos. */
export function etiquetaPeriodoCorta(periodo: string): string {
  const [anio, mes] = periodo.split('-').map(Number);
  if (!anio || !mes) return periodo;
  const d = new Date(anio, mes - 1, 1);
  const nombre = d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');
  return `${nombre} ${String(anio).slice(2)}`;
}

/**
 * Meses presentes en los registros, del más nuevo al más viejo.
 * Se arma con los datos reales para no ofrecer meses vacíos.
 */
export function periodosDe(items: { fecha: string }[]): string[] {
  const meses = new Set<string>();
  for (const i of items) {
    if (!i.fecha) continue;
    const d = parseFecha(i.fecha);
    if (Number.isNaN(d.getTime())) continue;
    meses.add(periodoDe(i.fecha));
  }
  return [...meses].sort().reverse();
}

/** Deja pasar todo si el filtro es "todos". */
export function enPeriodo(fecha: string, periodo: string): boolean {
  return periodo === TODOS || periodoDe(fecha) === periodo;
}

/** Mes anterior a uno dado: "2026-01" → "2025-12". */
export function periodoAnterior(periodo: string): string {
  const [anio, mes] = periodo.split('-').map(Number);
  const d = new Date(anio, mes - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Período del mes en curso. */
export function periodoActual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

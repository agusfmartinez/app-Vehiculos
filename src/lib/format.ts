const LOCALE = 'es-AR';

/**
 * Parsea "YYYY-MM-DD" como fecha LOCAL.
 * `new Date("2025-03-01")` se interpreta como UTC y en Argentina (UTC-3)
 * cae el 28/02, así que hay que construirla a mano.
 */
export function parseFecha(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number);
  if (!a || !m || !d) return new Date(NaN);
  return new Date(a, m - 1, d);
}

/** Fecha de hoy a medianoche local, para comparaciones por día. */
export function hoy(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Hoy en formato "YYYY-MM-DD" (local), para value de <input type="date">. */
export function hoyISO(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export function fmtFecha(iso?: string): string {
  if (!iso) return '—';
  const d = parseFecha(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtFechaCorta(iso?: string): string {
  if (!iso) return '—';
  const d = parseFecha(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(LOCALE, { day: '2-digit', month: 'short' });
}

export function fmtNumero(n: number | undefined | null, decimales = 0): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString(LOCALE, {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

export function fmtDinero(n: number | undefined | null, decimales = 0): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `$ ${fmtNumero(n, decimales)}`;
}

export function fmtKm(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${fmtNumero(n)} km`;
}

export function fmtLitros(n: number | undefined | null, decimales = 2): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${fmtNumero(n, decimales)} L`;
}

/** Diferencia en días entre hoy y una fecha ISO. Positivo = futuro. */
export function diasHasta(iso: string): number {
  const objetivo = parseFecha(iso);
  if (Number.isNaN(objetivo.getTime())) return NaN;
  objetivo.setHours(0, 0, 0, 0);
  const MS_DIA = 86_400_000;
  return Math.round((objetivo.getTime() - hoy().getTime()) / MS_DIA);
}

export function textoDias(dias: number): string {
  if (!Number.isFinite(dias)) return '—';
  if (dias === 0) return 'vence hoy';
  if (dias > 0) return `en ${dias} ${dias === 1 ? 'día' : 'días'}`;
  const v = Math.abs(dias);
  return `hace ${v} ${v === 1 ? 'día' : 'días'}`;
}

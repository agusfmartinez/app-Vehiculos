import { cn } from '@/lib/cn';
import { NIVEL_RESERVA, enReserva } from '@/lib/calculos';
import { fmtNumero } from '@/lib/format';

const MARCAS = [
  { valor: 0, texto: 'E' },
  { valor: 0.25, texto: '¼' },
  { valor: 0.5, texto: '½' },
  { valor: 0.75, texto: '¾' },
  { valor: 1, texto: 'F' },
];

interface Props {
  label: string;
  /** 0..1, o null cuando todavía no se marcó nada. */
  valor: number | null;
  onChange: (v: number) => void;
  /** Capacidad del tanque, para mostrar el equivalente en litros. */
  capacidad?: number;
  tono?: 'neutro' | 'acento';
  error?: string;
}

/**
 * Medidor tipo aguja del tablero: se arrastra en pasos de 1/8 de tanque,
 * que es la resolución real con la que uno lee el instrumento del auto.
 */
export function NivelTanque({
  label,
  valor,
  onChange,
  capacidad,
  tono = 'acento',
  error,
}: Props) {
  // Sin marcar todavía: la barra arranca vacía y el valor se muestra como "—",
  // para que se note que falta en vez de aparentar un 25% que nadie eligió.
  const definido = valor != null;
  const v = valor ?? 0;
  const pct = Math.round(v * 100);
  const litros = capacidad && definido ? v * capacidad : null;
  const reserva = definido && enReserva(v);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-carbon-400">
          {label}
        </span>
        <span
          className={cn(
            'num text-sm font-semibold',
            reserva ? 'text-rojo-500' : 'text-carbon-100',
          )}
        >
          {definido ? `${pct}%` : '—'}
          {litros != null ? (
            <span className="ml-1 text-xs font-normal text-carbon-400">
              ≈ {fmtNumero(litros, 1)} L
            </span>
          ) : null}
        </span>
      </div>

      <div className="relative">
        <div
          className={cn(
            'relative h-3 w-full overflow-hidden rounded-full bg-carbon-700',
            error ? 'ring-1 ring-rojo-500' : '',
          )}
        >
          {/* Zona de reserva: el primer octavo del medidor va en rojo, como en el auto. */}
          <div
            className="absolute inset-y-0 left-0 bg-rojo-500/25"
            style={{ width: `${NIVEL_RESERVA * 100}%` }}
          />
          <div
            className={cn(
              'relative h-full rounded-full transition-[width] duration-150',
              reserva ? 'bg-rojo-500' : tono === 'acento' ? 'bg-ambar-500' : 'bg-carbon-400',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.125}
          value={v}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          className="absolute inset-0 h-3 w-full cursor-pointer opacity-0"
        />
        <div
          className={cn(
            'pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow',
            definido ? 'border-carbon-950 bg-carbon-100' : 'border-carbon-500 bg-carbon-700',
          )}
          style={{ left: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between px-0.5">
        {MARCAS.map((m) => (
          <button
            key={m.valor}
            type="button"
            onClick={() => onChange(m.valor)}
            className={cn(
              'num text-[11px] font-medium transition-colors',
              definido && Math.abs(v - m.valor) < 0.001
                ? reserva
                  ? 'text-rojo-500'
                  : 'text-ambar-400'
                : enReserva(m.valor)
                  ? 'text-rojo-500/60'
                  : 'text-carbon-500',
            )}
          >
            {m.texto}
          </button>
        ))}
      </div>

      {error ? <p className="text-xs text-rojo-500">{error}</p> : null}
    </div>
  );
}

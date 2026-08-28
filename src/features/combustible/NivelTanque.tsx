import { cn } from '@/lib/cn';
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
  valor: number; // 0..1
  onChange: (v: number) => void;
  /** Capacidad del tanque, para mostrar el equivalente en litros. */
  capacidad?: number;
  tono?: 'neutro' | 'acento';
}

/**
 * Medidor tipo aguja del tablero: se arrastra en pasos de 1/8 de tanque,
 * que es la resolución real con la que uno lee el instrumento del auto.
 */
export function NivelTanque({ label, valor, onChange, capacidad, tono = 'acento' }: Props) {
  const pct = Math.round(valor * 100);
  const litros = capacidad ? valor * capacidad : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-carbon-400">
          {label}
        </span>
        <span className="num text-sm font-semibold text-carbon-100">
          {pct}%
          {litros != null ? (
            <span className="ml-1 text-xs font-normal text-carbon-400">
              ≈ {fmtNumero(litros, 1)} L
            </span>
          ) : null}
        </span>
      </div>

      <div className="relative">
        <div className="h-3 w-full overflow-hidden rounded-full bg-carbon-700">
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-150',
              tono === 'acento' ? 'bg-ambar-500' : 'bg-carbon-400',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.125}
          value={valor}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          className="absolute inset-0 h-3 w-full cursor-pointer opacity-0"
        />
        <div
          className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-carbon-950 bg-carbon-100 shadow"
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
              Math.abs(valor - m.valor) < 0.001 ? 'text-ambar-400' : 'text-carbon-500',
            )}
          >
            {m.texto}
          </button>
        ))}
      </div>
    </div>
  );
}

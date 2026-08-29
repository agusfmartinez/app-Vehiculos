import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

export interface Chip {
  valor: string;
  label: string;
}

interface ChipsProps {
  opciones: Chip[];
  valor: string;
  onChange: (v: string) => void;
  /** Etiqueta accesible de la fila de filtros. */
  label: string;
}

/** Píxeles de movimiento a partir de los cuales fue arrastre y no un clic. */
const UMBRAL_ARRASTRE = 6;

/**
 * Fila de filtros que se arrastra en horizontal.
 *
 * El `-mx-4 px-4` hace que el área desplazable llegue hasta el borde de la
 * pantalla en vez de cortarse contra el padding del contenedor, así el último
 * chip no queda partido. `touch-pan-x` deja que el gesto horizontal sea del
 * carrusel y el vertical siga siendo scroll de página.
 *
 * En mobile alcanza con el scroll nativo; el mouse no arrastra contenedores con
 * scroll, así que en desktop se emula con pointer events. Los degradados de los
 * costados avisan que hay más chips fuera de la vista.
 */
export function Chips({ opciones, valor, onChange, label }: ChipsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const arrastre = useRef({ activo: false, x0: 0, scroll0: 0, movio: false });
  const [bordes, setBordes] = useState({ izq: false, der: false });

  const medir = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setBordes({ izq: el.scrollLeft > 1, der: el.scrollLeft < max - 1 });
  }, []);

  useEffect(() => {
    medir();
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [medir, opciones]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // El touch ya tiene scroll nativo: sólo emulamos para mouse.
    if (e.pointerType === 'touch' || !ref.current) return;
    arrastre.current = {
      activo: true,
      x0: e.clientX,
      scroll0: ref.current.scrollLeft,
      movio: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const a = arrastre.current;
    if (!a.activo || !ref.current) return;
    const dx = e.clientX - a.x0;
    if (!a.movio && Math.abs(dx) > UMBRAL_ARRASTRE) {
      a.movio = true;
      ref.current.setPointerCapture(e.pointerId);
    }
    if (a.movio) ref.current.scrollLeft = a.scroll0 - dx;
  };

  const terminar = () => {
    arrastre.current.activo = false;
    // El flag `movio` se limpia después del click, que llega justo detrás.
    setTimeout(() => {
      arrastre.current.movio = false;
    }, 0);
  };

  if (opciones.length <= 1) return null;

  return (
    <div className="relative -mx-4">
      <div
        ref={ref}
        role="group"
        aria-label={label}
        onScroll={medir}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={terminar}
        onPointerCancel={terminar}
        className="sin-scrollbar flex touch-pan-x cursor-grab gap-2 overflow-x-auto px-4 pb-1 active:cursor-grabbing"
      >
        {opciones.map((o) => (
          <button
            key={o.valor}
            type="button"
            onClick={() => {
              if (arrastre.current.movio) return;
              onChange(o.valor);
            }}
            aria-pressed={valor === o.valor}
            className={cn(
              'shrink-0 select-none whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              valor === o.valor
                ? 'border-ambar-500 bg-ambar-500/15 text-ambar-300'
                : 'border-carbon-600 bg-carbon-800 text-carbon-300',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      {bordes.izq ? (
        <span className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-carbon-900 to-transparent" />
      ) : null}
      {bordes.der ? (
        <span className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-carbon-900 to-transparent" />
      ) : null}
    </div>
  );
}

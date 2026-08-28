import { useEffect, useRef, useState } from 'react';
import { Car, Check, ChevronDown, Plus } from 'lucide-react';
import { useDatos } from '@/context/DatosContext';
import { cn } from '@/lib/cn';
import { fmtNumero } from '@/lib/format';

function nombreVehiculo(marca: string, modelo: string, patente: string): string {
  const nombre = [marca, modelo].filter(Boolean).join(' ');
  return nombre || patente || 'Vehículo sin nombre';
}

/**
 * Conmutador de vehículo activo. Sólo aparece cuando hay más de uno cargado:
 * con un único auto sería ruido en la pantalla.
 */
export function SelectorVehiculo({ onNuevo }: { onNuevo: () => void }) {
  const { vehiculos, activo, seleccionarVehiculo } = useDatos();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', alClick);
    return () => document.removeEventListener('mousedown', alClick);
  }, [abierto]);

  if (vehiculos.length <= 1 || !activo) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-carbon-700 bg-carbon-800 px-3 py-2.5 text-left"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="h-3 w-3 shrink-0 rounded-full border border-carbon-600"
            style={{ background: activo.color ?? '#c8ced8' }}
          />
          <span className="truncate text-sm font-medium text-carbon-100">
            {nombreVehiculo(activo.marca, activo.modelo, activo.patente)}
          </span>
          {activo.patente ? (
            <span className="num shrink-0 text-xs text-carbon-500">{activo.patente}</span>
          ) : null}
        </span>
        <ChevronDown
          size={16}
          className={cn('shrink-0 text-carbon-400 transition-transform', abierto && 'rotate-180')}
        />
      </button>

      {abierto ? (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-carbon-600 bg-carbon-800 shadow-xl shadow-black/50">
          <ul>
            {vehiculos.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => {
                    seleccionarVehiculo(v.id);
                    setAbierto(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-carbon-700"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border border-carbon-600"
                    style={{ background: v.color ?? '#c8ced8' }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-carbon-100">
                      {nombreVehiculo(v.marca, v.modelo, v.patente)}
                    </span>
                    <span className="num block text-xs text-carbon-500">
                      {fmtNumero(v.kmActual)} km
                      {v.patente ? ` · ${v.patente}` : ''}
                    </span>
                  </span>
                  {v.id === activo.id ? (
                    <Check size={16} className="shrink-0 text-ambar-400" />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              setAbierto(false);
              onNuevo();
            }}
            className="flex w-full items-center gap-2 border-t border-carbon-700 px-3 py-2.5 text-sm text-ambar-400 transition-colors hover:bg-carbon-700"
          >
            <Plus size={15} />
            Agregar vehículo
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Cartel para cuando todavía no hay ningún vehículo cargado. */
export function SinVehiculo({ onNuevo }: { onNuevo: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-carbon-600 bg-carbon-850/60 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-carbon-700 text-ambar-400">
        <Car size={22} />
      </div>
      <h3 className="text-base font-semibold text-carbon-100">Todavía no hay vehículos</h3>
      <p className="max-w-xs text-sm text-carbon-400">
        Cargá tu primer auto para empezar a registrar services, naftas y VTV. Después podés
        agregar más.
      </p>
      <button
        type="button"
        onClick={onNuevo}
        className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-xl bg-ambar-500 px-3 text-sm font-semibold text-carbon-950"
      >
        <Plus size={16} />
        Agregar vehículo
      </button>
    </div>
  );
}

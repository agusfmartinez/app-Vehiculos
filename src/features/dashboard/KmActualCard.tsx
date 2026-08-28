import { useEffect, useState } from 'react';
import { Check, Gauge, Pencil, X } from 'lucide-react';
import { useDatos } from '@/context/DatosContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { fmtNumero } from '@/lib/format';

/** Odómetro del tablero: se edita en el lugar, sin salir del dashboard. */
export function KmActualCard() {
  const { activo, setKmActual } = useDatos();
  const kmActual = activo?.kmActual ?? 0;

  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState(String(kmActual));

  useEffect(() => {
    if (!editando) setBorrador(String(kmActual));
  }, [kmActual, editando]);

  if (!activo) return null;

  const guardar = () => {
    const n = Number(borrador.replace(/[^\d]/g, ''));
    if (Number.isFinite(n) && n >= 0) setKmActual(n);
    setEditando(false);
  };

  const nombre = [activo.marca, activo.modelo].filter(Boolean).join(' ');

  return (
    <Card className="relative overflow-hidden border-carbon-600 bg-gradient-to-b from-carbon-800 to-carbon-850">
      <div className="p-5">
        <div className="mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-carbon-400">
            <Gauge size={13} />
            Odómetro
          </span>
          {!editando ? (
            <Button
              variante="fantasma"
              tamanio="sm"
              onClick={() => setEditando(true)}
              icono={<Pencil size={14} />}
            >
              Editar
            </Button>
          ) : null}
        </div>

        {editando ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              inputMode="numeric"
              value={borrador}
              onChange={(e) => setBorrador(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') guardar();
                if (e.key === 'Escape') setEditando(false);
              }}
              className="num w-full rounded-xl border border-ambar-500 bg-carbon-950 px-3 py-2 text-3xl font-bold text-ambar-400 focus:outline-none"
            />
            <Button variante="primario" onClick={guardar} aria-label="Guardar km" className="px-3">
              <Check size={18} />
            </Button>
            <Button
              variante="secundario"
              onClick={() => setEditando(false)}
              aria-label="Cancelar"
              className="px-3"
            >
              <X size={18} />
            </Button>
          </div>
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="num text-4xl font-bold tracking-tight text-ambar-400">
              {fmtNumero(kmActual)}
            </span>
            <span className="text-sm font-medium text-carbon-400">km</span>
          </div>
        )}

        <p className="mt-2 text-xs text-carbon-500">
          {nombre
            ? `${nombre}${activo.patente ? ` · ${activo.patente}` : ''}`
            : 'Completá los datos en la pestaña Vehículo'}
        </p>
      </div>
    </Card>
  );
}

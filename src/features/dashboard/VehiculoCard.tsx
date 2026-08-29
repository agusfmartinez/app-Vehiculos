import { Link } from 'react-router-dom';
import { Car, ChevronRight, Gauge } from 'lucide-react';
import { useDatos } from '@/context/DatosContext';
import { Card } from '@/components/ui/Card';
import { fmtNumero } from '@/lib/format';

/**
 * Tarjeta principal del tablero: identidad del vehículo + odómetro de sólo
 * lectura. Los km no se editan acá: salen del registro más alto (mediciones,
 * cargas, services) o de la ficha del vehículo.
 */
export function VehiculoCard() {
  const { activo, kmMaxRegistrado } = useDatos();
  if (!activo) return null;

  const kmActual = Math.max(activo.kmActual ?? 0, kmMaxRegistrado);
  const nombre = [activo.marca, activo.modelo].filter(Boolean).join(' ');

  return (
    <Link to="/vehiculo" className="block">
      <Card className="relative overflow-hidden border-carbon-600 bg-gradient-to-b from-carbon-800 to-carbon-850 transition-colors hover:border-carbon-500">
        <div className="p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="h-10 w-10 shrink-0 rounded-xl border border-carbon-600"
                style={{ background: activo.color ?? '#c8ced8' }}
              />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-carbon-100">
                  {nombre || 'Mi vehículo'}
                </p>
                <p className="num truncate text-xs text-carbon-400">
                  {activo.anio} · {activo.patente || 'sin patente'}
                  {activo.capacidadTanque ? ` · tanque ${activo.capacidadTanque} L` : ''}
                </p>
              </div>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-ambar-400">
              <Car size={14} />
              Mi vehículo
              <ChevronRight size={16} />
            </span>
          </div>

          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-carbon-400">
            <Gauge size={13} />
            Odómetro
          </span>
          <div className="flex items-baseline gap-2">
            <span className="num text-4xl font-bold tracking-tight text-ambar-400">
              {fmtNumero(kmActual)}
            </span>
            <span className="text-sm font-medium text-carbon-400">km</span>
          </div>
          <p className="mt-1 text-xs text-carbon-500">
            Se actualiza con el último registro de km
          </p>
        </div>
      </Card>
    </Link>
  );
}

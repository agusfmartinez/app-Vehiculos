import { Fuel, Gauge } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { fmtNumero } from '@/lib/format';
import { NIVEL_RESERVA, enReserva, type EstadoTanque } from '@/lib/calculos';

const MOTIVOS: Record<string, string> = {
  'sin-capacidad': 'Falta la capacidad del tanque en la ficha del vehículo.',
  'sin-autonomia':
    'Falta saber cuánto consume: hacen falta dos cargas con tanque lleno, o dos mediciones del medidor.',
  'sin-referencia':
    'No hay ningún nivel conocido todavía. Registrá una medición o una carga a tanque lleno.',
};

interface Props {
  estado: EstadoTanque;
  capacidad?: number;
  onMedir: () => void;
}

/** Cuánta nafta queda ahora, deducida del último nivel conocido y los km hechos. */
export function TanqueCard({ estado, capacidad, onMedir }: Props) {
  const { litros, nivel, autonomiaRestante, motivo } = estado;

  if (motivo) {
    return (
      <Card>
        <CardBody className="flex flex-col gap-3">
          <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-carbon-400">
            <Fuel size={13} />
            Nafta en el tanque
          </span>
          <p className="text-sm text-carbon-400">{MOTIVOS[motivo]}</p>
          <Button
            variante="secundario"
            tamanio="sm"
            icono={<Gauge size={15} />}
            onClick={onMedir}
            className="self-start"
          >
            Medir tanque
          </Button>
        </CardBody>
      </Card>
    );
  }

  const pct = Math.round((nivel ?? 0) * 100);
  // Bajo un cuarto de tanque el aviso pasa a ámbar; en reserva (1/8), a rojo.
  const tono = enReserva(nivel) ? 'peligro' : pct <= 25 ? 'alerta' : 'ok';
  const colorBarra =
    tono === 'peligro' ? 'bg-rojo-500' : tono === 'alerta' ? 'bg-ambar-500' : 'bg-verde-500';
  const colorTexto =
    tono === 'peligro' ? 'text-rojo-500' : tono === 'alerta' ? 'text-ambar-400' : 'text-verde-500';

  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-carbon-400">
            <Fuel size={13} />
            Nafta en el tanque
          </span>
          <Button
            variante="fantasma"
            tamanio="sm"
            icono={<Gauge size={14} />}
            onClick={onMedir}
            className="-my-1"
          >
            Medir
          </Button>
        </div>

        <div className="flex items-baseline gap-2">
          <span className={cn('num text-3xl font-bold leading-none', colorTexto)}>
            {fmtNumero(litros, 1)}
          </span>
          <span className="text-sm font-medium text-carbon-400">
            L de {fmtNumero(capacidad)} L
          </span>
          <span className="num ml-auto text-sm font-semibold text-carbon-300">{pct}%</span>
        </div>

        <div className="relative h-3 w-full overflow-hidden rounded-full bg-carbon-700">
          {/* Zona de reserva: el primer octavo del medidor va en rojo, como en el auto. */}
          <div
            className="absolute inset-y-0 left-0 bg-rojo-500/25"
            style={{ width: `${NIVEL_RESERVA * 100}%` }}
          />
          <div
            className={cn('relative h-full rounded-full transition-[width]', colorBarra)}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs text-carbon-400">Alcanza para</span>
          <span className="num text-sm font-semibold text-carbon-100">
            ~{fmtNumero(autonomiaRestante)} km
          </span>
        </div>
      </CardBody>
    </Card>
  );
}

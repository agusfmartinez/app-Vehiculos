import { useState } from 'react';
import { Info } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NivelTanque } from '@/features/combustible/NivelTanque';
import { hoyISO } from '@/lib/format';
import type { LecturaTanque } from '@/types';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onGuardar: (
    l: Omit<LecturaTanque, 'id' | 'vehiculoId'> & { id?: string; vehiculoId?: string },
  ) => void;
  inicial?: LecturaTanque;
  kmSugerido: number;
  capacidadTanque?: number;
}

interface Borrador {
  fecha: string;
  km: string;
  nivel: number;
  nota: string;
}

function borradorDesde(l: LecturaTanque | undefined, kmSugerido: number): Borrador {
  return {
    fecha: l?.fecha ?? hoyISO(),
    km: l ? String(l.km) : kmSugerido ? String(kmSugerido) : '',
    nivel: l?.nivel ?? 0.5,
    nota: l?.nota ?? '',
  };
}

/** Registra el nivel de la aguja sin cargar nafta. */
export function LecturaForm({
  abierto,
  onCerrar,
  onGuardar,
  inicial,
  kmSugerido,
  capacidadTanque,
}: Props) {
  const [b, setB] = useState<Borrador>(() => borradorDesde(inicial, kmSugerido));
  const [errores, setErrores] = useState<Record<string, string>>({});

  const [claveAbierta, setClaveAbierta] = useState('');
  const claveActual = `${abierto}-${inicial?.id ?? 'nuevo'}`;
  if (abierto && claveAbierta !== claveActual) {
    setClaveAbierta(claveActual);
    setB(borradorDesde(inicial, kmSugerido));
    setErrores({});
  }

  const validar = (): boolean => {
    const e: Record<string, string> = {};
    if (!b.fecha) e.fecha = 'Poné la fecha de la medición.';
    const km = Number(b.km);
    if (!b.km || !Number.isFinite(km) || km < 0) e.km = 'Kilometraje inválido.';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const guardar = () => {
    if (!validar()) return;
    onGuardar({
      id: inicial?.id,
      vehiculoId: inicial?.vehiculoId,
      fecha: b.fecha,
      km: Number(b.km),
      nivel: b.nivel,
      nota: b.nota.trim() || undefined,
    });
    onCerrar();
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={inicial ? 'Editar medición' : 'Medir tanque'}
      pie={
        <>
          <Button ancho onClick={onCerrar}>
            Cancelar
          </Button>
          <Button ancho variante="primario" onClick={guardar}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="flex items-start gap-2 text-xs text-carbon-400">
          <Info size={14} className="mt-0.5 shrink-0 text-ambar-400" />
          Anotá dónde está la aguja y el kilometraje, sin cargar nafta. Sirve para saber cuánto te
          queda y para medir el consumo entre dos mediciones.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Fecha"
            type="date"
            value={b.fecha}
            onChange={(e) => setB((p) => ({ ...p, fecha: e.target.value }))}
            error={errores.fecha}
          />
          <Input
            label="Kilometraje"
            mono
            type="number"
            inputMode="numeric"
            sufijo="km"
            value={b.km}
            onChange={(e) => setB((p) => ({ ...p, km: e.target.value }))}
            error={errores.km}
          />
        </div>

        <div className="rounded-xl border border-carbon-600 bg-carbon-850 p-3">
          <NivelTanque
            label="Aguja del tablero"
            valor={b.nivel}
            onChange={(v) => setB((p) => ({ ...p, nivel: v }))}
            capacidad={capacidadTanque}
          />
        </div>

        {!capacidadTanque ? (
          <p className="text-xs text-carbon-500">
            Cargá la capacidad del tanque en la ficha del vehículo para ver el equivalente en
            litros y poder calcular el consumo entre mediciones.
          </p>
        ) : null}

        <Input
          label="Nota"
          value={b.nota}
          onChange={(e) => setB((p) => ({ ...p, nota: e.target.value }))}
          placeholder="Opcional — ej: antes de salir a Mar del Plata"
        />
      </div>
    </Modal>
  );
}

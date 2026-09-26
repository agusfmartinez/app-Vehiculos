import { useMemo, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NivelTanque } from '@/features/combustible/NivelTanque';
import { previsualizarMedicion } from '@/lib/calculos';
import { fmtNumero, hoyISO } from '@/lib/format';
import type { CargaCombustible, LecturaTanque } from '@/types';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onGuardar: (
    l: Omit<LecturaTanque, 'id' | 'vehiculoId'> & { id?: string; vehiculoId?: string },
  ) => void;
  inicial?: LecturaTanque;
  kmSugerido: number;
  capacidadTanque?: number;
  /** Última aguja conocida (carga o medición): punto de partida de una medición nueva. */
  nivelSugerido?: number;
  /** Para avisar antes de guardar si esta medición va a dar "tramo corto". */
  cargas: CargaCombustible[];
  promedioKmPorLitro?: number | null;
}

interface Borrador {
  fecha: string;
  km: string;
  nivel: number;
  nota: string;
}

function borradorDesde(
  l: LecturaTanque | undefined,
  kmSugerido: number,
  nivelSugerido: number | undefined,
): Borrador {
  return {
    fecha: l?.fecha ?? hoyISO(),
    km: l ? String(l.km) : kmSugerido ? String(kmSugerido) : '',
    // Arranca de la última aguja conocida en vez de un 50% arbitrario.
    nivel: l?.nivel ?? nivelSugerido ?? 0.5,
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
  nivelSugerido,
  cargas,
  promedioKmPorLitro,
}: Props) {
  const [b, setB] = useState<Borrador>(() => borradorDesde(inicial, kmSugerido, nivelSugerido));
  const [errores, setErrores] = useState<Record<string, string>>({});

  // Prueba el tramo ANTES de guardar: si va a quedar corto para medir, mejor
  // avisar acá que dejar que el usuario lo descubra después en la lista.
  const previa = useMemo(
    () => previsualizarMedicion(cargas, [], capacidadTanque, { km: Number(b.km), nivel: b.nivel }),
    [cargas, capacidadTanque, b.km, b.nivel],
  );
  // La aguja quedó igual o arriba de la carga: sin una carga real en el medio
  // eso no puede pasar, así que ni se deja guardar (a diferencia del "bajó
  // poco", que es un dato válido aunque no alcance para medir consumo). Chequea
  // el signo directo, no el descarte: si el margen es chico cae en
  // 'bajo-resolucion', si es grande en 'implausible' — los dos son el mismo
  // problema acá.
  const agujaSubio = previa != null && previa.litrosConsumidos <= 0;
  const tramoCorto = !agujaSubio && previa?.descarte === 'bajo-resolucion' ? previa : null;
  const kmFaltantes =
    tramoCorto?.litrosFaltantes != null && promedioKmPorLitro
      ? Math.round(tramoCorto.litrosFaltantes * promedioKmPorLitro)
      : null;

  // Repobla en cada apertura (ver comentario en CargaForm): si sólo mirara
  // el id, reabrir para otra medición nueva no refrescaba nivelSugerido.
  const [abiertoAntes, setAbiertoAntes] = useState(false);
  if (abierto && !abiertoAntes) {
    setAbiertoAntes(true);
    setB(borradorDesde(inicial, kmSugerido, nivelSugerido));
    setErrores({});
  } else if (!abierto && abiertoAntes) {
    setAbiertoAntes(false);
  }

  const validar = (): boolean => {
    const e: Record<string, string> = {};
    if (!b.fecha) e.fecha = 'Poné la fecha de la medición.';
    const km = Number(b.km);
    if (!b.km || !Number.isFinite(km) || km < 0) e.km = 'Kilometraje inválido.';
    if (agujaSubio) {
      e.nivel = 'No puede quedar igual o arriba de la última carga sin una carga real en el medio.';
    }
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
          <Button ancho tamanio="sm" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button ancho tamanio="sm" variante="primario" onClick={guardar} disabled={agujaSubio}>
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
            error={errores.nivel}
          />
        </div>

        {!capacidadTanque ? (
          <p className="text-xs text-carbon-500">
            Cargá la capacidad del tanque en la ficha del vehículo para ver el equivalente en
            litros y poder calcular el consumo entre mediciones.
          </p>
        ) : null}

        {agujaSubio ? (
          <p className="flex items-start gap-1.5 rounded-lg bg-rojo-500/10 px-2 py-1.5 text-xs text-rojo-500">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>
              Esta aguja queda igual o por encima de como cerró la última carga — sin una carga real
              en el medio, eso no puede pasar. Bajala hasta que quede claramente por debajo para
              poder guardar.
            </span>
          </p>
        ) : tramoCorto ? (
          <p className="flex items-start gap-1.5 rounded-lg bg-rojo-500/10 px-2 py-1.5 text-xs text-rojo-500">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>
              Con esta aguja va a quedar "tramo corto": desde la última carga se calcula recién cada{' '}
              {fmtNumero(tramoCorto.litrosFaltantes! + tramoCorto.litrosConsumidos, 1)} L. Te faltan
              ~{fmtNumero(tramoCorto.litrosFaltantes!, 1)} L
              {kmFaltantes != null ? ` (unos ${fmtNumero(kmFaltantes)} km más)` : ''} para que esta
              medición dé un consumo confiable. Igual se puede guardar.
            </span>
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

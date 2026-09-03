import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { hoyISO, parseFecha } from '@/lib/format';
import type { RegistroVTV, ResultadoVTV } from '@/types';

const RESULTADOS: { value: ResultadoVTV; label: string }[] = [
  { value: 'aprobada', label: 'Aprobada' },
  { value: 'rechazada', label: 'Rechazada' },
  { value: 'pendiente', label: 'Pendiente' },
];

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onGuardar: (
    v: Omit<RegistroVTV, 'id' | 'vehiculoId'> & { id?: string; vehiculoId?: string },
  ) => void;
  inicial?: RegistroVTV;
}

interface Borrador {
  fechaRealizada: string;
  fechaVencimiento: string;
  resultado: ResultadoVTV;
  costo: string;
  observaciones: string;
}

/** Sugerencia por defecto: la VTV suele valer un año desde que se hizo. */
function vencimientoSugerido(fechaRealizada: string): string {
  const d = parseFecha(fechaRealizada);
  if (Number.isNaN(d.getTime())) return '';
  d.setFullYear(d.getFullYear() + 1);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function borradorDesde(v: RegistroVTV | undefined): Borrador {
  const fecha = v?.fechaRealizada ?? hoyISO();
  return {
    fechaRealizada: fecha,
    fechaVencimiento: v?.fechaVencimiento ?? vencimientoSugerido(fecha),
    resultado: v?.resultado ?? 'aprobada',
    costo: v?.costo != null ? String(v.costo) : '',
    observaciones: v?.observaciones ?? '',
  };
}

export function VtvForm({ abierto, onCerrar, onGuardar, inicial }: Props) {
  const [b, setB] = useState<Borrador>(() => borradorDesde(inicial));
  const [errores, setErrores] = useState<Record<string, string>>({});

  // Repobla en cada apertura (ver comentario en CargaForm): si sólo mirara
  // el id, reabrir para otra alta nueva no refrescaba el borrador.
  const [abiertoAntes, setAbiertoAntes] = useState(false);
  if (abierto && !abiertoAntes) {
    setAbiertoAntes(true);
    setB(borradorDesde(inicial));
    setErrores({});
  } else if (!abierto && abiertoAntes) {
    setAbiertoAntes(false);
  }

  const onFechaRealizada = (valor: string) => {
    setB((p) => ({
      ...p,
      fechaRealizada: valor,
      // Reajusta el vencimiento sólo si venía del valor sugerido.
      fechaVencimiento:
        p.fechaVencimiento === vencimientoSugerido(p.fechaRealizada) || !p.fechaVencimiento
          ? vencimientoSugerido(valor)
          : p.fechaVencimiento,
    }));
  };

  const validar = (): boolean => {
    const e: Record<string, string> = {};
    if (!b.fechaRealizada) e.fechaRealizada = 'Poné la fecha en que la hiciste.';
    if (!b.fechaVencimiento) e.fechaVencimiento = 'Poné la fecha de vencimiento.';
    if (
      b.fechaRealizada &&
      b.fechaVencimiento &&
      parseFecha(b.fechaVencimiento) < parseFecha(b.fechaRealizada)
    ) {
      e.fechaVencimiento = 'El vencimiento no puede ser anterior a la fecha de la VTV.';
    }
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const guardar = () => {
    if (!validar()) return;
    const costo = Number(b.costo);
    onGuardar({
      id: inicial?.id,
      vehiculoId: inicial?.vehiculoId,
      fechaRealizada: b.fechaRealizada,
      fechaVencimiento: b.fechaVencimiento,
      resultado: b.resultado,
      costo: b.costo && Number.isFinite(costo) ? costo : undefined,
      observaciones: b.observaciones.trim() || undefined,
    });
    onCerrar();
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={inicial ? 'Editar VTV' : 'Nueva VTV'}
      pie={
        <>
          <Button ancho tamanio="sm" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button ancho tamanio="sm" variante="primario" onClick={guardar}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Input
          label="Fecha realizada"
          type="date"
          value={b.fechaRealizada}
          onChange={(e) => onFechaRealizada(e.target.value)}
          error={errores.fechaRealizada}
        />
        <Input
          label="Vence"
          type="date"
          value={b.fechaVencimiento}
          onChange={(e) => setB((p) => ({ ...p, fechaVencimiento: e.target.value }))}
          error={errores.fechaVencimiento}
          hint="Se sugiere un año desde la fecha realizada; ajustalo según lo que diga la oblea."
        />
        <Select
          label="Resultado"
          value={b.resultado}
          onChange={(e) => setB((p) => ({ ...p, resultado: e.target.value as ResultadoVTV }))}
          opciones={RESULTADOS}
        />
        <Input
          label="Costo"
          mono
          type="number"
          inputMode="decimal"
          prefijo="$"
          value={b.costo}
          onChange={(e) => setB((p) => ({ ...p, costo: e.target.value }))}
          placeholder="Opcional"
        />
        <Textarea
          label="Observaciones"
          value={b.observaciones}
          onChange={(e) => setB((p) => ({ ...p, observaciones: e.target.value }))}
          placeholder="Ej: rechazada por luces, reverificar antes del 30/09"
        />
      </div>
    </Modal>
  );
}

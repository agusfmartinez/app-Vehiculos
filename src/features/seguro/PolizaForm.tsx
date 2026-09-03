import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { periodoActual } from '@/lib/periodos';
import { COBERTURAS, type Poliza } from '@/types';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onGuardar: (p: Omit<Poliza, 'id' | 'vehiculoId'> & { id?: string; vehiculoId?: string }) => void;
  inicial?: Poliza;
  /** Última póliza cargada: precarga aseguradora y cobertura. */
  anterior?: Poliza;
  /** Períodos ya cargados, para avisar si se repite. */
  periodosUsados: string[];
}

interface Borrador {
  periodo: string;
  aseguradora: string;
  monto: string;
  cobertura: string;
  numeroPoliza: string;
  vencimiento: string;
  notas: string;
}

function borradorDesde(p: Poliza | undefined, anterior: Poliza | undefined): Borrador {
  return {
    periodo: p?.periodo ?? periodoActual(),
    // En un alta nueva casi siempre es la misma compañía del mes pasado.
    aseguradora: p?.aseguradora ?? anterior?.aseguradora ?? '',
    monto: p?.monto != null ? String(p.monto) : '',
    cobertura: p?.cobertura ?? anterior?.cobertura ?? COBERTURAS[1],
    numeroPoliza: p?.numeroPoliza ?? anterior?.numeroPoliza ?? '',
    vencimiento: p?.vencimiento ?? '',
    notas: p?.notas ?? '',
  };
}

export function PolizaForm({
  abierto,
  onCerrar,
  onGuardar,
  inicial,
  anterior,
  periodosUsados,
}: Props) {
  const [b, setB] = useState<Borrador>(() => borradorDesde(inicial, anterior));
  const [errores, setErrores] = useState<Record<string, string>>({});

  // Repobla en cada apertura (ver comentario en CargaForm): si sólo mirara
  // el id, reabrir para otra alta nueva no refrescaba "anterior".
  const [abiertoAntes, setAbiertoAntes] = useState(false);
  if (abierto && !abiertoAntes) {
    setAbiertoAntes(true);
    setB(borradorDesde(inicial, anterior));
    setErrores({});
  } else if (!abierto && abiertoAntes) {
    setAbiertoAntes(false);
  }

  const set = (k: keyof Borrador) => (v: string) => setB((p) => ({ ...p, [k]: v }));

  const repetido =
    b.periodo !== inicial?.periodo && periodosUsados.includes(b.periodo) ? b.periodo : null;

  const validar = (): boolean => {
    const e: Record<string, string> = {};
    if (!/^\d{4}-\d{2}$/.test(b.periodo)) e.periodo = 'Elegí el mes de la póliza.';
    if (!b.aseguradora.trim()) e.aseguradora = 'Poné la aseguradora.';
    const monto = Number(b.monto);
    if (!b.monto || !Number.isFinite(monto) || monto <= 0) e.monto = 'Monto inválido.';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const guardar = () => {
    if (!validar()) return;
    onGuardar({
      id: inicial?.id,
      vehiculoId: inicial?.vehiculoId,
      periodo: b.periodo,
      aseguradora: b.aseguradora.trim(),
      monto: Number(b.monto),
      cobertura: b.cobertura || undefined,
      numeroPoliza: b.numeroPoliza.trim() || undefined,
      vencimiento: b.vencimiento || undefined,
      notas: b.notas.trim() || undefined,
    });
    onCerrar();
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={inicial ? 'Editar póliza' : 'Nueva póliza'}
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
          label="Mes de la póliza"
          type="month"
          value={b.periodo}
          onChange={(e) => set('periodo')(e.target.value)}
          error={errores.periodo}
          hint={repetido ? 'Ya hay una póliza cargada para ese mes.' : undefined}
        />

        <Input
          label="Aseguradora"
          value={b.aseguradora}
          onChange={(e) => set('aseguradora')(e.target.value)}
          placeholder="Ej: Rivadavia"
          error={errores.aseguradora}
        />

        <Input
          label="Monto de la cuota"
          mono
          type="number"
          inputMode="decimal"
          prefijo="$"
          value={b.monto}
          onChange={(e) => set('monto')(e.target.value)}
          placeholder="0"
          error={errores.monto}
        />

        <Select
          label="Cobertura"
          value={b.cobertura}
          onChange={(e) => set('cobertura')(e.target.value)}
          opciones={COBERTURAS.map((c) => ({ value: c, label: c }))}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="N° de póliza"
            value={b.numeroPoliza}
            onChange={(e) => set('numeroPoliza')(e.target.value)}
            placeholder="Opcional"
          />
          <Input
            label="Vence"
            type="date"
            value={b.vencimiento}
            onChange={(e) => set('vencimiento')(e.target.value)}
          />
        </div>

        <Textarea
          label="Notas"
          value={b.notas}
          onChange={(e) => set('notas')(e.target.value)}
          placeholder="Opcional — ej: incluye granizo"
        />
      </div>
    </Modal>
  );
}

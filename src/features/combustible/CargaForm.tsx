import { useState } from 'react';
import { Info } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Toggle } from '@/components/ui/Input';
import { NivelTanque } from '@/features/combustible/NivelTanque';
import { cn } from '@/lib/cn';
import { fmtDinero, fmtNumero, hoyISO } from '@/lib/format';
import { TIPOS_COMBUSTIBLE, type CargaCombustible, type TipoCombustible } from '@/types';

type Modo = 'ticket' | 'medidor';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onGuardar: (
    c: Omit<CargaCombustible, 'id' | 'vehiculoId'> & { id?: string; vehiculoId?: string },
  ) => void;
  inicial?: CargaCombustible;
  kmSugerido: number;
  /** Último $/L cargado del mismo tipo, sólo como referencia visual. */
  referencia?: { tipo: TipoCombustible; precioPorLitro: number };
  capacidadTanque?: number;
}

interface Borrador {
  fecha: string;
  km: string;
  litros: string;
  total: string;
  tipoCombustible: TipoCombustible;
  estacion: string;
  tanqueLleno: boolean;
  nivelAntes: number;
  nivelDespues: number;
}

function borradorDesde(c: CargaCombustible | undefined, kmSugerido: number): Borrador {
  return {
    fecha: c?.fecha ?? hoyISO(),
    km: c ? String(c.km) : kmSugerido ? String(kmSugerido) : '',
    litros: c ? String(c.litros) : '',
    total: c ? String(c.total) : '',
    tipoCombustible: c?.tipoCombustible ?? 'super',
    estacion: c?.estacion ?? '',
    tanqueLleno: c?.tanqueLleno ?? true,
    nivelAntes: c?.nivelAntes ?? 0.25,
    nivelDespues: c?.nivelDespues ?? 1,
  };
}

export function CargaForm({
  abierto,
  onCerrar,
  onGuardar,
  inicial,
  kmSugerido,
  referencia,
  capacidadTanque,
}: Props) {
  const [modo, setModo] = useState<Modo>(inicial?.estimada ? 'medidor' : 'ticket');
  const [b, setB] = useState<Borrador>(() => borradorDesde(inicial, kmSugerido));
  const [errores, setErrores] = useState<Record<string, string>>({});

  const [claveAbierta, setClaveAbierta] = useState('');
  const claveActual = `${abierto}-${inicial?.id ?? 'nuevo'}`;
  if (abierto && claveAbierta !== claveActual) {
    setClaveAbierta(claveActual);
    setB(borradorDesde(inicial, kmSugerido));
    setModo(inicial?.estimada ? 'medidor' : 'ticket');
    setErrores({});
  }

  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) =>
    setB((p) => ({ ...p, [k]: v }));

  // En modo medidor los litros salen de cuánto subió la aguja por la capacidad.
  const litrosEstimados =
    capacidadTanque && b.nivelDespues > b.nivelAntes
      ? (b.nivelDespues - b.nivelAntes) * capacidadTanque
      : 0;

  const litros = modo === 'medidor' ? litrosEstimados : Number(b.litros) || 0;
  const total = Number(b.total) || 0;
  // El precio unitario se deduce: es lo que sale del ticket dividido los litros.
  const precioPorLitro = litros > 0 && total > 0 ? total / litros : 0;

  const validar = (): boolean => {
    const e: Record<string, string> = {};
    if (!b.fecha) e.fecha = 'Poné la fecha de la carga.';
    const km = Number(b.km);
    if (!b.km || !Number.isFinite(km) || km < 0) e.km = 'Kilometraje inválido.';
    if (!(litros > 0)) {
      e.litros =
        modo === 'medidor'
          ? 'El nivel final tiene que ser mayor al inicial.'
          : 'Cargá los litros del ticket.';
    }
    if (!(total > 0)) e.total = 'Cargá lo que pagaste.';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const guardar = () => {
    if (!validar()) return;
    const esMedidor = modo === 'medidor';
    onGuardar({
      id: inicial?.id,
      vehiculoId: inicial?.vehiculoId,
      fecha: b.fecha,
      km: Number(b.km),
      litros: Number(litros.toFixed(2)),
      precioPorLitro: Number(precioPorLitro.toFixed(2)),
      total: Number(total.toFixed(2)),
      tipoCombustible: b.tipoCombustible,
      estacion: b.estacion.trim() || undefined,
      // Una carga estimada nunca se toma como tanque lleno confiable salvo
      // que la aguja haya quedado efectivamente en F.
      tanqueLleno: esMedidor ? b.nivelDespues >= 0.999 : b.tanqueLleno,
      estimada: esMedidor || undefined,
      nivelAntes: esMedidor ? b.nivelAntes : undefined,
      nivelDespues: esMedidor ? b.nivelDespues : undefined,
    });
    onCerrar();
  };

  const medidorDisponible = (capacidadTanque ?? 0) > 0;
  const mismaReferencia = referencia?.tipo === b.tipoCombustible ? referencia : undefined;

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={inicial ? 'Editar carga' : 'Nueva carga'}
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
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Fecha"
            type="date"
            value={b.fecha}
            onChange={(e) => set('fecha', e.target.value)}
            error={errores.fecha}
          />
          <Input
            label="Kilometraje"
            mono
            type="number"
            inputMode="numeric"
            sufijo="km"
            value={b.km}
            onChange={(e) => set('km', e.target.value)}
            error={errores.km}
          />
        </div>

        {/* Tipo de nafta */}
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-carbon-400">
            Tipo de nafta
          </p>
          <div className="flex rounded-xl border border-carbon-600 bg-carbon-850 p-1">
            {TIPOS_COMBUSTIBLE.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => set('tipoCombustible', value)}
                className={cn(
                  'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  b.tipoCombustible === value
                    ? 'bg-ambar-500 text-carbon-950'
                    : 'text-carbon-300',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Modo de carga de litros */}
        <div className="flex rounded-xl border border-carbon-600 bg-carbon-850 p-1">
          {(
            [
              { v: 'ticket' as const, l: 'Litros del ticket' },
              { v: 'medidor' as const, l: 'Estimar con medidor' },
            ]
          ).map(({ v, l }) => (
            <button
              key={v}
              type="button"
              disabled={v === 'medidor' && !medidorDisponible}
              onClick={() => setModo(v)}
              className={cn(
                'flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                modo === v ? 'bg-carbon-600 text-carbon-100' : 'text-carbon-300',
                v === 'medidor' && !medidorDisponible && 'cursor-not-allowed opacity-40',
              )}
            >
              {l}
            </button>
          ))}
        </div>

        {modo === 'ticket' ? (
          <Input
            label="Litros cargados"
            mono
            type="number"
            inputMode="decimal"
            step="0.01"
            sufijo="L"
            value={b.litros}
            onChange={(e) => set('litros', e.target.value)}
            placeholder="0.00"
            error={errores.litros}
            hint="El número exacto sale del ticket del surtidor."
          />
        ) : (
          <div className="flex flex-col gap-4 rounded-xl border border-carbon-600 bg-carbon-850 p-3">
            <p className="flex items-start gap-2 text-xs text-carbon-400">
              <Info size={14} className="mt-0.5 shrink-0 text-ambar-400" />
              Estimación a ojo con la aguja del tablero. Sirve cuando no tenés el ticket, pero la
              autonomía calculada con estas cargas queda marcada como no confiable.
            </p>
            <NivelTanque
              label="Aguja antes de cargar"
              valor={b.nivelAntes}
              onChange={(v) => set('nivelAntes', v)}
              capacidad={capacidadTanque}
              tono="neutro"
            />
            <NivelTanque
              label="Aguja después de cargar"
              valor={b.nivelDespues}
              onChange={(v) => set('nivelDespues', v)}
              capacidad={capacidadTanque}
            />
            <div className="flex items-baseline justify-between border-t border-carbon-700 pt-3">
              <span className="text-xs uppercase tracking-wider text-carbon-400">
                Litros estimados
              </span>
              <span className="num text-lg font-bold text-ambar-400">
                {fmtNumero(litrosEstimados, 2)} L
              </span>
            </div>
            {errores.litros ? <p className="text-xs text-rojo-500">{errores.litros}</p> : null}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Total pagado"
            mono
            type="number"
            inputMode="decimal"
            step="0.01"
            prefijo="$"
            value={b.total}
            onChange={(e) => set('total', e.target.value)}
            placeholder="0"
            error={errores.total}
          />
          <Input
            label="Estación"
            value={b.estacion}
            onChange={(e) => set('estacion', e.target.value)}
            placeholder="Opcional"
          />
        </div>

        {/* El precio unitario ya no se carga: se calcula solo */}
        <div className="flex items-baseline justify-between rounded-xl border border-ambar-500/30 bg-ambar-500/10 px-3 py-3">
          <span className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wider text-ambar-300">
              Precio por litro
            </span>
            <span className="text-[11px] text-carbon-400">
              {precioPorLitro > 0 ? 'Calculado: total ÷ litros' : 'Cargá litros y total'}
              {mismaReferencia
                ? ` · última ${TIPOS_COMBUSTIBLE.find((t) => t.value === mismaReferencia.tipo)?.label}: ${fmtDinero(mismaReferencia.precioPorLitro, 2)}`
                : ''}
            </span>
          </span>
          <span className="num text-xl font-bold text-ambar-400">
            {precioPorLitro > 0 ? `${fmtDinero(precioPorLitro, 2)}/L` : '—'}
          </span>
        </div>

        {modo === 'ticket' ? (
          <Toggle
            label="Tanque lleno"
            descripcion="Necesario en dos cargas seguidas para calcular la autonomía real."
            checked={b.tanqueLleno}
            onChange={(v) => set('tanqueLleno', v)}
          />
        ) : null}
      </div>
    </Modal>
  );
}

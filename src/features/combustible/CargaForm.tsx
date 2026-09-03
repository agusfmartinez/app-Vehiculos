import { useState } from 'react';
import { Info } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Toggle } from '@/components/ui/Input';
import { NivelTanque } from '@/features/combustible/NivelTanque';
import { fmtDinero, fmtNumero, hoyISO } from '@/lib/format';
import { TIPOS_COMBUSTIBLE, type CargaCombustible, type TipoCombustible } from '@/types';

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
  /** Última aguja conocida (carga o medición): punto de partida de una carga nueva. */
  nivelSugerido?: number;
}

interface Borrador {
  fecha: string;
  km: string;
  litros: string;
  total: string;
  tipoCombustible: TipoCombustible;
  estacion: string;
  /** null hasta que se marca: no hay default razonable para la aguja. */
  nivelAntes: number | null;
  nivelDespues: number | null;
  /**
   * Cuál de los dos campos manda: escribir los litros recalcula la aguja de
   * después, y arrastrar esa aguja recalcula los litros. El último que se
   * tocó es la fuente; el otro es la consecuencia.
   */
  fuente: 'litros' | 'aguja';
}

function borradorDesde(
  c: CargaCombustible | undefined,
  kmSugerido: number,
  nivelSugerido: number | undefined,
): Borrador {
  // Una carga nueva arranca desde la última aguja conocida (carga o medición),
  // no desde cero: antes de tocar nada, "antes" y "después" son lo mismo.
  const nivelInicial = c ? null : (nivelSugerido ?? null);
  return {
    fecha: c?.fecha ?? hoyISO(),
    km: c ? String(c.km) : kmSugerido ? String(kmSugerido) : '',
    litros: c ? String(c.litros) : '',
    total: c ? String(c.total) : '',
    tipoCombustible: c?.tipoCombustible ?? 'super',
    estacion: c?.estacion ?? '',
    nivelAntes: c?.nivelAntes ?? nivelInicial,
    // Cargas viejas marcadas "tanque lleno" no tienen aguja guardada, pero
    // el F es un hecho conocido igual: se precarga sin depender de la aguja.
    nivelDespues: c?.nivelDespues ?? (c?.tanqueLleno ? 1 : nivelInicial),
    fuente: c?.estimada ? 'aguja' : 'litros',
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
  nivelSugerido,
}: Props) {
  const [b, setB] = useState<Borrador>(() => borradorDesde(inicial, kmSugerido, nivelSugerido));
  const [errores, setErrores] = useState<Record<string, string>>({});

  /*
   * Repobla en cada apertura, no sólo la primera vez: si la clave sólo mirara
   * el id (o "nuevo" para un alta), reabrir el formulario para otra alta
   * dentro de la misma sesión no disparaba el reset, y quedaban valores
   * sugeridos viejos (p. ej. la aguja de una carga anterior a una medición
   * hecha mientras tanto).
   */
  const [abiertoAntes, setAbiertoAntes] = useState(false);
  if (abierto && !abiertoAntes) {
    setAbiertoAntes(true);
    setB(borradorDesde(inicial, kmSugerido, nivelSugerido));
    setErrores({});
  } else if (!abierto && abiertoAntes) {
    setAbiertoAntes(false);
  }

  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) =>
    setB((p) => ({ ...p, [k]: v }));

  const capacidadDisponible = (capacidadTanque ?? 0) > 0;

  /** Escribir los litros mueve la aguja de después: nivelAntes + litros/capacidad. */
  const setLitros = (valorStr: string) => {
    setB((p) => {
      const litrosNum = Number(valorStr) || 0;
      const nivelDespues =
        capacidadTanque && p.nivelAntes != null && litrosNum > 0
          ? Math.min(1, p.nivelAntes + litrosNum / capacidadTanque)
          : p.nivelDespues;
      return { ...p, litros: valorStr, nivelDespues, fuente: 'litros' };
    });
  };

  /** Arrastrar la aguja de después recalcula los litros desde la capacidad. */
  const setNivelDespues = (v: number) => {
    setB((p) => {
      const litrosNum =
        capacidadTanque && p.nivelAntes != null && v > p.nivelAntes
          ? (v - p.nivelAntes) * capacidadTanque
          : 0;
      return {
        ...p,
        nivelDespues: v,
        litros: litrosNum > 0 ? String(Number(litrosNum.toFixed(2))) : p.litros,
        fuente: 'aguja',
      };
    });
  };

  /** La aguja de antes recalcula lo que dependa de la fuente activa. */
  const setNivelAntes = (v: number) => {
    setB((p) => {
      if (p.fuente === 'aguja') {
        const litrosNum =
          capacidadTanque && p.nivelDespues != null && p.nivelDespues > v
            ? (p.nivelDespues - v) * capacidadTanque
            : 0;
        return { ...p, nivelAntes: v, litros: litrosNum > 0 ? String(Number(litrosNum.toFixed(2))) : p.litros };
      }
      const litrosNum = Number(p.litros) || 0;
      const nivelDespues =
        capacidadTanque && litrosNum > 0 ? Math.min(1, v + litrosNum / capacidadTanque) : p.nivelDespues;
      return { ...p, nivelAntes: v, nivelDespues };
    });
  };

  const litros = Number(b.litros) || 0;
  const total = Number(b.total) || 0;
  // El precio unitario se deduce: es lo que sale del ticket dividido los litros.
  const precioPorLitro = litros > 0 && total > 0 ? total / litros : 0;

  // Tanque lleno ya no se tilda a mano: sale solo de que la aguja llegó a F.
  const tanqueLleno = b.nivelDespues != null && b.nivelDespues >= 0.999;
  // Estimada cuando los litros salieron de arrastrar la aguja, no del ticket.
  const estimada = b.fuente === 'aguja';

  /** Los litros tipeados no entran en el tanque desde ese nivel inicial. */
  const seDesborda =
    b.fuente === 'litros' &&
    capacidadDisponible &&
    b.nivelAntes != null &&
    litros > 0 &&
    b.nivelAntes + litros / capacidadTanque! > 1.02;

  const validar = (): boolean => {
    const e: Record<string, string> = {};
    if (!b.fecha) e.fecha = 'Poné la fecha de la carga.';
    const km = Number(b.km);
    if (!b.km || !Number.isFinite(km) || km < 0) e.km = 'Kilometraje inválido.';
    if (b.nivelAntes == null) e.nivelAntes = 'Marcá cómo estaba la aguja antes de cargar.';
    if (!(litros > 0)) e.litros = 'Cargá los litros, o subí la aguja de después de cargar.';
    if (!(total > 0)) e.total = 'Cargá lo que pagaste.';
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
      litros: Number(litros.toFixed(3)),
      precioPorLitro: Number(precioPorLitro.toFixed(2)),
      total: Number(total.toFixed(2)),
      tipoCombustible: b.tipoCombustible,
      estacion: b.estacion.trim() || undefined,
      tanqueLleno,
      estimada: estimada || undefined,
      nivelAntes: b.nivelAntes ?? undefined,
      nivelDespues: b.nivelDespues ?? undefined,
    });
    onCerrar();
  };

  const mismaReferencia = referencia?.tipo === b.tipoCombustible ? referencia : undefined;

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={inicial ? 'Editar carga' : 'Nueva carga'}
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

        <div className="flex flex-col gap-4 rounded-xl border border-carbon-600 bg-carbon-850 p-3">
          <NivelTanque
            label="Aguja antes de cargar"
            valor={b.nivelAntes}
            onChange={setNivelAntes}
            capacidad={capacidadTanque}
            tono="neutro"
            error={errores.nivelAntes}
          />
          <NivelTanque
            label="Aguja después de cargar"
            valor={b.nivelDespues}
            onChange={setNivelDespues}
            capacidad={capacidadTanque}
          />

          <Input
            label="Litros cargados"
            mono
            type="number"
            inputMode="decimal"
            step="0.01"
            sufijo="L"
            value={b.litros}
            onChange={(e) => setLitros(e.target.value)}
            placeholder="0.00"
            error={errores.litros}
            hint={
              capacidadDisponible
                ? 'Escribí el número del ticket, o arrastrá la aguja de arriba: lo último que toques manda.'
                : 'Completá la capacidad del tanque en la ficha del vehículo para que se calcule solo con la aguja.'
            }
          />

          {tanqueLleno ? (
            <p className="flex items-center gap-1.5 text-xs text-verde-500">
              <Info size={13} className="shrink-0" />
              Tanque lleno: esta carga sirve de referencia exacta.
            </p>
          ) : null}

          {seDesborda ? (
            <p className="flex items-start gap-2 rounded-lg bg-rojo-500/10 px-2 py-1.5 text-xs text-rojo-500">
              <Info size={13} className="mt-0.5 shrink-0" />
              Con esos litros el tanque se pasa de los {fmtNumero(capacidadTanque)} L. Revisá la
              aguja o los litros.
            </p>
          ) : null}
        </div>

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

        <Toggle
          label="Tipo de nafta"
          descripcion={b.tipoCombustible === 'premium' ? 'Premium' : 'Súper'}
          checked={b.tipoCombustible === 'premium'}
          onChange={(v) => set('tipoCombustible', v ? 'premium' : 'super')}
        />

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
      </div>
    </Modal>
  );
}

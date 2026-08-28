import { useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { descripcionIntervalo, sugerirProximo } from '@/data/intervalos';
import { hoyISO } from '@/lib/format';
import { TIPOS_SERVICE, type Service } from '@/types';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onGuardar: (s: Omit<Service, 'id' | 'vehiculoId'> & { id?: string; vehiculoId?: string }) => void;
  /** Service a editar; undefined = alta. */
  inicial?: Service;
  kmSugerido: number;
}

interface Borrador {
  fecha: string;
  km: string;
  tipo: string;
  tipoOtro: string;
  descripcion: string;
  costo: string;
  taller: string;
  proximoKm: string;
  proximaFecha: string;
  /** Si el usuario tocó los campos de próximo, dejamos de autocalcularlos. */
  proximoManual: boolean;
}

function borradorDesde(s: Service | undefined, kmSugerido: number): Borrador {
  const tipoConocido = s && (TIPOS_SERVICE as readonly string[]).includes(s.tipo);
  const tipo = s ? (tipoConocido ? s.tipo : 'Otro') : TIPOS_SERVICE[0];
  const fecha = s?.fecha ?? hoyISO();
  const km = s ? String(s.km) : kmSugerido ? String(kmSugerido) : '';

  // En un alta nueva, precargamos el próximo con el intervalo del tipo.
  const sugerido = s ? null : sugerirProximo(tipo, Number(km), fecha);

  return {
    fecha,
    km,
    tipo,
    tipoOtro: s && !tipoConocido ? s.tipo : '',
    descripcion: s?.descripcion ?? '',
    costo: s ? String(s.costo) : '',
    taller: s?.taller ?? '',
    proximoKm: s?.proximoKm != null ? String(s.proximoKm) : (sugerido?.proximoKm?.toString() ?? ''),
    proximaFecha: s?.proximaFecha ?? sugerido?.proximaFecha ?? '',
    proximoManual: Boolean(s?.proximoKm != null || s?.proximaFecha),
  };
}

export function ServiceForm({ abierto, onCerrar, onGuardar, inicial, kmSugerido }: Props) {
  const [b, setB] = useState<Borrador>(() => borradorDesde(inicial, kmSugerido));
  const [errores, setErrores] = useState<Record<string, string>>({});

  const [claveAbierta, setClaveAbierta] = useState<string>('');
  const claveActual = `${abierto}-${inicial?.id ?? 'nuevo'}`;
  if (abierto && claveAbierta !== claveActual) {
    setClaveAbierta(claveActual);
    setB(borradorDesde(inicial, kmSugerido));
    setErrores({});
  }

  /**
   * Recalcula el próximo service cuando cambian tipo, km o fecha — salvo que
   * el usuario ya haya editado esos campos a mano.
   */
  const recalcular = (cambios: Partial<Borrador>) => {
    setB((p) => {
      const siguiente = { ...p, ...cambios };
      if (siguiente.proximoManual) return siguiente;
      const s = sugerirProximo(siguiente.tipo, Number(siguiente.km), siguiente.fecha);
      return {
        ...siguiente,
        proximoKm: s.proximoKm != null ? String(s.proximoKm) : '',
        proximaFecha: s.proximaFecha ?? '',
      };
    });
  };

  const editarProximo = (campo: 'proximoKm' | 'proximaFecha', valor: string) =>
    setB((p) => ({ ...p, [campo]: valor, proximoManual: true }));

  const restaurarSugerencia = () =>
    setB((p) => {
      const s = sugerirProximo(p.tipo, Number(p.km), p.fecha);
      return {
        ...p,
        proximoKm: s.proximoKm != null ? String(s.proximoKm) : '',
        proximaFecha: s.proximaFecha ?? '',
        proximoManual: false,
      };
    });

  const validar = (): boolean => {
    const e: Record<string, string> = {};
    if (!b.fecha) e.fecha = 'Poné la fecha del service.';
    const km = Number(b.km);
    if (!b.km || !Number.isFinite(km) || km < 0) e.km = 'Kilometraje inválido.';
    if (b.tipo === 'Otro' && !b.tipoOtro.trim()) e.tipoOtro = 'Escribí de qué se trata.';
    const costo = Number(b.costo);
    if (b.costo !== '' && (!Number.isFinite(costo) || costo < 0)) e.costo = 'Costo inválido.';
    const proximoKm = Number(b.proximoKm);
    if (b.proximoKm && Number.isFinite(proximoKm) && proximoKm <= km) {
      e.proximoKm = 'Tiene que ser mayor al km del service.';
    }
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const guardar = () => {
    if (!validar()) return;
    const proximoKm = Number(b.proximoKm);
    onGuardar({
      id: inicial?.id,
      vehiculoId: inicial?.vehiculoId,
      fecha: b.fecha,
      km: Number(b.km),
      tipo: b.tipo === 'Otro' ? b.tipoOtro.trim() : b.tipo,
      descripcion: b.descripcion.trim(),
      costo: Number(b.costo) || 0,
      taller: b.taller.trim() || undefined,
      proximoKm: b.proximoKm && Number.isFinite(proximoKm) && proximoKm > 0 ? proximoKm : undefined,
      proximaFecha: b.proximaFecha || undefined,
    });
    onCerrar();
  };

  const textoIntervalo = descripcionIntervalo(b.tipo);

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={inicial ? 'Editar service' : 'Nuevo service'}
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
            onChange={(e) => recalcular({ fecha: e.target.value })}
            error={errores.fecha}
          />
          <Input
            label="Kilometraje"
            mono
            type="number"
            inputMode="numeric"
            sufijo="km"
            value={b.km}
            onChange={(e) => recalcular({ km: e.target.value })}
            error={errores.km}
          />
        </div>

        <Select
          label="Tipo"
          value={b.tipo}
          onChange={(e) => recalcular({ tipo: e.target.value })}
          opciones={TIPOS_SERVICE.map((t) => ({ value: t, label: t }))}
        />

        {b.tipo === 'Otro' ? (
          <Input
            label="¿Qué se hizo?"
            value={b.tipoOtro}
            onChange={(e) => setB((p) => ({ ...p, tipoOtro: e.target.value }))}
            placeholder="Ej: Cambio de radiador"
            error={errores.tipoOtro}
          />
        ) : null}

        <Textarea
          label="Descripción"
          value={b.descripcion}
          onChange={(e) => setB((p) => ({ ...p, descripcion: e.target.value }))}
          placeholder="Detalle de repuestos, marca del aceite, observaciones…"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Costo"
            mono
            type="number"
            inputMode="decimal"
            prefijo="$"
            value={b.costo}
            onChange={(e) => setB((p) => ({ ...p, costo: e.target.value }))}
            placeholder="0"
            error={errores.costo}
          />
          <Input
            label="Taller"
            value={b.taller}
            onChange={(e) => setB((p) => ({ ...p, taller: e.target.value }))}
            placeholder="Opcional"
          />
        </div>

        <div className="rounded-xl border border-carbon-600 bg-carbon-850 p-3">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-carbon-400">
                Próximo service
              </p>
              {textoIntervalo ? (
                <p className="flex items-center gap-1 text-[11px] text-ambar-400">
                  <Sparkles size={11} />
                  {textoIntervalo}
                </p>
              ) : (
                <p className="text-[11px] text-carbon-500">
                  Sin intervalo de referencia para este tipo.
                </p>
              )}
            </div>
            {b.proximoManual && textoIntervalo ? (
              <Button
                variante="fantasma"
                tamanio="sm"
                icono={<RotateCcw size={13} />}
                onClick={restaurarSugerencia}
                className="shrink-0 px-2"
              >
                Sugerido
              </Button>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Próximo km"
              mono
              type="number"
              inputMode="numeric"
              sufijo="km"
              value={b.proximoKm}
              onChange={(e) => editarProximo('proximoKm', e.target.value)}
              placeholder="—"
              error={errores.proximoKm}
            />
            <Input
              label="Próxima fecha"
              type="date"
              value={b.proximaFecha}
              onChange={(e) => editarProximo('proximaFecha', e.target.value)}
            />
          </div>
          <p className="mt-2 text-xs text-carbon-500">
            Se calculan solos desde el tipo, el km y la fecha. Editalos si el manual de tu auto
            dice otra cosa. El tablero avisa 1.000 km o 30 días antes.
          </p>
        </div>
      </div>
    </Modal>
  );
}

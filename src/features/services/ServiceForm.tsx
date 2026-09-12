import { useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, SelectMultiple, Textarea } from '@/components/ui/Input';
import { descripcionIntervalo, sugerirProximoMultiple } from '@/data/intervalos';
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
  /** Trabajos incluidos en este service (mismo presupuesto). */
  tipos: string[];
  tipoOtro: string;
  descripcion: string;
  costo: string;
  taller: string;
  proximoKm: string;
  proximaFecha: string;
  /** Si el usuario tocó los campos de próximo, dejamos de autocalcularlos. */
  proximoManual: boolean;
}

/** Tipos guardados que no reconocemos van todos bajo "Otro", concatenados. */
function separarTipos(tipos: string[]): { conocidos: string[]; otro: string } {
  const conocidos: string[] = [];
  const otros: string[] = [];
  for (const t of tipos) {
    if ((TIPOS_SERVICE as readonly string[]).includes(t) && t !== 'Otro') conocidos.push(t);
    else otros.push(t);
  }
  return { conocidos, otro: otros.join(', ') };
}

function borradorDesde(s: Service | undefined, kmSugerido: number): Borrador {
  const { conocidos, otro } = s ? separarTipos(s.tipos) : { conocidos: [], otro: '' };
  const tipos = s ? (otro ? [...conocidos, 'Otro'] : conocidos) : [];
  const fecha = s?.fecha ?? hoyISO();
  const km = s ? String(s.km) : kmSugerido ? String(kmSugerido) : '';

  return {
    fecha,
    km,
    tipos,
    tipoOtro: otro,
    descripcion: s?.descripcion ?? '',
    costo: s ? String(s.costo) : '',
    taller: s?.taller ?? '',
    proximoKm: s?.proximoKm != null ? String(s.proximoKm) : '',
    proximaFecha: s?.proximaFecha ?? '',
    proximoManual: Boolean(s?.proximoKm != null || s?.proximaFecha),
  };
}

/** Tipos reales a guardar: los conocidos tildados + lo que se escribió en "Otro". */
function tiposFinales(b: Borrador): string[] {
  const otros = b.tipoOtro
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  return [...b.tipos.filter((t) => t !== 'Otro'), ...otros];
}

export function ServiceForm({ abierto, onCerrar, onGuardar, inicial, kmSugerido }: Props) {
  const [b, setB] = useState<Borrador>(() => borradorDesde(inicial, kmSugerido));
  const [errores, setErrores] = useState<Record<string, string>>({});

  // Repobla en cada apertura (ver comentario en CargaForm): si sólo mirara
  // el id, reabrir para otra alta nueva no refrescaba kmSugerido.
  const [abiertoAntes, setAbiertoAntes] = useState(false);
  if (abierto && !abiertoAntes) {
    setAbiertoAntes(true);
    setB(borradorDesde(inicial, kmSugerido));
    setErrores({});
  } else if (!abierto && abiertoAntes) {
    setAbiertoAntes(false);
  }

  /**
   * Recalcula el próximo service cuando cambian tipos, km o fecha — salvo que
   * el usuario ya haya editado esos campos a mano. Con varios trabajos
   * agrupados, "próximo" es el más cercano entre todos (el que primero pide
   * volver a mirar el auto).
   */
  const recalcular = (cambios: Partial<Borrador>) => {
    setB((p) => {
      const siguiente = { ...p, ...cambios };
      if (siguiente.proximoManual) return siguiente;
      const s = sugerirProximoMultiple(tiposFinales(siguiente), Number(siguiente.km), siguiente.fecha);
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
      const s = sugerirProximoMultiple(tiposFinales(p), Number(p.km), p.fecha);
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
    if (tiposFinales(b).length === 0) e.tipos = 'Elegí al menos un trabajo.';
    if (b.tipos.includes('Otro') && !b.tipoOtro.trim()) e.tipoOtro = 'Escribí de qué se trata.';
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
      tipos: tiposFinales(b),
      descripcion: b.descripcion.trim(),
      costo: Number(b.costo) || 0,
      taller: b.taller.trim() || undefined,
      proximoKm: b.proximoKm && Number.isFinite(proximoKm) && proximoKm > 0 ? proximoKm : undefined,
      proximaFecha: b.proximaFecha || undefined,
    });
    onCerrar();
  };

  const tiposConIntervalo = b.tipos.filter((t) => t !== 'Otro' && descripcionIntervalo(t));

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={inicial ? 'Editar service' : 'Nuevo service'}
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

        <SelectMultiple
          label="Trabajos incluidos"
          hint="Elegí todos los que vinieron en el mismo presupuesto"
          error={errores.tipos}
          opciones={TIPOS_SERVICE.map((t) => ({ value: t, label: t }))}
          valor={b.tipos}
          onChange={(tipos) => recalcular({ tipos })}
        />

        {b.tipos.includes('Otro') ? (
          <Input
            label="¿Qué más se hizo?"
            value={b.tipoOtro}
            onChange={(e) => recalcular({ tipoOtro: e.target.value })}
            placeholder="Ej: Cambio de radiador, separá varios con comas"
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
              {tiposConIntervalo.length > 0 ? (
                <p className="flex items-center gap-1 text-[11px] text-ambar-400">
                  <Sparkles size={11} />
                  Sugerido según lo que primero toque:{' '}
                  {tiposConIntervalo.map((t) => descripcionIntervalo(t)?.replace('Sugerido: ', '')).join(' · ')}
                </p>
              ) : (
                <p className="text-[11px] text-carbon-500">
                  Sin intervalo de referencia para lo elegido.
                </p>
              )}
            </div>
            {b.proximoManual && tiposConIntervalo.length > 0 ? (
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
            Se calculan solos desde los trabajos, el km y la fecha. Editalos si el manual de tu
            auto dice otra cosa. El tablero avisa 1.000 km o 30 días antes.
          </p>
        </div>
      </div>
    </Modal>
  );
}

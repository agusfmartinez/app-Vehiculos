import { lazy, Suspense, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Fuel, Gauge, Pencil, Plus, Trash2 } from 'lucide-react';
import { useDatos } from '@/context/DatosContext';
import { PageHeader } from '@/components/layout/AppShell';
import { SinVehiculo } from '@/components/layout/SelectorVehiculo';
import { Button, FabAgregar } from '@/components/ui/Button';
import { Card, CardBody, Stat } from '@/components/ui/Card';
import { Badge, EmptyState } from '@/components/ui/EmptyState';
import { ConfirmarBorrado } from '@/components/ui/Modal';
import {
  autonomiaPorMedidor,
  autonomiaPromedio,
  calcularTramos,
  estadoTanque,
  gastoCombustibleMes,
  litrosPor100km,
  precioPromedioPorLitro,
  type TramoCombustible,
} from '@/lib/calculos';
import { fmtDinero, fmtFecha, fmtNumero, parseFecha } from '@/lib/format';
import { CargaForm } from '@/features/combustible/CargaForm';
import { LecturaForm } from '@/features/combustible/LecturaForm';
import { TanqueCard } from '@/features/combustible/TanqueCard';
import { TIPOS_COMBUSTIBLE, type CargaCombustible, type LecturaTanque } from '@/types';

// recharts pesa ~350 kB: sólo se descarga al entrar a esta sección.
const GraficosCombustible = lazy(() =>
  import('@/features/combustible/GraficosCombustible').then((m) => ({
    default: m.GraficosCombustible,
  })),
);

function etiquetaTipo(t: NonNullable<CargaCombustible['tipoCombustible']>): string {
  return TIPOS_COMBUSTIBLE.find((x) => x.value === t)?.label ?? t;
}

/** Cargas y mediciones en una sola línea de tiempo, de lo más nuevo a lo más viejo. */
type ItemTimeline =
  | { clase: 'carga'; id: string; fecha: string; km: number; tramo: TramoCombustible }
  | { clase: 'lectura'; id: string; fecha: string; km: number; lectura: LecturaTanque };

export function CombustiblePage() {
  const { cargas, lecturas, activo, agregarCarga, editarCarga, borrarCarga, agregarLectura, editarLectura, borrarLectura } =
    useDatos();
  const navigate = useNavigate();

  const [formCarga, setFormCarga] = useState(false);
  const [formLectura, setFormLectura] = useState(false);
  const [editandoCarga, setEditandoCarga] = useState<CargaCombustible | undefined>();
  const [editandoLectura, setEditandoLectura] = useState<LecturaTanque | undefined>();
  const [aBorrar, setABorrar] = useState<ItemTimeline | null>(null);

  const autonomia = useMemo(() => autonomiaPromedio(cargas), [cargas]);
  const porMedidor = useMemo(
    () => autonomiaPorMedidor(lecturas, cargas, activo?.capacidadTanque),
    [lecturas, cargas, activo],
  );
  // Para el nivel del tanque sirve cualquiera de las dos medidas; el
  // full-to-full manda por ser más preciso.
  const kmPorLitro = autonomia.kmPorLitro ?? porMedidor.kmPorLitro;

  const tanque = useMemo(
    () =>
      estadoTanque({
        cargas,
        lecturas,
        kmActual: activo?.kmActual ?? 0,
        capacidad: activo?.capacidadTanque,
        kmPorLitro,
      }),
    [cargas, lecturas, activo, kmPorLitro],
  );

  const precioProm = useMemo(() => precioPromedioPorLitro(cargas), [cargas]);
  const ultimaCarga = useMemo(() => {
    const asc = [...cargas].sort((a, b) => a.fecha.localeCompare(b.fecha));
    return asc.at(-1);
  }, [cargas]);
  const ultimoPrecio = ultimaCarga?.precioPorLitro;

  const referencia = useMemo(
    () =>
      ultimaCarga?.tipoCombustible && ultimaCarga.precioPorLitro > 0
        ? { tipo: ultimaCarga.tipoCombustible, precioPorLitro: ultimaCarga.precioPorLitro }
        : undefined,
    [ultimaCarga],
  );

  const timeline = useMemo<ItemTimeline[]>(() => {
    const items: ItemTimeline[] = [
      ...calcularTramos(cargas).map(
        (t): ItemTimeline => ({
          clase: 'carga',
          id: t.carga.id,
          fecha: t.carga.fecha,
          km: t.carga.km,
          tramo: t,
        }),
      ),
      ...lecturas.map(
        (l): ItemTimeline => ({ clase: 'lectura', id: l.id, fecha: l.fecha, km: l.km, lectura: l }),
      ),
    ];
    return items.sort((a, b) => {
      const t = parseFecha(b.fecha).getTime() - parseFecha(a.fecha).getTime();
      return t !== 0 ? t : b.km - a.km;
    });
  }, [cargas, lecturas]);

  if (!activo) return <SinVehiculo onNuevo={() => navigate('/vehiculo')} />;

  const abrirCarga = () => {
    setEditandoCarga(undefined);
    setFormCarga(true);
  };
  const abrirLectura = () => {
    setEditandoLectura(undefined);
    setFormLectura(true);
  };

  const vacio = cargas.length === 0 && lecturas.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titulo="Combustible"
        subtitulo={`${cargas.length} ${cargas.length === 1 ? 'carga' : 'cargas'} · ${fmtDinero(gastoCombustibleMes(cargas))} este mes`}
        accion={
          <Button variante="secundario" tamanio="sm" icono={<Gauge size={15} />} onClick={abrirLectura}>
            Medir
          </Button>
        }
      />

      {vacio ? (
        <EmptyState
          icono={<Fuel size={22} />}
          titulo="Sin registros de combustible"
          mensaje="Cargá la primera nafta con el kilometraje del momento, o anotá dónde está la aguja para empezar a seguir el tanque sin cargar."
          textoAccion="Cargar primera nafta"
          onAccion={abrirCarga}
        />
      ) : (
        <>
          <TanqueCard
            estado={tanque}
            capacidad={activo.capacidadTanque}
            onMedir={abrirLectura}
          />

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardBody>
                <Stat
                  rotulo="Autonomía prom."
                  icono={<Gauge size={13} />}
                  valor={autonomia.kmPorLitro != null ? fmtNumero(autonomia.kmPorLitro, 2) : '—'}
                  unidad="km/L"
                  tono="acento"
                  detalle={
                    autonomia.kmPorLitro != null
                      ? `${fmtNumero(litrosPor100km(autonomia.kmPorLitro), 1)} L/100 km · tanque lleno`
                      : porMedidor.kmPorLitro != null
                        ? `Sin tramos full-to-full`
                        : 'Faltan tramos confiables'
                  }
                />
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <Stat
                  rotulo="Precio por litro"
                  icono={<Fuel size={13} />}
                  valor={fmtDinero(ultimoPrecio, 2)}
                  detalle={
                    ultimaCarga?.tipoCombustible
                      ? `${etiquetaTipo(ultimaCarga.tipoCombustible)} · promedio ${fmtDinero(precioProm, 2)}`
                      : precioProm != null
                        ? `Promedio ${fmtDinero(precioProm, 2)}`
                        : undefined
                  }
                />
              </CardBody>
            </Card>
          </div>

          {porMedidor.kmPorLitro != null ? (
            <Card className="border-carbon-600">
              <CardBody className="flex items-baseline justify-between gap-3">
                <span className="flex flex-col">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-carbon-400">
                    Consumo medido con el medidor
                  </span>
                  <span className="text-xs text-carbon-500">
                    {porMedidor.tramosUsados}{' '}
                    {porMedidor.tramosUsados === 1 ? 'tramo' : 'tramos'} entre mediciones · estimado,
                    la aguja no es lineal
                  </span>
                </span>
                <span className="num shrink-0 text-lg font-bold text-carbon-200">
                  {fmtNumero(porMedidor.kmPorLitro, 2)}
                  <span className="ml-1 text-xs font-medium text-carbon-400">km/L</span>
                </span>
              </CardBody>
            </Card>
          ) : null}

          <Suspense fallback={null}>
            <GraficosCombustible cargas={cargas} />
          </Suspense>

          <ul className="flex flex-col gap-3">
            {timeline.map((item) =>
              item.clase === 'lectura' ? (
                <li key={item.id}>
                  <Card className="border-dashed border-carbon-600 bg-carbon-850/50">
                    <CardBody className="flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-sm font-semibold text-carbon-200">
                            <Gauge size={14} className="shrink-0 text-carbon-400" />
                            Medición del tanque
                          </p>
                          <p className="num text-xs text-carbon-400">
                            {fmtFecha(item.lectura.fecha)} · {fmtNumero(item.lectura.km)} km
                          </p>
                        </div>
                        <span className="num shrink-0 text-base font-bold text-carbon-200">
                          {Math.round(item.lectura.nivel * 100)}%
                          {activo.capacidadTanque ? (
                            <span className="ml-1 text-xs font-normal text-carbon-400">
                              ≈ {fmtNumero(item.lectura.nivel * activo.capacidadTanque, 1)} L
                            </span>
                          ) : null}
                        </span>
                      </div>

                      {item.lectura.nota ? (
                        <p className="text-sm text-carbon-300">{item.lectura.nota}</p>
                      ) : null}

                      <div className="flex gap-2 border-t border-carbon-700 pt-2">
                        <Button
                          variante="fantasma"
                          tamanio="sm"
                          icono={<Pencil size={14} />}
                          onClick={() => {
                            setEditandoLectura(item.lectura);
                            setFormLectura(true);
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          variante="fantasma"
                          tamanio="sm"
                          icono={<Trash2 size={14} />}
                          className="text-rojo-500 hover:bg-rojo-500/10 hover:text-rojo-500"
                          onClick={() => setABorrar(item)}
                        >
                          Borrar
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                </li>
              ) : (
                <li key={item.id}>
                  <Card>
                    <CardBody className="flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="num text-sm font-semibold text-carbon-100">
                            {fmtNumero(item.tramo.carga.litros, 2)} L ·{' '}
                            {fmtDinero(item.tramo.carga.precioPorLitro, 2)}/L
                          </p>
                          <p className="num text-xs text-carbon-400">
                            {fmtFecha(item.tramo.carga.fecha)} · {fmtNumero(item.tramo.carga.km)} km
                            {item.tramo.carga.estacion ? ` · ${item.tramo.carga.estacion}` : ''}
                          </p>
                        </div>
                        <span className="num shrink-0 text-base font-bold text-ambar-400">
                          {fmtDinero(item.tramo.carga.total)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {item.tramo.kmPorLitro != null ? (
                          <Badge tono={item.tramo.confiable ? 'ok' : 'neutro'}>
                            {fmtNumero(item.tramo.kmPorLitro, 2)} km/L
                          </Badge>
                        ) : null}
                        {item.tramo.kmRecorridos != null && item.tramo.kmRecorridos > 0 ? (
                          <Badge>{fmtNumero(item.tramo.kmRecorridos)} km recorridos</Badge>
                        ) : null}
                        {item.tramo.carga.tipoCombustible ? (
                          <Badge
                            tono={item.tramo.carga.tipoCombustible === 'premium' ? 'acento' : 'neutro'}
                          >
                            {etiquetaTipo(item.tramo.carga.tipoCombustible)}
                          </Badge>
                        ) : null}
                        <Badge tono={item.tramo.carga.tanqueLleno ? 'ok' : 'neutro'}>
                          {item.tramo.carga.tanqueLleno ? 'Tanque lleno' : 'Carga parcial'}
                        </Badge>
                        {item.tramo.carga.estimada ? (
                          <Badge tono="alerta">Litros estimados</Badge>
                        ) : null}
                      </div>

                      {!item.tramo.confiable && item.tramo.motivoNoConfiable ? (
                        <p className="flex items-start gap-1.5 text-xs text-carbon-500">
                          <AlertCircle size={13} className="mt-0.5 shrink-0" />
                          {item.tramo.motivoNoConfiable}
                        </p>
                      ) : null}

                      <div className="flex gap-2 border-t border-carbon-700 pt-2">
                        <Button
                          variante="fantasma"
                          tamanio="sm"
                          icono={<Pencil size={14} />}
                          onClick={() => {
                            setEditandoCarga(item.tramo.carga);
                            setFormCarga(true);
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          variante="fantasma"
                          tamanio="sm"
                          icono={<Trash2 size={14} />}
                          className="text-rojo-500 hover:bg-rojo-500/10 hover:text-rojo-500"
                          onClick={() => setABorrar(item)}
                        >
                          Borrar
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                </li>
              ),
            )}
          </ul>
        </>
      )}

      <FabAgregar onClick={abrirCarga} label="Carga" icono={<Plus size={20} />} />

      <CargaForm
        abierto={formCarga}
        onCerrar={() => setFormCarga(false)}
        inicial={editandoCarga}
        kmSugerido={activo.kmActual}
        referencia={referencia}
        capacidadTanque={activo.capacidadTanque}
        onGuardar={(c) => {
          if (c.id) editarCarga(c as CargaCombustible);
          else agregarCarga(c);
        }}
      />

      <LecturaForm
        abierto={formLectura}
        onCerrar={() => setFormLectura(false)}
        inicial={editandoLectura}
        kmSugerido={activo.kmActual}
        capacidadTanque={activo.capacidadTanque}
        onGuardar={(l) => {
          if (l.id) editarLectura(l as LecturaTanque);
          else agregarLectura(l);
        }}
      />

      <ConfirmarBorrado
        abierto={aBorrar !== null}
        titulo={aBorrar?.clase === 'lectura' ? 'Borrar medición' : 'Borrar carga'}
        mensaje={
          aBorrar?.clase === 'lectura'
            ? `Se elimina la medición del ${fmtFecha(aBorrar.fecha)}. Cambia el nivel estimado del tanque.`
            : aBorrar
              ? `Se elimina la carga del ${fmtFecha(aBorrar.fecha)}. Los cálculos de autonomía de los tramos vecinos se recalculan.`
              : ''
        }
        onCancelar={() => setABorrar(null)}
        onConfirmar={() => {
          if (aBorrar?.clase === 'lectura') borrarLectura(aBorrar.id);
          else if (aBorrar) borrarCarga(aBorrar.id);
          setABorrar(null);
        }}
      />
    </div>
  );
}

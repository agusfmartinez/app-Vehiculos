import { lazy, Suspense, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Fuel, Gauge, Info, Pencil, Plus, Trash2 } from 'lucide-react';
import { useDatos } from '@/context/DatosContext';
import { PageHeader } from '@/components/layout/AppShell';
import { SinVehiculo } from '@/components/layout/SelectorVehiculo';
import { Button, FabAgregar } from '@/components/ui/Button';
import { Card, CardBody, Stat } from '@/components/ui/Card';
import { Badge, EmptyState } from '@/components/ui/EmptyState';
import { ConfirmarBorrado } from '@/components/ui/Modal';
import {
  autonomiaPromedio,
  estadoTanque,
  gastoCombustibleMes,
  litrosPor100km,
  pasosMedicion,
  precioPromedioPorLitro,
  resolucionMedidor,
  tramosConsumo,
  tramosPorEventoFinal,
  type TramoConsumo,
} from '@/lib/calculos';
import { fmtDinero, fmtFecha, fmtNumero, parseFecha } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Chips } from '@/components/ui/Chips';
import { TODOS, enPeriodo, etiquetaPeriodoCorta, periodosDe } from '@/lib/periodos';
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
type Vista = 'registros' | 'analisis';

/** Cuántos registros se muestran antes del "Ver más". */
const POR_PAGINA = 20;

const VISTAS: { v: Vista; l: string }[] = [
  { v: 'registros', l: 'Cargas' },
  { v: 'analisis', l: 'Reportes' },
];

type ItemTimeline =
  | {
      clase: 'carga';
      id: string;
      fecha: string;
      km: number;
      carga: CargaCombustible;
    }
  | {
      clase: 'lectura';
      id: string;
      fecha: string;
      km: number;
      lectura: LecturaTanque;
    };

/** Los tres números del tramo: rendimiento, distancia y litros. */
function BadgeTramo({ tramo }: { tramo: TramoConsumo }) {
  if (tramo.descarte === 'bajo-resolucion') {
    return (
      <>
        <Badge>Tramo corto</Badge>
        <Badge>{fmtNumero(tramo.kmRecorridos)} km recorridos</Badge>
      </>
    );
  }

  return (
    <>
      <Badge tono={tramo.descarte === 'implausible' ? 'peligro' : 'ok'}>
        {fmtNumero(tramo.kmPorLitro, 2)} km/L
      </Badge>
      <Badge>{fmtNumero(tramo.kmRecorridos)} km recorridos</Badge>
      <Badge>{fmtNumero(tramo.litrosConsumidos, 2)} L consumidos</Badge>
      {tramo.cargasIntermedias > 0 ? (
        <Badge>
          {tramo.cargasIntermedias} {tramo.cargasIntermedias === 1 ? 'carga' : 'cargas'} en el medio
        </Badge>
      ) : null}
    </>
  );
}

/** Explica por qué el tramo no entra en el promedio. */
function AvisoDescarte({ tramo, capacidad }: { tramo: TramoConsumo; capacidad?: number }) {
  if (tramo.descarte === 'bajo-resolucion') {
    return (
      <p className="flex items-start gap-1.5 text-xs text-carbon-500">
        <Info size={13} className="mt-0.5 shrink-0" />
        Muy pocos kilómetros para medir consumo: la aguja se mueve de a{' '}
        {capacidad ? `${fmtNumero(resolucionMedidor(capacidad), 1)} L` : 'una muesca'} y en{' '}
        {fmtNumero(tramo.kmRecorridos)} km no llegó a bajar tanto. El dato está bien, no alcanza
        para calcular.
      </p>
    );
  }

  if (tramo.descarte !== 'implausible' || tramo.kmPorLitro == null) return null;

  const agujaSubio = tramo.litrosConsumidos < 0;

  return (
    <p className="flex items-start gap-1.5 rounded-lg bg-rojo-500/10 px-2 py-1.5 text-xs text-rojo-500">
      <AlertTriangle size={13} className="mt-0.5 shrink-0" />
      <span>
        {agujaSubio ? (
          <>
            La aguja subió sin que haya una carga registrada en el medio. Falta cargar esa nafta, o
            alguno de los dos niveles está al revés.
          </>
        ) : (
          <>
            {fmtNumero(tramo.kmPorLitro, 2)} km/L es imposible: hay un dato mal cargado. Revisá el
            kilometraje ({fmtNumero(tramo.desde.km)} → {fmtNumero(tramo.hasta.km)} km) o el nivel de
            la aguja de este registro y del anterior.
          </>
        )}{' '}
        Queda fuera del promedio.
      </span>
    </p>
  );
}

function AccionesItem({ onEditar, onBorrar }: { onEditar: () => void; onBorrar: () => void }) {
  return (
    <div className="flex gap-2 border-t border-carbon-700 pt-2">
      <Button variante="fantasma" tamanio="sm" icono={<Pencil size={14} />} onClick={onEditar}>
        Editar
      </Button>
      <Button
        variante="fantasma"
        tamanio="sm"
        icono={<Trash2 size={14} />}
        className="text-rojo-500 hover:bg-rojo-500/10 hover:text-rojo-500"
        onClick={onBorrar}
      >
        Borrar
      </Button>
    </div>
  );
}

export function CombustiblePage() {
  const {
    cargas,
    lecturas,
    activo,
    agregarCarga,
    editarCarga,
    borrarCarga,
    agregarLectura,
    editarLectura,
    borrarLectura,
  } = useDatos();
  const navigate = useNavigate();

  const [vista, setVista] = useState<Vista>('registros');
  const [periodo, setPeriodo] = useState<string>(TODOS);
  const [visibles, setVisibles] = useState(POR_PAGINA);
  const [formCarga, setFormCarga] = useState(false);
  const [formLectura, setFormLectura] = useState(false);
  const [editandoCarga, setEditandoCarga] = useState<CargaCombustible | undefined>();
  const [editandoLectura, setEditandoLectura] = useState<LecturaTanque | undefined>();
  const [aBorrar, setABorrar] = useState<ItemTimeline | null>(null);

  const capacidad = activo?.capacidadTanque;

  // Meses con algo cargado, para no ofrecer períodos vacíos.
  const meses = useMemo(
    () => periodosDe([...cargas, ...lecturas]),
    [cargas, lecturas],
  );

  const opcionesMes = useMemo(
    () => [
      { valor: TODOS, label: 'Todas' },
      ...meses.map((m) => ({ valor: m, label: etiquetaPeriodoCorta(m) })),
    ],
    [meses],
  );

  /*
   * El filtro recorta lo que se muestra, no lo que se calcula: el consumo de un
   * mes necesita la carga del mes anterior para tener con qué comparar. Por eso
   * los tramos se arman sobre el historial completo y recién después se filtra.
   */
  const cargasVisibles = useMemo(
    () => cargas.filter((c) => enPeriodo(c.fecha, periodo)),
    [cargas, periodo],
  );
  const lecturasVisibles = useMemo(
    () => lecturas.filter((l) => enPeriodo(l.fecha, periodo)),
    [lecturas, periodo],
  );

  const autonomia = useMemo(
    () => autonomiaPromedio({ cargas, lecturas, capacidad }),
    [cargas, lecturas, capacidad],
  );

  // Las cargas muestran el ciclo contra la carga anterior…
  const ciclosPorCarga = useMemo(
    () => tramosPorEventoFinal(tramosConsumo(cargas, lecturas, capacidad)),
    [cargas, lecturas, capacidad],
  );

  // …y las mediciones, el paso contra el registro inmediatamente anterior.
  const pasos = useMemo(
    () => pasosMedicion(cargas, lecturas, capacidad),
    [cargas, lecturas, capacidad],
  );

  const tramosDelPeriodo = useMemo(() => {
    const todos = tramosConsumo(cargas, lecturas, capacidad);
    return periodo === TODOS ? todos : todos.filter((t) => enPeriodo(t.hasta.fecha, periodo));
  }, [cargas, lecturas, capacidad, periodo]);

  /** El promedio de la vista: global con "Todas", o sólo los ciclos del mes. */
  const autonomiaVista = useMemo(() => {
    if (periodo === TODOS) return autonomia;

    const utiles = tramosDelPeriodo.filter(
      (t): t is TramoConsumo & { kmPorLitro: number } =>
        t.descarte === null && t.kmPorLitro != null,
    );
    const exactos = utiles.filter((t) => t.precision === 'exacto');
    const base = exactos.length ? exactos : utiles;

    if (!base.length) {
      return { ...autonomia, kmPorLitro: null, tramosUsados: 0, precision: null };
    }

    const km = base.reduce((a, t) => a + t.kmRecorridos, 0);
    const litros = base.reduce((a, t) => a + t.litrosConsumidos, 0);
    return {
      ...autonomia,
      kmPorLitro: litros > 0 ? km / litros : null,
      tramosUsados: base.length,
      precision: exactos.length ? ('exacto' as const) : ('estimado' as const),
    };
  }, [periodo, autonomia, tramosDelPeriodo]);

  const tanque = useMemo(
    () =>
      estadoTanque({
        cargas,
        lecturas,
        kmActual: activo?.kmActual ?? 0,
        capacidad,
        kmPorLitro: autonomia.kmPorLitro,
      }),
    [cargas, lecturas, activo, capacidad, autonomia.kmPorLitro],
  );

  const precioPromedio = useMemo(
    () => precioPromedioPorLitro(cargasVisibles),
    [cargasVisibles],
  );
  const ultimaCarga = useMemo(() => {
    const asc = [...cargasVisibles].sort((a, b) => a.fecha.localeCompare(b.fecha));
    return asc.at(-1);
  }, [cargasVisibles]);
  const ultimoPrecio = ultimaCarga?.precioPorLitro;

  // El formulario sugiere sobre el historial completo, no sobre el mes filtrado.
  const ultimaCargaGlobal = useMemo(() => {
    const asc = [...cargas].sort((a, b) => a.fecha.localeCompare(b.fecha));
    return asc.at(-1);
  }, [cargas]);

  const referencia = useMemo(
    () =>
      ultimaCargaGlobal?.tipoCombustible && ultimaCargaGlobal.precioPorLitro > 0
        ? {
            tipo: ultimaCargaGlobal.tipoCombustible,
            precioPorLitro: ultimaCargaGlobal.precioPorLitro,
          }
        : undefined,
    [ultimaCargaGlobal],
  );

  const timeline = useMemo<ItemTimeline[]>(() => {
    const items: ItemTimeline[] = [
      ...cargasVisibles.map((c): ItemTimeline => ({
        clase: 'carga',
        id: c.id,
        fecha: c.fecha,
        km: c.km,
        carga: c,
      })),
      ...lecturasVisibles.map((l): ItemTimeline => ({
        clase: 'lectura',
        id: l.id,
        fecha: l.fecha,
        km: l.km,
        lectura: l,
      })),
    ];
    return items.sort((a, b) => {
      const t = parseFecha(b.fecha).getTime() - parseFecha(a.fecha).getTime();
      return t !== 0 ? t : b.km - a.km;
    });
  }, [cargasVisibles, lecturasVisibles]);

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

  const detalleAutonomia = () => {
    if (autonomiaVista.kmPorLitro == null) {
      return periodo === TODOS ? 'Faltan 2 cargas para comparar' : 'Sin ciclos cerrados este mes';
    }
    const l100 = `${fmtNumero(litrosPor100km(autonomiaVista.kmPorLitro), 1)} L/100 km`;
    const cuantos = `${autonomiaVista.tramosUsados} ${autonomiaVista.tramosUsados === 1 ? 'ciclo' : 'ciclos'}`;
    const origen =
      autonomiaVista.base === 'cargas'
        ? autonomiaVista.precision === 'exacto'
          ? 'entre cargas a tanque lleno'
          : 'entre cargas'
        : 'entre mediciones';
    return `${l100} · ${cuantos} ${origen}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titulo="Combustible"
        subtitulo={`${cargas.length} ${cargas.length === 1 ? 'carga' : 'cargas'} · ${fmtDinero(gastoCombustibleMes(cargas))} este mes`}
      />

      {!vacio ? (
        <div className="flex rounded-xl border border-carbon-600 bg-carbon-850 p-1">
          {VISTAS.map(({ v, l }) => (
            <button
              key={v}
              type="button"
              onClick={() => setVista(v)}
              className={cn(
                'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                vista === v ? 'bg-carbon-600 text-carbon-100' : 'text-carbon-400',
              )}
            >
              {l}
            </button>
          ))}
        </div>
      ) : null}

      {!vacio ? (
        <Chips
          label="Filtrar por mes"
          valor={periodo}
          onChange={(v) => {
            setPeriodo(v);
            setVisibles(POR_PAGINA);
          }}
          opciones={opcionesMes}
        />
      ) : null}

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
          {vista === 'registros' ? (
            <TanqueCard estado={tanque} capacidad={capacidad} onMedir={abrirLectura} />
          ) : null}

          {vista === 'registros' && autonomia.tramosImplausibles > 0 ? (
            <Card className="border-rojo-500/40 bg-rojo-500/[0.07]">
              <CardBody className="flex items-start gap-2">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-rojo-500" />
                <p className="text-xs text-carbon-200">
                  {autonomia.tramosImplausibles}{' '}
                  {autonomia.tramosImplausibles === 1
                    ? 'tramo da un rendimiento imposible y quedó'
                    : 'tramos dan un rendimiento imposible y quedaron'}{' '}
                  fuera del promedio. Buscá abajo los marcados en rojo: casi siempre es un
                  kilometraje con un dígito de más o una aguja marcada al revés.
                </p>
              </CardBody>
            </Card>
          ) : null}

          {vista === 'analisis' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardBody>
                    <Stat
                      rotulo="Autonomía prom."
                      icono={<Gauge size={13} />}
                      valor={
                        autonomiaVista.kmPorLitro != null
                          ? fmtNumero(autonomiaVista.kmPorLitro, 2)
                          : '—'
                      }
                      unidad="km/L"
                      tono={autonomiaVista.precision === 'estimado' ? 'normal' : 'acento'}
                      detalle={detalleAutonomia()}
                    />
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <Stat
                      rotulo="Precio por litro"
                      icono={<Fuel size={13} />}
                      valor={fmtDinero(ultimoPrecio, 2)}
                      compacto
                      detalle={
                        ultimaCarga?.tipoCombustible
                          ? `${etiquetaTipo(ultimaCarga.tipoCombustible)} · prom. ${fmtDinero(precioPromedio, 2)}`
                          : precioPromedio != null
                            ? `Promedio ${fmtDinero(precioPromedio, 2)}`
                            : undefined
                      }
                    />
                  </CardBody>
                </Card>
              </div>

              {autonomia.enCurso ? (
                <Card className="border-carbon-600">
                  <CardBody className="flex items-baseline justify-between gap-3">
                    <span className="flex flex-col">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-carbon-400">
                        Tanque en curso
                      </span>
                      <span className="num text-xs text-carbon-500">
                        {fmtNumero(autonomia.enCurso.kmRecorridos)} km desde la última carga ·{' '}
                        {fmtNumero(autonomia.enCurso.litrosConsumidos, 1)} L consumidos
                      </span>
                    </span>
                    <span className="num shrink-0 text-lg font-bold text-carbon-200">
                      {fmtNumero(autonomia.enCurso.kmPorLitro, 2)}
                      <span className="ml-1 text-xs font-medium text-carbon-400">km/L</span>
                    </span>
                  </CardBody>
                </Card>
              ) : null}

              <Suspense fallback={null}>
                <GraficosCombustible
              cargas={cargas}
              lecturas={lecturas}
              capacidad={capacidad}
              periodo={periodo}
            />
              </Suspense>
            </>
          ) : null}

          {vista === 'registros' ? (
            <ul className="flex flex-col gap-3">
              {timeline.slice(0, visibles).map((item) => {
                if (item.clase === 'lectura') {
                  const l = item.lectura;
                  const paso = pasos.get(l.id);

                  return (
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
                                {fmtFecha(l.fecha)} · {fmtNumero(l.km)} km
                              </p>
                            </div>
                            <span className="num shrink-0 text-base font-bold text-carbon-200">
                              {Math.round(l.nivel * 100)}%
                              {capacidad ? (
                                <span className="ml-1 text-xs font-normal text-carbon-400">
                                  ≈ {fmtNumero(l.nivel * capacidad, 1)} L
                                </span>
                              ) : null}
                            </span>
                          </div>

                          {paso ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <BadgeTramo tramo={paso} />
                            </div>
                          ) : null}

                          {paso ? <AvisoDescarte tramo={paso} capacidad={capacidad} /> : null}

                          {l.nota ? <p className="text-sm text-carbon-300">{l.nota}</p> : null}

                          <AccionesItem
                            onEditar={() => {
                              setEditandoLectura(l);
                              setFormLectura(true);
                            }}
                            onBorrar={() => setABorrar(item)}
                          />
                        </CardBody>
                      </Card>
                    </li>
                  );
                }

                const c = item.carga;
                const ciclo = ciclosPorCarga.get(c.id);
                // Los litros salidos del medidor son aproximados: lo dice el ≈.
                const litros = `${c.estimada ? '≈ ' : ''}${fmtNumero(c.litros, 2)} L`;
                const subtitulo = [
                  `${fmtDinero(c.precioPorLitro, 2)}/L`,
                  c.tipoCombustible ? etiquetaTipo(c.tipoCombustible) : null,
                  c.estacion,
                ]
                  .filter(Boolean)
                  .join(' · ');

                return (
                  <li key={item.id}>
                    <Card>
                      <CardBody className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="num text-sm font-semibold text-carbon-100">
                              {fmtFecha(c.fecha)} · {litros} · {fmtNumero(c.km)} km
                            </p>
                            <p className="num text-xs text-carbon-400">{subtitulo}</p>
                          </div>
                          <span className="num shrink-0 text-base font-bold text-ambar-400">
                            {fmtDinero(c.total)}
                          </span>
                        </div>

                        {ciclo || c.tanqueLleno ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {ciclo ? <BadgeTramo tramo={ciclo} /> : null}
                            {c.tanqueLleno ? <Badge tono="ok">Tanque lleno</Badge> : null}
                          </div>
                        ) : null}

                        {ciclo ? <AvisoDescarte tramo={ciclo} capacidad={capacidad} /> : null}

                        <AccionesItem
                          onEditar={() => {
                            setEditandoCarga(c);
                            setFormCarga(true);
                          }}
                          onBorrar={() => setABorrar(item)}
                        />
                      </CardBody>
                    </Card>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {vista === 'registros' && timeline.length > visibles ? (
            <Button
              ancho
              variante="secundario"
              onClick={() => setVisibles((v) => v + POR_PAGINA)}
            >
              Ver más ({timeline.length - visibles} restantes)
            </Button>
          ) : null}
        </>
      )}

      <FabAgregar onClick={abrirCarga} label="Carga" icono={<Plus size={20} />} />

      <CargaForm
        abierto={formCarga}
        onCerrar={() => setFormCarga(false)}
        inicial={editandoCarga}
        kmSugerido={activo.kmActual}
        referencia={referencia}
        capacidadTanque={capacidad}
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
        capacidadTanque={capacidad}
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
              ? `Se elimina la carga del ${fmtFecha(aBorrar.fecha)}. Los ciclos de consumo vecinos se recalculan.`
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

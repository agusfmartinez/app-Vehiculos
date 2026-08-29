import { lazy, Suspense, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Pencil,
  Plus,
  ShieldHalf,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useDatos } from '@/context/DatosContext';
import { PageHeader } from '@/components/layout/AppShell';
import { SinVehiculo } from '@/components/layout/SelectorVehiculo';
import { Button, FabAgregar } from '@/components/ui/Button';
import { Card, CardBody, Stat } from '@/components/ui/Card';
import { Chips } from '@/components/ui/Chips';
import { Badge, EmptyState } from '@/components/ui/EmptyState';
import { ConfirmarBorrado } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { fmtDinero, fmtFecha, fmtNumero } from '@/lib/format';
import { TODOS, etiquetaPeriodo } from '@/lib/periodos';
import { PolizaForm } from '@/features/seguro/PolizaForm';
import type { Poliza } from '@/types';

// recharts pesa ~350 kB: sólo se descarga al entrar a los reportes.
const GraficosSeguro = lazy(() =>
  import('@/features/seguro/GraficosSeguro').then((m) => ({ default: m.GraficosSeguro })),
);

type Vista = 'registros' | 'analisis';

const VISTAS: { v: Vista; l: string }[] = [
  { v: 'registros', l: 'Pólizas' },
  { v: 'analisis', l: 'Reportes' },
];

/** Póliza con la variación respecto del mes anterior cargado. */
interface FilaPoliza {
  poliza: Poliza;
  /** Diferencia en pesos contra la póliza previa; null en la primera. */
  variacion: number | null;
  /** La misma diferencia en porcentaje. */
  variacionPct: number | null;
}

function armarFilas(polizas: Poliza[]): FilaPoliza[] {
  // Ascendente por período para poder comparar cada una con la anterior.
  const asc = [...polizas].sort((a, b) => a.periodo.localeCompare(b.periodo));

  const filas = asc.map((poliza, i) => {
    const previa = i > 0 ? asc[i - 1] : null;
    const variacion = previa ? poliza.monto - previa.monto : null;
    return {
      poliza,
      variacion,
      variacionPct:
        previa && previa.monto > 0 ? ((poliza.monto - previa.monto) / previa.monto) * 100 : null,
    };
  });

  return filas.reverse();
}

export function SeguroPage() {
  const { polizas, activo, agregarPoliza, editarPoliza, borrarPoliza } = useDatos();
  const navigate = useNavigate();

  const [vista, setVista] = useState<Vista>('registros');
  const [anio, setAnio] = useState<string>(TODOS);
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<Poliza | undefined>();
  const [aBorrar, setABorrar] = useState<Poliza | null>(null);

  /*
   * Las variaciones se calculan sobre el historial completo y recién después se
   * filtra: la cuota de enero se compara contra diciembre, que es de otro año.
   */
  const filasTodas = useMemo(() => armarFilas(polizas), [polizas]);
  const ultima = filasTodas[0]?.poliza;

  const anios = useMemo(
    () => [...new Set(polizas.map((p) => p.periodo.slice(0, 4)))].sort().reverse(),
    [polizas],
  );

  const opcionesAnio = useMemo(
    () => [{ valor: TODOS, label: 'Todas' }, ...anios.map((a) => ({ valor: a, label: a }))],
    [anios],
  );

  const filas = useMemo(
    () => (anio === TODOS ? filasTodas : filasTodas.filter((f) => f.poliza.periodo.startsWith(anio))),
    [filasTodas, anio],
  );

  const anioActual = new Date().getFullYear();
  const anioTotal = anio === TODOS ? String(anioActual) : anio;

  const total = useMemo(
    () =>
      polizas.filter((p) => p.periodo.startsWith(anioTotal)).reduce((a, p) => a + p.monto, 0),
    [polizas, anioTotal],
  );

  /** Cuánto subió desde la póliza más vieja hasta la más nueva del período visible. */
  const acumulado = useMemo(() => {
    if (filas.length < 2) return null;
    const asc = [...filas].reverse();
    const primera = asc[0].poliza;
    const ultimaP = asc[asc.length - 1].poliza;
    if (primera.monto <= 0) return null;
    return {
      pct: ((ultimaP.monto - primera.monto) / primera.monto) * 100,
      desde: primera.periodo,
      meses: asc.length,
    };
  }, [filas]);

  /** Métricas de la vista Reportes, sobre lo que quedó filtrado. */
  const reporte = useMemo(() => {
    if (filas.length === 0) return null;

    const montos = filas.map((f) => f.poliza.monto);
    const conVariacion = filas.filter(
      (f): f is FilaPoliza & { variacionPct: number } => f.variacionPct != null,
    );
    const mayor = conVariacion.reduce<(typeof conVariacion)[number] | null>(
      (best, f) => (best == null || f.variacionPct > best.variacionPct ? f : best),
      null,
    );

    return {
      promedio: montos.reduce((a, m) => a + m, 0) / montos.length,
      total: montos.reduce((a, m) => a + m, 0),
      aumentoPromedio: conVariacion.length
        ? conVariacion.reduce((a, f) => a + f.variacionPct, 0) / conVariacion.length
        : null,
      mayor,
      meses: filas.length,
    };
  }, [filas]);

  const puntos = useMemo(
    () =>
      [...filas]
        .reverse()
        .map((f) => ({
          periodo: f.poliza.periodo,
          monto: f.poliza.monto,
          variacionPct: f.variacionPct,
        })),
    [filas],
  );

  if (!activo) return <SinVehiculo onNuevo={() => navigate('/vehiculo')} />;

  const abrirNuevo = () => {
    setEditando(undefined);
    setFormAbierto(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titulo="Seguro"
        subtitulo={`${polizas.length} ${polizas.length === 1 ? 'póliza' : 'pólizas'} cargadas`}
      />

      {polizas.length === 0 ? (
        <EmptyState
          icono={<ShieldHalf size={22} />}
          titulo="Sin pólizas cargadas"
          mensaje="Cargá la cuota de este mes. A partir de la segunda, la app te muestra cuánto aumentó mes a mes."
          textoAccion="Cargar primera póliza"
          onAccion={abrirNuevo}
        />
      ) : (
        <>
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

          <Chips
            label="Filtrar por año"
            valor={anio}
            onChange={setAnio}
            opciones={opcionesAnio}
          />

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardBody>
                <Stat
                  rotulo="Cuota actual"
                  icono={<ShieldHalf size={13} />}
                  valor={fmtDinero(ultima?.monto)}
                  compacto
                  tono="acento"
                  detalle={
                    ultima ? `${ultima.aseguradora} · ${etiquetaPeriodo(ultima.periodo)}` : undefined
                  }
                />
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <Stat
                  rotulo={`Total ${anioTotal}`}
                  icono={<TrendingUp size={13} />}
                  valor={fmtDinero(total)}
                  compacto
                  detalle={
                    acumulado
                      ? `${acumulado.pct >= 0 ? '+' : ''}${fmtNumero(acumulado.pct, 1)} % desde ${etiquetaPeriodo(acumulado.desde)}`
                      : 'Cargá otro mes para comparar'
                  }
                />
              </CardBody>
            </Card>
          </div>

          {filas.length === 0 ? (
            <EmptyState
              icono={<ShieldHalf size={22} />}
              titulo="Sin pólizas en este año"
              mensaje="Probá con otro año o con «Todas»."
            />
          ) : vista === 'registros' ? (
            <ul className="flex flex-col gap-3">
              {filas.map(({ poliza, variacion, variacionPct }) => {
                const subio = (variacion ?? 0) > 0;

                return (
                  <li key={poliza.id}>
                    <Card>
                      <CardBody className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold capitalize text-carbon-100">
                              {etiquetaPeriodo(poliza.periodo)}
                            </p>
                            <p className="text-xs text-carbon-400">
                              {[poliza.aseguradora, poliza.cobertura].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          <span className="num shrink-0 text-base font-bold text-ambar-400">
                            {fmtDinero(poliza.monto)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {variacion != null && variacion !== 0 ? (
                            <Badge
                              tono={subio ? 'peligro' : 'ok'}
                              icono={subio ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                            >
                              {subio ? '+' : '−'}
                              {fmtDinero(Math.abs(variacion))}
                              {variacionPct != null
                                ? ` (${fmtNumero(Math.abs(variacionPct), 1)} %)`
                                : ''}
                            </Badge>
                          ) : variacion === 0 ? (
                            <Badge>Sin cambios</Badge>
                          ) : (
                            <Badge>Primera cargada</Badge>
                          )}
                          {poliza.numeroPoliza ? <Badge>N° {poliza.numeroPoliza}</Badge> : null}
                          {poliza.vencimiento ? (
                            <Badge>Vence {fmtFecha(poliza.vencimiento)}</Badge>
                          ) : null}
                        </div>

                        {poliza.notas ? (
                          <p className="text-sm text-carbon-300">{poliza.notas}</p>
                        ) : null}

                        <div className="flex gap-2 border-t border-carbon-700 pt-2">
                          <Button
                            variante="fantasma"
                            tamanio="sm"
                            icono={<Pencil size={14} />}
                            onClick={() => {
                              setEditando(poliza);
                              setFormAbierto(true);
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            variante="fantasma"
                            tamanio="sm"
                            icono={<Trash2 size={14} />}
                            className="text-rojo-500 hover:bg-rojo-500/10 hover:text-rojo-500"
                            onClick={() => setABorrar(poliza)}
                          >
                            Borrar
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col gap-3">
              {reporte ? (
                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardBody>
                      <Stat
                        rotulo="Cuota promedio"
                        icono={<BarChart3 size={13} />}
                        valor={fmtDinero(reporte.promedio)}
                        compacto
                        detalle={`${reporte.meses} ${reporte.meses === 1 ? 'mes' : 'meses'} · total ${fmtDinero(reporte.total)}`}
                      />
                    </CardBody>
                  </Card>
                  <Card>
                    <CardBody>
                      <Stat
                        rotulo="Aumento promedio"
                        icono={<TrendingUp size={13} />}
                        valor={
                          reporte.aumentoPromedio != null
                            ? `${reporte.aumentoPromedio >= 0 ? '+' : ''}${fmtNumero(reporte.aumentoPromedio, 1)}`
                            : '—'
                        }
                        unidad={reporte.aumentoPromedio != null ? '%' : undefined}
                        tono={
                          reporte.aumentoPromedio == null
                            ? 'normal'
                            : reporte.aumentoPromedio > 0
                              ? 'peligro'
                              : 'ok'
                        }
                        detalle={
                          reporte.mayor
                            ? `Mayor salto: +${fmtNumero(reporte.mayor.variacionPct, 1)} % en ${etiquetaPeriodo(reporte.mayor.poliza.periodo)}`
                            : 'Necesita dos meses cargados'
                        }
                      />
                    </CardBody>
                  </Card>
                </div>
              ) : null}

              {puntos.length >= 2 ? (
                <Suspense fallback={null}>
                  <GraficosSeguro puntos={puntos} />
                </Suspense>
              ) : (
                <Card>
                  <CardBody>
                    <p className="text-sm text-carbon-400">
                      Cargá al menos dos meses para ver la evolución de la cuota.
                    </p>
                  </CardBody>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      <FabAgregar onClick={abrirNuevo} label="Póliza" icono={<Plus size={20} />} />

      <PolizaForm
        abierto={formAbierto}
        onCerrar={() => setFormAbierto(false)}
        inicial={editando}
        anterior={ultima}
        periodosUsados={polizas.map((p) => p.periodo)}
        onGuardar={(p) => {
          if (p.id) editarPoliza(p as Poliza);
          else agregarPoliza(p);
        }}
      />

      <ConfirmarBorrado
        abierto={aBorrar !== null}
        titulo="Borrar póliza"
        mensaje={
          aBorrar
            ? `Se elimina la póliza de ${etiquetaPeriodo(aBorrar.periodo)}. Las variaciones de los meses vecinos se recalculan.`
            : ''
        }
        onCancelar={() => setABorrar(null)}
        onConfirmar={() => {
          if (aBorrar) borrarPoliza(aBorrar.id);
          setABorrar(null);
        }}
      />
    </div>
  );
}

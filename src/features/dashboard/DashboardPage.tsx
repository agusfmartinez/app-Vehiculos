import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronRight,
  Droplet,
  Fuel,
  Route,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Wrench,
} from 'lucide-react';
import { useDatos } from '@/context/DatosContext';
import { estadoTanque, resumenDashboard, type EstadoVTV } from '@/lib/calculos';
import { fmtDinero, fmtFecha, fmtKm, fmtNumero, textoDias } from '@/lib/format';
import { Card, CardBody, CardHeader, Stat } from '@/components/ui/Card';
import { Badge } from '@/components/ui/EmptyState';
import { SinVehiculo } from '@/components/layout/SelectorVehiculo';
import { VehiculoCard } from '@/features/dashboard/VehiculoCard';

const TONO_VTV: Record<EstadoVTV, 'ok' | 'alerta' | 'peligro' | 'neutro'> = {
  vigente: 'ok',
  'por-vencer': 'alerta',
  vencida: 'peligro',
  rechazada: 'peligro',
  'sin-datos': 'neutro',
};

const TONO_STAT_VTV: Record<EstadoVTV, 'normal' | 'ok' | 'alerta' | 'peligro'> = {
  vigente: 'ok',
  'por-vencer': 'alerta',
  vencida: 'peligro',
  rechazada: 'peligro',
  'sin-datos': 'normal',
};

export function DashboardPage() {
  const { activo, services, cargas, lecturas, vtv, kmMaxRegistrado, kmMinRegistrado } =
    useDatos();
  const navigate = useNavigate();

  // El odómetro es derivado: nunca puede ir por detrás del registro más alto.
  const kmOdometro = Math.max(activo?.kmActual ?? 0, kmMaxRegistrado);

  const r = useMemo(
    () =>
      resumenDashboard({
        services,
        cargas,
        lecturas,
        vtv,
        kmActual: kmOdometro,
        capacidad: activo?.capacidadTanque,
      }),
    [services, cargas, lecturas, vtv, activo, kmOdometro],
  );

  const tanque = useMemo(
    () =>
      estadoTanque({
        cargas,
        lecturas,
        kmActual: kmOdometro,
        capacidad: activo?.capacidadTanque,
        kmPorLitro: r.autonomia.kmPorLitro,
      }),
    [cargas, lecturas, activo, kmOdometro, r.autonomia.kmPorLitro],
  );

  // Distancia cubierta por el historial: del registro más viejo al más nuevo.
  const recorrido = useMemo(() => {
    if (kmMinRegistrado == null || kmMaxRegistrado <= kmMinRegistrado) return null;
    return { km: kmMaxRegistrado - kmMinRegistrado, desde: kmMinRegistrado };
  }, [kmMinRegistrado, kmMaxRegistrado]);

  const anio = new Date().getFullYear();
  const mes = new Date().toLocaleDateString('es-AR', { month: 'long' });

  if (!activo) return <SinVehiculo onNuevo={() => navigate('/vehiculo')} />;

  return (
    <div className="flex flex-col gap-4">
      <VehiculoCard />

      {r.alertas.length > 0 ? (
        <Card className="border-ambar-500/40 bg-ambar-500/[0.07]">
          <CardHeader
            titulo="Mantenimiento pendiente"
            icono={<AlertTriangle size={13} className="text-ambar-400" />}
          />
          <CardBody className="flex flex-col gap-2 pt-3">
            {r.alertas.map((a) => (
              <div
                key={a.service.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-carbon-850 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-carbon-100">{a.service.tipo}</p>
                  <p className="num text-xs text-carbon-400">{a.detalle}</p>
                </div>
                <Badge tono={a.urgencia === 'vencido' ? 'peligro' : 'alerta'}>
                  {a.urgencia === 'vencido' ? 'Vencido' : 'Próximo'}
                </Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Link to="/vtv" className="block">
          <Card className="h-full transition-colors hover:border-carbon-600">
            <CardBody>
              <Stat
                rotulo="VTV"
                icono={<ShieldCheck size={13} />}
                valor={<span className="text-xl">{r.vtv.etiqueta}</span>}
                tono={TONO_STAT_VTV[r.vtv.estado]}
                detalle={
                  r.vtv.registro ? (
                    <span className="flex flex-wrap items-center gap-1.5">
                      Vence {fmtFecha(r.vtv.registro.fechaVencimiento)}
                      {r.vtv.diasRestantes != null ? (
                        <Badge tono={TONO_VTV[r.vtv.estado]}>
                          {textoDias(r.vtv.diasRestantes)}
                        </Badge>
                      ) : null}
                    </span>
                  ) : (
                    'Cargá tu última VTV'
                  )
                }
              />
            </CardBody>
          </Card>
        </Link>

        <Card>
          <CardBody>
            <Stat
              rotulo="Distancia registrada"
              icono={<Route size={13} />}
              valor={recorrido ? fmtNumero(recorrido.km) : '—'}
              unidad={recorrido ? 'km' : undefined}
              detalle={
                recorrido
                  ? `Desde los ${fmtNumero(recorrido.desde)} km`
                  : 'Necesita 2 registros con km'
              }
            />
          </CardBody>
        </Card>

        <Link to="/combustible" className="block">
          <Card className="h-full transition-colors hover:border-carbon-600">
            <CardBody>
              <Stat
                rotulo="Nafta en tanque"
                icono={<Droplet size={13} />}
                valor={tanque.litros != null ? fmtNumero(tanque.litros, 1) : '—'}
                unidad={tanque.litros != null ? 'L' : undefined}
                tono={
                  tanque.nivel == null
                    ? 'normal'
                    : tanque.nivel <= 0.12
                      ? 'peligro'
                      : tanque.nivel <= 0.25
                        ? 'alerta'
                        : 'ok'
                }
                detalle={
                  tanque.autonomiaRestante != null
                    ? `Alcanza ~${fmtNumero(tanque.autonomiaRestante)} km`
                    : 'Registrá una medición del tanque'
                }
              />
            </CardBody>
          </Card>
        </Link>

        <Card>
          <CardBody>
            <Stat
              rotulo="Autonomía"
              icono={<TrendingUp size={13} />}
              valor={r.autonomia.kmPorLitro != null ? fmtNumero(r.autonomia.kmPorLitro, 2) : '—'}
              unidad="km/L"
              tono="acento"
              detalle={
                r.autonomia.kmPorLitro != null
                  ? `${fmtNumero(r.litros100, 1)} L/100 km · ${r.autonomia.tramosUsados} ${r.autonomia.tramosUsados === 1 ? 'tramo' : 'tramos'}${r.autonomia.precision === 'estimado' ? ' (estimado)' : ''}`
                  : 'Necesita 2 registros con nivel conocido'
              }
            />
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat
              rotulo={`Nafta ${mes}`}
              icono={<Fuel size={13} />}
              valor={fmtDinero(r.gastoCombustibleMes)}
              compacto
              detalle={`Año ${anio}: ${fmtDinero(r.gastoCombustibleAnio)}`}
            />
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat
              rotulo={`Services ${anio}`}
              icono={<Wallet size={13} />}
              valor={fmtDinero(r.gastoServicesAnio)}
              compacto
              detalle={`${services.length} ${services.length === 1 ? 'registro' : 'registros'}`}
            />
          </CardBody>
        </Card>
      </div>

      <Link to="/services" className="block">
        <Card className="transition-colors hover:border-carbon-600">
          <CardHeader titulo="Último service" icono={<Wrench size={13} />} />
          <CardBody className="flex items-center justify-between gap-3 pt-2">
            {r.ultimoService ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-carbon-100">
                  {r.ultimoService.tipo}
                </p>
                <p className="num text-xs text-carbon-400">
                  {fmtFecha(r.ultimoService.fecha)} · {fmtKm(r.ultimoService.km)} ·{' '}
                  {fmtDinero(r.ultimoService.costo)}
                </p>
                {kmOdometro > r.ultimoService.km ? (
                  <p className="num mt-1 text-xs text-carbon-500">
                    {fmtKm(kmOdometro - r.ultimoService.km)} recorridos desde entonces
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-carbon-400">Todavía no cargaste ningún service.</p>
            )}
            <ChevronRight size={18} className="shrink-0 text-carbon-500" />
          </CardBody>
        </Card>
      </Link>
    </div>
  );
}

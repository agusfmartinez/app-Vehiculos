import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronRight,
  Droplet,
  Fuel,
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
import { KmActualCard } from '@/features/dashboard/KmActualCard';

const TONO_VTV: Record<EstadoVTV, 'ok' | 'alerta' | 'peligro' | 'neutro'> = {
  vigente: 'ok',
  'por-vencer': 'alerta',
  vencida: 'peligro',
  rechazada: 'peligro',
  'sin-datos': 'neutro',
};

export function DashboardPage() {
  const { activo, services, cargas, lecturas, vtv } = useDatos();
  const navigate = useNavigate();

  const r = useMemo(
    () =>
      resumenDashboard({
        services,
        cargas,
        lecturas,
        vtv,
        kmActual: activo?.kmActual ?? 0,
        capacidad: activo?.capacidadTanque,
      }),
    [services, cargas, lecturas, vtv, activo],
  );

  const tanque = useMemo(
    () =>
      estadoTanque({
        cargas,
        lecturas,
        kmActual: activo?.kmActual ?? 0,
        capacidad: activo?.capacidadTanque,
        kmPorLitro: r.autonomia.kmPorLitro,
      }),
    [cargas, lecturas, activo, r.autonomia.kmPorLitro],
  );

  const anio = new Date().getFullYear();
  const mes = new Date().toLocaleDateString('es-AR', { month: 'long' });

  if (!activo) return <SinVehiculo onNuevo={() => navigate('/vehiculo')} />;

  return (
    <div className="flex flex-col gap-4">
      <KmActualCard />

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

      <Link to="/vtv" className="block">
        <Card className="transition-colors hover:border-carbon-600">
          <CardBody className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-carbon-400">
                <ShieldCheck size={13} />
                VTV
              </span>
              <span className="flex items-center gap-2">
                <span
                  className={
                    'text-lg font-bold ' +
                    (r.vtv.estado === 'vigente'
                      ? 'text-verde-500'
                      : r.vtv.estado === 'por-vencer'
                        ? 'text-ambar-400'
                        : r.vtv.estado === 'sin-datos'
                          ? 'text-carbon-300'
                          : 'text-rojo-500')
                  }
                >
                  {r.vtv.etiqueta}
                </span>
                {r.vtv.diasRestantes != null ? (
                  <Badge tono={TONO_VTV[r.vtv.estado]}>{textoDias(r.vtv.diasRestantes)}</Badge>
                ) : null}
              </span>
              {r.vtv.registro ? (
                <span className="num text-xs text-carbon-500">
                  Vence {fmtFecha(r.vtv.registro.fechaVencimiento)}
                </span>
              ) : (
                <span className="text-xs text-carbon-500">Cargá tu última VTV</span>
              )}
            </div>
            <ChevronRight size={18} className="shrink-0 text-carbon-500" />
          </CardBody>
        </Card>
      </Link>

      <div className="grid grid-cols-2 gap-3">
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
              detalle={`${services.length} ${services.length === 1 ? 'registro' : 'registros'}`}
            />
          </CardBody>
        </Card>

        <Card>
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
                {activo.kmActual > r.ultimoService.km ? (
                  <p className="num mt-1 text-xs text-carbon-500">
                    {fmtKm(activo.kmActual - r.ultimoService.km)} recorridos desde entonces
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

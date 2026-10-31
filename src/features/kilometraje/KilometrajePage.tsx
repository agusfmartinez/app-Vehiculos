import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarRange, Route as RutaIcon, TrendingUp } from 'lucide-react';
import { useDatos } from '@/context/DatosContext';
import { PageHeader } from '@/components/layout/AppShell';
import { SinVehiculo } from '@/components/layout/SelectorVehiculo';
import { Card, CardBody, CardHeader, Stat } from '@/components/ui/Card';
import { Chips } from '@/components/ui/Chips';
import { EmptyState } from '@/components/ui/EmptyState';
import { fmtNumero } from '@/lib/format';
import { kmPorAnio, kmPorMes } from '@/lib/kilometraje';

const EJE = { stroke: '#6b7280', fontSize: 11 };
const GRID = '#262a31';
const AMBAR = '#f5a524';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_LARGO = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

interface TooltipProps {
  active?: boolean;
  payload?: { value: number; payload: { titulo: string } }[];
}

function TooltipKm({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-carbon-600 bg-carbon-850 px-3 py-2 shadow-lg">
      <p className="num text-[11px] text-carbon-400">{p.payload.titulo}</p>
      <p className="num text-sm font-bold text-carbon-100">{fmtNumero(p.value)} km</p>
    </div>
  );
}

export function KilometrajePage() {
  const { activo, services, cargas, lecturas } = useDatos();
  const navigate = useNavigate();
  const [anioElegido, setAnioElegido] = useState<string | null>(null);

  const porMes = useMemo(
    () =>
      kmPorMes([
        ...services.map((s) => ({ fecha: s.fecha, km: s.km })),
        ...cargas.map((c) => ({ fecha: c.fecha, km: c.km })),
        ...lecturas.map((l) => ({ fecha: l.fecha, km: l.km })),
      ]),
    [services, cargas, lecturas],
  );

  const porAnio = useMemo(() => kmPorAnio(porMes), [porMes]);
  const anios = useMemo(() => [...porAnio.keys()].sort().reverse(), [porAnio]);
  const anio = anioElegido && anios.includes(anioElegido) ? anioElegido : anios[0];

  const datosMes = useMemo(
    () =>
      MESES.map((m, i) => {
        const periodo = `${anio}-${String(i + 1).padStart(2, '0')}`;
        return {
          etiqueta: m,
          titulo: `${MESES_LARGO[i]} ${anio}`,
          km: Math.round(porMes.get(periodo) ?? 0),
        };
      }),
    [porMes, anio],
  );

  const datosAnio = useMemo(
    () =>
      [...anios].reverse().map((a) => ({
        etiqueta: a,
        titulo: `Año ${a}`,
        km: Math.round(porAnio.get(a) ?? 0),
      })),
    [anios, porAnio],
  );

  if (!activo) return <SinVehiculo onNuevo={() => navigate('/vehiculo')} />;

  if (anios.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader volver titulo="Kilómetros" subtitulo="Recorrido por mes y por año" />
        <EmptyState
          icono={<RutaIcon size={22} />}
          titulo="Todavía no hay recorrido para calcular"
          mensaje="Se calcula con el kilometraje de tus services, cargas de nafta y mediciones del tanque. Hacen falta al menos dos registros en fechas distintas."
        />
      </div>
    );
  }

  const mesesConDatos = datosMes.filter((d) => d.km > 0);
  const totalAnio = datosMes.reduce((a, d) => a + d.km, 0);
  const promedio = mesesConDatos.length ? totalAnio / mesesConDatos.length : 0;
  const mayor = mesesConDatos.reduce<(typeof datosMes)[number] | null>(
    (m, d) => (!m || d.km > m.km ? d : m),
    null,
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader volver titulo="Kilómetros" subtitulo="Recorrido por mes y por año" />

      {anios.length > 1 ? (
        <Chips
          label="Filtrar por año"
          valor={anio}
          onChange={setAnioElegido}
          opciones={anios.map((a) => ({ valor: a, label: a }))}
        />
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardBody>
            <Stat
              rotulo={`Total ${anio}`}
              icono={<RutaIcon size={13} />}
              valor={fmtNumero(totalAnio)}
              unidad="km"
              compacto
              tono="acento"
            />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat
              rotulo="Promedio mensual"
              icono={<TrendingUp size={13} />}
              valor={fmtNumero(promedio)}
              unidad="km"
              compacto
              detalle={`${mesesConDatos.length} ${mesesConDatos.length === 1 ? 'mes' : 'meses'} con datos`}
            />
          </CardBody>
        </Card>
      </div>

      {mayor ? (
        <p className="flex items-center gap-1.5 text-xs text-carbon-400">
          <CalendarRange size={13} />
          Mes con más recorrido: {mayor.titulo.split(' ')[0].toLowerCase()} ({fmtNumero(mayor.km)} km)
        </p>
      ) : null}

      <Card>
        <CardHeader titulo={`Km por mes · ${anio}`} />
        <CardBody className="pt-3 pl-0">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={datosMes} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="etiqueta" tick={EJE} tickLine={false} axisLine={false} interval={0} />
              <YAxis
                tick={EJE}
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={(v: number) => fmtNumero(v)}
              />
              <Tooltip content={<TooltipKm />} cursor={{ fill: '#ffffff08' }} />
              <Bar dataKey="km" fill={AMBAR} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      {datosAnio.length > 1 ? (
        <Card>
          <CardHeader titulo="Km por año" />
          <CardBody className="pt-3 pl-0">
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={datosAnio} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="etiqueta" tick={EJE} tickLine={false} axisLine={false} />
                <YAxis
                  tick={EJE}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(v: number) => fmtNumero(v)}
                />
                <Tooltip content={<TooltipKm />} cursor={{ fill: '#ffffff08' }} />
                <Bar dataKey="km" fill={AMBAR} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      ) : null}

      <p className="text-xs text-carbon-500">
        Es una estimación: se toma el kilometraje de services, cargas y mediciones, y entre dos
        registros se reparte parejo por día. El primer y el último mes pueden mostrar menos de lo
        real. Cuantos más registros cargues, más preciso.
      </p>
    </div>
  );
}

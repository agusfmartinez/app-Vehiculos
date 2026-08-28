import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { calcularTramos, ordenarCargasAsc } from '@/lib/calculos';
import { fmtFechaCorta, fmtNumero } from '@/lib/format';
import type { CargaCombustible } from '@/types';

const EJE = { stroke: '#6b7280', fontSize: 11 };
const GRID = '#262a31';

/** Cada tipo de nafta va en su propia serie: mezclarlas falsea la tendencia. */
const SERIES = [
  { clave: 'super', label: 'Súper', color: '#f5a524' },
  { clave: 'premium', label: 'Premium', color: '#5b9bd5' },
  { clave: 'sinTipo', label: 'Sin especificar', color: '#9aa1ad' },
] as const;

type ClaveSerie = (typeof SERIES)[number]['clave'];

function claveDe(c: CargaCombustible): ClaveSerie {
  if (c.tipoCombustible === 'premium') return 'premium';
  if (c.tipoCombustible === 'super') return 'super';
  return 'sinTipo';
}

interface TooltipProps {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
  sufijo: string;
  decimales: number;
}

function TooltipTablero({ active, payload, label, sufijo, decimales }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-carbon-600 bg-carbon-850 px-3 py-2 shadow-lg">
      <p className="num text-[11px] text-carbon-400">{label}</p>
      {payload
        .filter((p) => p.value != null)
        .map((p) => (
          <p key={p.name} className="num text-sm font-bold" style={{ color: p.color }}>
            {fmtNumero(p.value, decimales)} {sufijo}
            <span className="ml-1 text-[11px] font-normal text-carbon-400">{p.name}</span>
          </p>
        ))}
    </div>
  );
}

export function GraficosCombustible({ cargas }: { cargas: CargaCombustible[] }) {
  /**
   * Una fila por fecha con una columna por tipo de nafta. Recharts une los
   * huecos con `connectNulls`, así cada serie dibuja su propia línea aunque
   * las cargas se alternen entre súper y premium.
   */
  const { datosPrecio, seriesPresentes } = useMemo(() => {
    const asc = ordenarCargasAsc(cargas).filter((c) => c.precioPorLitro > 0);
    const presentes = new Set<ClaveSerie>();
    const filas = asc.map((c) => {
      const clave = claveDe(c);
      presentes.add(clave);
      return { fecha: fmtFechaCorta(c.fecha), [clave]: c.precioPorLitro } as Record<
        string,
        string | number
      >;
    });
    return {
      datosPrecio: filas,
      seriesPresentes: SERIES.filter((s) => presentes.has(s.clave)),
    };
  }, [cargas]);

  const datosAutonomia = useMemo(
    () =>
      calcularTramos(cargas)
        .filter((t) => t.confiable && t.kmPorLitro != null)
        .map((t) => ({
          fecha: fmtFechaCorta(t.carga.fecha),
          kmL: Number(t.kmPorLitro!.toFixed(2)),
        })),
    [cargas],
  );

  const hayPrecio = datosPrecio.length >= 2;
  if (!hayPrecio && datosAutonomia.length < 2) return null;

  return (
    <div className="flex flex-col gap-3">
      {hayPrecio ? (
        <Card>
          <CardHeader titulo="Precio por litro" />
          <CardBody className="pt-3 pl-0">
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={datosPrecio} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="fecha" tick={EJE} tickLine={false} axisLine={false} minTickGap={20} />
                <YAxis
                  tick={EJE}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={(v: number) => `$${fmtNumero(v, 0)}`}
                  domain={['dataMin - 50', 'dataMax + 50']}
                />
                <Tooltip
                  content={<TooltipTablero sufijo="$/L" decimales={2} />}
                  cursor={{ stroke: '#474d58' }}
                />
                {seriesPresentes.length > 1 ? (
                  <Legend
                    verticalAlign="bottom"
                    height={24}
                    wrapperStyle={{ fontSize: 11, color: '#9aa1ad' }}
                  />
                ) : null}
                {seriesPresentes.map((s) => (
                  <Line
                    key={s.clave}
                    type="monotone"
                    dataKey={s.clave}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2}
                    connectNulls
                    dot={{ r: 2.5, fill: s.color }}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      ) : null}

      {datosAutonomia.length >= 2 ? (
        <Card>
          <CardHeader titulo="Autonomía (km/L)" />
          <CardBody className="pt-3 pl-0">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={datosAutonomia} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="fecha" tick={EJE} tickLine={false} axisLine={false} minTickGap={20} />
                <YAxis
                  tick={EJE}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tickFormatter={(v: number) => fmtNumero(v, 1)}
                />
                <Tooltip
                  content={<TooltipTablero sufijo="km/L" decimales={2} />}
                  cursor={{ stroke: '#474d58' }}
                />
                <Line
                  type="monotone"
                  dataKey="kmL"
                  name="Autonomía"
                  stroke="#2ecc71"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: '#2ecc71' }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="px-4 pt-2 text-xs text-carbon-500">
              Sólo tramos confiables (tanque lleno en las dos cargas).
            </p>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

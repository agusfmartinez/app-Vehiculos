import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { fmtDinero, fmtNumero } from '@/lib/format';
import { etiquetaPeriodoCorta } from '@/lib/periodos';

const EJE = { stroke: '#6b7280', fontSize: 11 };
const GRID = '#262a31';
const AMBAR = '#f5a524';
const ROJO = '#ef4444';
const VERDE = '#2ecc71';

/** Un mes de póliza ya comparado contra el anterior. */
export interface PuntoSeguro {
  periodo: string;
  monto: number;
  /** Variación porcentual contra el mes previo; null en el primero de la serie. */
  variacionPct: number | null;
}

interface TooltipProps {
  active?: boolean;
  payload?: { value: number; payload: { etiqueta: string } }[];
  formato: (v: number) => string;
}

function TooltipSeguro({ active, payload, formato }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  if (p.value == null) return null;
  return (
    <div className="rounded-lg border border-carbon-600 bg-carbon-850 px-3 py-2 shadow-lg">
      <p className="num text-[11px] capitalize text-carbon-400">{p.payload.etiqueta}</p>
      <p className="num text-sm font-bold text-carbon-100">{formato(p.value)}</p>
    </div>
  );
}

interface Props {
  /** Puntos en orden ascendente por período. */
  puntos: PuntoSeguro[];
}

/**
 * Evolución de la cuota del seguro. Dos lecturas distintas del mismo dato:
 * el monto muestra cuánto pagás, la variación muestra el ritmo del aumento —
 * que es lo que se compara contra la inflación.
 */
export function GraficosSeguro({ puntos }: Props) {
  const datos = puntos.map((p) => ({
    etiqueta: etiquetaPeriodoCorta(p.periodo),
    monto: p.monto,
    variacion: p.variacionPct != null ? Number(p.variacionPct.toFixed(1)) : null,
  }));

  const variaciones = datos.filter((d) => d.variacion != null);

  if (datos.length < 2) return null;

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader titulo="Cuota mensual" />
        <CardBody className="pt-3 pl-0">
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={datos} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="etiqueta"
                tick={EJE}
                tickLine={false}
                axisLine={false}
                minTickGap={16}
              />
              <YAxis
                tick={EJE}
                tickLine={false}
                axisLine={false}
                width={58}
                tickFormatter={(v: number) => `$${fmtNumero(v, 0)}`}
                domain={['dataMin - 1000', 'dataMax + 1000']}
              />
              <Tooltip
                content={<TooltipSeguro formato={(v) => fmtDinero(v)} />}
                cursor={{ stroke: '#474d58' }}
              />
              <Line
                type="monotone"
                dataKey="monto"
                stroke={AMBAR}
                strokeWidth={2}
                dot={{ r: 2.5, fill: AMBAR }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      {variaciones.length >= 2 ? (
        <Card>
          <CardHeader titulo="Aumento mes a mes (%)" />
          <CardBody className="pt-3 pl-0">
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={datos} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis
                  dataKey="etiqueta"
                  tick={EJE}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={16}
                />
                <YAxis
                  tick={EJE}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tickFormatter={(v: number) => `${fmtNumero(v, 0)}%`}
                />
                <Tooltip
                  content={
                    <TooltipSeguro
                      formato={(v) => `${v > 0 ? '+' : ''}${fmtNumero(v, 1)} %`}
                    />
                  }
                  cursor={{ fill: '#ffffff08' }}
                />
                <ReferenceLine y={0} stroke="#474d58" />
                <Bar dataKey="variacion" radius={[3, 3, 0, 0]}>
                  {datos.map((d, i) => (
                    <Cell key={i} fill={(d.variacion ?? 0) >= 0 ? ROJO : VERDE} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="px-4 pt-2 text-xs text-carbon-500">
              Cada barra es cuánto cambió la cuota respecto del mes anterior cargado.
            </p>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

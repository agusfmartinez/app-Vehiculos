import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useDatos } from '@/context/DatosContext';
import { PageHeader } from '@/components/layout/AppShell';
import { SinVehiculo } from '@/components/layout/SelectorVehiculo';
import { Button, FabAgregar } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge, EmptyState } from '@/components/ui/EmptyState';
import { ConfirmarBorrado } from '@/components/ui/Modal';
import { estadoVTV, ordenarVtvDesc, type EstadoVTV } from '@/lib/calculos';
import { diasHasta, fmtDinero, fmtFecha, textoDias } from '@/lib/format';
import { cn } from '@/lib/cn';
import { VtvForm } from '@/features/vtv/VtvForm';
import type { RegistroVTV, ResultadoVTV } from '@/types';

const COLOR_ESTADO: Record<EstadoVTV, string> = {
  vigente: 'border-verde-500/40 bg-verde-500/[0.07]',
  'por-vencer': 'border-ambar-500/40 bg-ambar-500/[0.07]',
  vencida: 'border-rojo-500/40 bg-rojo-500/[0.07]',
  rechazada: 'border-rojo-500/40 bg-rojo-500/[0.07]',
  'sin-datos': '',
};

const TEXTO_ESTADO: Record<EstadoVTV, string> = {
  vigente: 'text-verde-500',
  'por-vencer': 'text-ambar-400',
  vencida: 'text-rojo-500',
  rechazada: 'text-rojo-500',
  'sin-datos': 'text-carbon-300',
};

const TONO_RESULTADO: Record<ResultadoVTV, 'ok' | 'peligro' | 'alerta'> = {
  aprobada: 'ok',
  rechazada: 'peligro',
  pendiente: 'alerta',
};

const ETIQUETA_RESULTADO: Record<ResultadoVTV, string> = {
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  pendiente: 'Pendiente',
};

export function VtvPage() {
  const { vtv: registros, activo, agregarVtv, editarVtv, borrarVtv } = useDatos();
  const navigate = useNavigate();
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<RegistroVTV | undefined>();
  const [aBorrar, setABorrar] = useState<RegistroVTV | null>(null);

  const resumen = useMemo(() => estadoVTV(registros), [registros]);
  const lista = useMemo(() => ordenarVtvDesc(registros), [registros]);

  const abrirNuevo = () => {
    setEditando(undefined);
    setFormAbierto(true);
  };

  if (!activo) return <SinVehiculo onNuevo={() => navigate('/vehiculo')} />;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader titulo="VTV" subtitulo="Verificación técnica vehicular" />

      {registros.length === 0 ? (
        <EmptyState
          icono={<ShieldCheck size={22} />}
          titulo="Sin VTV registradas"
          mensaje="Cargá la última verificación con su fecha de vencimiento y el tablero te avisa 30 días antes."
          textoAccion="Cargar VTV"
          onAccion={abrirNuevo}
        />
      ) : (
        <>
          <Card className={cn('border', COLOR_ESTADO[resumen.estado])}>
            <CardBody className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-carbon-400">
                Estado actual
              </span>
              <span className={cn('text-2xl font-bold', TEXTO_ESTADO[resumen.estado])}>
                {resumen.etiqueta}
              </span>
              {resumen.registro ? (
                <span className="num text-sm text-carbon-300">
                  Vence {fmtFecha(resumen.registro.fechaVencimiento)}
                  {resumen.diasRestantes != null ? ` · ${textoDias(resumen.diasRestantes)}` : ''}
                </span>
              ) : null}
            </CardBody>
          </Card>

          <ul className="flex flex-col gap-3">
            {lista.map((v) => {
              const dias = diasHasta(v.fechaVencimiento);
              const vencida = Number.isFinite(dias) && dias < 0;
              return (
                <li key={v.id}>
                  <Card>
                    <CardBody className="flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="num text-sm font-semibold text-carbon-100">
                            {fmtFecha(v.fechaRealizada)} → {fmtFecha(v.fechaVencimiento)}
                          </p>
                          <p className="num text-xs text-carbon-400">
                            {vencida ? 'Venció' : 'Vence'} {textoDias(dias)}
                          </p>
                        </div>
                        {v.costo != null ? (
                          <span className="num shrink-0 text-base font-bold text-ambar-400">
                            {fmtDinero(v.costo)}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge tono={TONO_RESULTADO[v.resultado]}>
                          {ETIQUETA_RESULTADO[v.resultado]}
                        </Badge>
                        {vencida ? <Badge tono="peligro">Vencida</Badge> : null}
                      </div>

                      {v.observaciones ? (
                        <p className="text-sm text-carbon-300">{v.observaciones}</p>
                      ) : null}

                      <div className="flex gap-2 border-t border-carbon-700 pt-2">
                        <Button
                          variante="fantasma"
                          tamanio="sm"
                          icono={<Pencil size={14} />}
                          onClick={() => {
                            setEditando(v);
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
                          onClick={() => setABorrar(v)}
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
        </>
      )}

      <FabAgregar onClick={abrirNuevo} label="VTV" icono={<Plus size={20} />} />

      <VtvForm
        abierto={formAbierto}
        onCerrar={() => setFormAbierto(false)}
        inicial={editando}
        onGuardar={(v) => {
          if (v.id) editarVtv(v as RegistroVTV);
          else agregarVtv(v);
        }}
      />

      <ConfirmarBorrado
        abierto={aBorrar !== null}
        titulo="Borrar VTV"
        mensaje={
          aBorrar
            ? `Se elimina el registro del ${fmtFecha(aBorrar.fechaRealizada)}. No se puede deshacer.`
            : ''
        }
        onCancelar={() => setABorrar(null)}
        onConfirmar={() => {
          if (aBorrar) borrarVtv(aBorrar.id);
          setABorrar(null);
        }}
      />
    </div>
  );
}

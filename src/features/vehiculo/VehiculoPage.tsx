import { useState } from 'react';
import { Check, Fuel, Pencil, Plus, Trash2 } from 'lucide-react';
import { useDatos } from '@/context/DatosContext';
import { PageHeader } from '@/components/layout/AppShell';
import { SinVehiculo } from '@/components/layout/SelectorVehiculo';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/EmptyState';
import { ConfirmarBorrado } from '@/components/ui/Modal';
import { CuentaCard } from '@/features/vehiculo/CuentaCard';
import { DatosBackup } from '@/features/vehiculo/DatosBackup';
import { VehiculoForm } from '@/features/vehiculo/VehiculoForm';
import { CARROCERIAS, type Vehiculo } from '@/types';
import { fmtNumero } from '@/lib/format';
import { cn } from '@/lib/cn';

function etiquetaCarroceria(v: Vehiculo): string {
  return CARROCERIAS.find((c) => c.value === v.carroceria)?.label ?? '—';
}

export function VehiculoPage() {
  const { data, vehiculos, activo, seleccionarVehiculo, agregarVehiculo, editarVehiculo, borrarVehiculo } =
    useDatos();

  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<Vehiculo | undefined>();
  const [aBorrar, setABorrar] = useState<Vehiculo | null>(null);

  const abrirNuevo = () => {
    setEditando(undefined);
    setFormAbierto(true);
  };

  /** Cuántos registros se llevaría puestos borrar este vehículo. */
  const registrosDe = (id: string) =>
    data.services.filter((s) => s.vehiculoId === id).length +
    data.cargasCombustible.filter((c) => c.vehiculoId === id).length +
    data.vtv.filter((v) => v.vehiculoId === id).length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titulo="Vehículos"
        subtitulo={`${vehiculos.length} ${vehiculos.length === 1 ? 'vehículo' : 'vehículos'} cargados`}
        accion={
          vehiculos.length > 0 ? (
            <Button variante="primario" tamanio="sm" icono={<Plus size={16} />} onClick={abrirNuevo}>
              Agregar
            </Button>
          ) : undefined
        }
      />

      {vehiculos.length === 0 ? (
        <SinVehiculo onNuevo={abrirNuevo} />
      ) : (
        <ul className="flex flex-col gap-3">
          {vehiculos.map((v) => {
            const esActivo = v.id === activo?.id;
            return (
              <li key={v.id}>
                <Card className={cn(esActivo && 'border-ambar-500/50')}>
                  <CardBody className="flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-1 h-8 w-8 shrink-0 rounded-lg border border-carbon-600"
                        style={{ background: v.color ?? '#c8ced8' }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-carbon-100">
                            {[v.marca, v.modelo].filter(Boolean).join(' ') || 'Sin nombre'}
                          </h3>
                          {esActivo ? <Badge tono="acento">Activo</Badge> : null}
                        </div>
                        <p className="num text-xs text-carbon-400">
                          {v.anio} · {v.patente || 'sin patente'} · {fmtNumero(v.kmActual)} km
                        </p>
                        <p className="text-xs text-carbon-500">
                          {etiquetaCarroceria(v)}
                          {v.capacidadTanque ? ` · tanque ${v.capacidadTanque} L` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 border-t border-carbon-700 pt-2">
                      {!esActivo ? (
                        <Button
                          variante="fantasma"
                          tamanio="sm"
                          icono={<Check size={14} />}
                          onClick={() => seleccionarVehiculo(v.id)}
                        >
                          Usar este
                        </Button>
                      ) : null}
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
      )}

      {activo && !activo.capacidadTanque ? (
        <Card className="border-carbon-600">
          <CardHeader titulo="Capacidad del tanque" icono={<Fuel size={13} />} />
          <CardBody className="pt-3">
            <p className="text-xs text-carbon-400">
              No hay forma de deducirla automáticamente: depende de la versión del modelo y sale
              del manual. Cargala editando el vehículo para habilitar el medidor que estima litros
              cuando no tenés el ticket del surtidor.
            </p>
          </CardBody>
        </Card>
      ) : null}

      <CuentaCard />

      <DatosBackup />

      <VehiculoForm
        abierto={formAbierto}
        onCerrar={() => setFormAbierto(false)}
        inicial={editando}
        onGuardar={(v) => {
          if (v.id) editarVehiculo(v as Vehiculo);
          else agregarVehiculo(v);
        }}
      />

      <ConfirmarBorrado
        abierto={aBorrar !== null}
        titulo="Borrar vehículo"
        mensaje={
          aBorrar
            ? `Se elimina "${[aBorrar.marca, aBorrar.modelo].filter(Boolean).join(' ') || 'el vehículo'}" junto con sus ${registrosDe(aBorrar.id)} registros (services, cargas y VTV). No se puede deshacer.`
            : ''
        }
        onCancelar={() => setABorrar(null)}
        onConfirmar={() => {
          if (aBorrar) borrarVehiculo(aBorrar.id);
          setABorrar(null);
        }}
      />
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Pencil, Plus, Trash2, Wrench } from 'lucide-react';
import { useDatos } from '@/context/DatosContext';
import { PageHeader } from '@/components/layout/AppShell';
import { SinVehiculo } from '@/components/layout/SelectorVehiculo';
import { Button, FabAgregar } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge, EmptyState } from '@/components/ui/EmptyState';
import { Chips } from '@/components/ui/Chips';
import { ConfirmarBorrado } from '@/components/ui/Modal';
import { alertasServices, ordenarServicesDesc } from '@/lib/calculos';
import { fmtDinero, fmtFecha, fmtNumero } from '@/lib/format';
import { cn } from '@/lib/cn';
import { ServiceForm } from '@/features/services/ServiceForm';
import type { Service } from '@/types';

const TODOS = '__todos__';

export function ServicesPage() {
  const { services: todos, activo, agregarService, editarService, borrarService } = useDatos();
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<string>(TODOS);
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<Service | undefined>();
  const [aBorrar, setABorrar] = useState<Service | null>(null);

  const tipos = useMemo(
    () => Array.from(new Set(todos.flatMap((s) => s.tipos))).sort(),
    [todos],
  );

  const lista = useMemo(() => {
    const ordenados = ordenarServicesDesc(todos);
    return filtro === TODOS ? ordenados : ordenados.filter((s) => s.tipos.includes(filtro));
  }, [todos, filtro]);

  const idsAlertados = useMemo(() => {
    const mapa = new Map<string, 'proximo' | 'vencido'>();
    for (const a of alertasServices(todos, activo?.kmActual ?? 0)) {
      mapa.set(a.service.id, a.urgencia === 'vencido' ? 'vencido' : 'proximo');
    }
    return mapa;
  }, [todos, activo]);

  const totalFiltrado = lista.reduce((a, s) => a + (s.costo || 0), 0);

  const abrirNuevo = () => {
    setEditando(undefined);
    setFormAbierto(true);
  };

  const abrirEdicion = (s: Service) => {
    setEditando(s);
    setFormAbierto(true);
  };

  if (!activo) return <SinVehiculo onNuevo={() => navigate('/vehiculo')} />;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titulo="Services"
        subtitulo={`${todos.length} ${todos.length === 1 ? 'registro' : 'registros'} · ${fmtDinero(totalFiltrado)} en la vista actual`}
      />

      <Chips
        label="Filtrar por tipo de service"
        valor={filtro}
        onChange={setFiltro}
        opciones={[
          { valor: TODOS, label: 'Todos' },
          ...tipos.map((t) => ({ valor: t, label: t })),
        ]}
      />

      {lista.length === 0 ? (
        <EmptyState
          icono={<Wrench size={22} />}
          titulo={todos.length === 0 ? 'Sin services cargados' : 'Nada con ese filtro'}
          mensaje={
            todos.length === 0
              ? 'Cargá el primer service: aceite, frenos, correa… así empezás a llevar el historial y los próximos vencimientos.'
              : 'No hay services de ese tipo. Probá con otro filtro.'
          }
          textoAccion={todos.length === 0 ? 'Cargar primer service' : undefined}
          onAccion={todos.length === 0 ? abrirNuevo : undefined}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {lista.map((s) => {
            const alerta = idsAlertados.get(s.id);
            return (
              <li key={s.id}>
                <Card
                  className={cn(
                    alerta === 'vencido' && 'border-rojo-500/40',
                    alerta === 'proximo' && 'border-ambar-500/40',
                  )}
                >
                  <CardBody className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-carbon-100">
                          {s.tipos.join(' + ')}
                        </h3>
                        <p className="num text-xs text-carbon-400">
                          {fmtFecha(s.fecha)} · {fmtNumero(s.km)} km
                        </p>
                      </div>
                      <span className="num shrink-0 text-base font-bold text-ambar-400">
                        {fmtDinero(s.costo)}
                      </span>
                    </div>

                    {s.descripcion ? (
                      <p className="text-sm text-carbon-300">{s.descripcion}</p>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-2">
                      {s.taller ? (
                        <Badge icono={<Building2 size={11} />}>{s.taller}</Badge>
                      ) : null}
                      {s.proximoKm != null ? (
                        <Badge tono={alerta ? (alerta === 'vencido' ? 'peligro' : 'alerta') : 'neutro'}>
                          Próx. {fmtNumero(s.proximoKm)} km
                        </Badge>
                      ) : null}
                      {s.proximaFecha ? (
                        <Badge tono={alerta ? (alerta === 'vencido' ? 'peligro' : 'alerta') : 'neutro'}>
                          Próx. {fmtFecha(s.proximaFecha)}
                        </Badge>
                      ) : null}
                    </div>

                    <div className="flex gap-2 border-t border-carbon-700 pt-2">
                      <Button
                        variante="fantasma"
                        tamanio="sm"
                        icono={<Pencil size={14} />}
                        onClick={() => abrirEdicion(s)}
                      >
                        Editar
                      </Button>
                      <Button
                        variante="fantasma"
                        tamanio="sm"
                        icono={<Trash2 size={14} />}
                        className="text-rojo-500 hover:bg-rojo-500/10 hover:text-rojo-500"
                        onClick={() => setABorrar(s)}
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

      <FabAgregar onClick={abrirNuevo} label="Service" icono={<Plus size={20} />} />

      <ServiceForm
        abierto={formAbierto}
        onCerrar={() => setFormAbierto(false)}
        inicial={editando}
        kmSugerido={activo?.kmActual ?? 0}
        onGuardar={(s) => {
          if (s.id) editarService(s as Service);
          else agregarService(s);
        }}
      />

      <ConfirmarBorrado
        abierto={aBorrar !== null}
        titulo="Borrar service"
        mensaje={
          aBorrar
            ? `Se elimina "${aBorrar.tipos.join(' + ')}" del ${fmtFecha(aBorrar.fecha)}. No se puede deshacer.`
            : ''
        }
        onCancelar={() => setABorrar(null)}
        onConfirmar={() => {
          if (aBorrar) borrarService(aBorrar.id);
          setABorrar(null);
        }}
      />
    </div>
  );
}

import { AlertTriangle, Check, CloudOff, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDatos } from '@/context/DatosContext';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { useEnLinea } from '@/hooks/useEnLinea';

/** Cuenta con la que se guardan los datos y estado de la sincronización. */
export function CuentaCard() {
  const { usuario, salir } = useAuth();
  const { cargando, error } = useDatos();
  const enLinea = useEnLinea();

  if (!usuario) return null;

  const estado = !enLinea
    ? {
        icono: <CloudOff size={13} className="text-ambar-400" />,
        texto: 'Sin conexión: los cambios se guardan acá y suben al volver la señal.',
        color: 'text-ambar-400',
      }
    : error
      ? {
          icono: <AlertTriangle size={13} className="text-rojo-500" />,
          texto: error,
          color: 'text-rojo-500',
        }
      : cargando
        ? {
            icono: <RefreshCw size={13} className="animate-spin text-carbon-400" />,
            texto: 'Sincronizando…',
            color: 'text-carbon-400',
          }
        : {
            icono: <Check size={13} className="text-verde-500" />,
            texto: 'Sincronizado con tu cuenta.',
            color: 'text-verde-500',
          };

  return (
    <Card>
      <CardHeader titulo="Tu cuenta" />
      <CardBody className="flex flex-col gap-3 pt-3">
        <div className="flex items-center gap-3">
          {usuario.photoURL ? (
            <img
              src={usuario.photoURL}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full border border-carbon-600"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-carbon-600 bg-carbon-700 text-sm font-semibold text-carbon-200">
              {(usuario.displayName ?? usuario.email ?? '?').charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            {usuario.displayName ? (
              <p className="truncate text-sm font-semibold text-carbon-100">
                {usuario.displayName}
              </p>
            ) : null}
            <p className="truncate text-xs text-carbon-400">{usuario.email}</p>
          </div>
        </div>

        <p className={`flex items-start gap-1.5 text-xs ${estado.color}`}>
          <span className="mt-0.5 shrink-0">{estado.icono}</span>
          {estado.texto}
        </p>

        <Button
          variante="secundario"
          tamanio="sm"
          icono={<LogOut size={14} />}
          onClick={() => void salir()}
          className="self-start"
        >
          Cerrar sesión
        </Button>
      </CardBody>
    </Card>
  );
}

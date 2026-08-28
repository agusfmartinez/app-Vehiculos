import { useRef, useState } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import { useDatos } from '@/context/DatosContext';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ConfirmarBorrado } from '@/components/ui/Modal';
import { descargarBackup, esBackupValido } from '@/lib/storage';
import type { VehiculoData } from '@/types';

type Mensaje = { tipo: 'ok' | 'error'; texto: string } | null;

export function DatosBackup() {
  const { data, reemplazarTodo, borrarTodo } = useDatos();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const [confirmarImport, setConfirmarImport] = useState<VehiculoData | null>(null);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);

  const onArchivo = async (file: File | undefined) => {
    if (!file) return;
    try {
      const texto = await file.text();
      const parseado = JSON.parse(texto) as unknown;
      if (!esBackupValido(parseado)) {
        setMensaje({ tipo: 'error', texto: 'El archivo no tiene el formato esperado.' });
        return;
      }
      setMensaje(null);
      setConfirmarImport(parseado as VehiculoData);
    } catch {
      setMensaje({ tipo: 'error', texto: 'No se pudo leer el archivo: JSON inválido.' });
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const totalRegistros =
    data.services.length + data.cargasCombustible.length + data.vtv.length;

  return (
    <>
      <Card>
        <CardHeader titulo="Copia de seguridad" />
        <CardBody className="flex flex-col gap-3 pt-3">
          <p className="text-xs text-carbon-400">
            Los datos viven sólo en este navegador. Si borrás los datos de navegación o cambiás de
            celular, se pierden. Exportá el JSON cada tanto.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              ancho
              variante="secundario"
              icono={<Download size={16} />}
              onClick={() => descargarBackup(data)}
            >
              Exportar backup
            </Button>
            <Button
              ancho
              variante="secundario"
              icono={<Upload size={16} />}
              onClick={() => inputRef.current?.click()}
            >
              Importar backup
            </Button>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void onArchivo(e.target.files?.[0])}
          />

          {mensaje ? (
            <p
              className={
                'text-xs ' + (mensaje.tipo === 'ok' ? 'text-verde-500' : 'text-rojo-500')
              }
            >
              {mensaje.texto}
            </p>
          ) : null}

          <p className="num text-xs text-carbon-500">
            {totalRegistros} registros guardados · {data.services.length} services ·{' '}
            {data.cargasCombustible.length} cargas · {data.vtv.length} VTV
          </p>

          <Button
            variante="peligro"
            tamanio="sm"
            icono={<Trash2 size={15} />}
            onClick={() => setConfirmarBorrar(true)}
            className="self-start"
          >
            Borrar todos los datos
          </Button>
        </CardBody>
      </Card>

      <ConfirmarBorrado
        abierto={confirmarImport !== null}
        titulo="Importar backup"
        mensaje="Los datos actuales se reemplazan por los del archivo. Esta acción no se puede deshacer: si querés conservarlos, exportá un backup antes."
        textoConfirmar="Reemplazar datos"
        onCancelar={() => setConfirmarImport(null)}
        onConfirmar={() => {
          if (confirmarImport) reemplazarTodo(confirmarImport);
          setConfirmarImport(null);
          setMensaje({ tipo: 'ok', texto: 'Backup importado correctamente.' });
        }}
      />

      <ConfirmarBorrado
        abierto={confirmarBorrar}
        titulo="Borrar todos los datos"
        mensaje="Se eliminan el vehículo, los services, las cargas de combustible y las VTV. No se puede deshacer."
        textoConfirmar="Borrar todo"
        onCancelar={() => setConfirmarBorrar(false)}
        onConfirmar={() => {
          borrarTodo();
          setConfirmarBorrar(false);
          setMensaje({ tipo: 'ok', texto: 'Datos borrados.' });
        }}
      />
    </>
  );
}

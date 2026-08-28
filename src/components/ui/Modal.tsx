import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';

interface ModalProps {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
  /** Acciones del pie; quedan fijas abajo, al alcance del pulgar. */
  pie?: ReactNode;
}

export function Modal({ abierto, onCerrar, titulo, children, pie }: ModalProps) {
  // Cierra con Escape y bloquea el scroll del fondo mientras está abierto.
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflowPrevio;
      document.removeEventListener('keydown', onKey);
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCerrar}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col overflow-hidden bg-carbon-800',
          'rounded-t-2xl border border-carbon-700 sm:max-w-lg sm:rounded-2xl',
        )}
      >
        <header className="flex items-center justify-between border-b border-carbon-700 px-4 py-3">
          <h2 className="text-base font-semibold text-carbon-100">{titulo}</h2>
          <Button
            variante="fantasma"
            tamanio="sm"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="px-2"
          >
            <X size={18} />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>

        {pie ? (
          <footer className="safe-bottom flex gap-2 border-t border-carbon-700 bg-carbon-850 px-4 py-3">
            {pie}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmarProps {
  abierto: boolean;
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function ConfirmarBorrado({
  abierto,
  titulo,
  mensaje,
  textoConfirmar = 'Borrar',
  onConfirmar,
  onCancelar,
}: ConfirmarProps) {
  return (
    <Modal
      abierto={abierto}
      onCerrar={onCancelar}
      titulo={titulo}
      pie={
        <>
          <Button ancho onClick={onCancelar}>
            Cancelar
          </Button>
          <Button ancho variante="peligro" onClick={onConfirmar}>
            {textoConfirmar}
          </Button>
        </>
      }
    >
      <p className="text-sm text-carbon-300">{mensaje}</p>
    </Modal>
  );
}

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro';
type Tamanio = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamanio?: Tamanio;
  icono?: ReactNode;
  ancho?: boolean;
}

const VARIANTES: Record<Variante, string> = {
  primario:
    'bg-ambar-500 text-carbon-950 font-semibold hover:bg-ambar-400 active:bg-ambar-300 disabled:bg-carbon-600 disabled:text-carbon-400',
  secundario:
    'bg-carbon-700 text-carbon-100 hover:bg-carbon-600 active:bg-carbon-500 border border-carbon-600 disabled:text-carbon-500',
  fantasma:
    'bg-transparent text-carbon-300 hover:bg-carbon-700 hover:text-carbon-100 active:bg-carbon-600',
  peligro:
    'bg-transparent text-rojo-500 border border-rojo-500/40 hover:bg-rojo-500/10 active:bg-rojo-500/20',
};

const TAMANIOS: Record<Tamanio, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-13 px-5 text-base gap-2',
};

export function Button({
  variante = 'secundario',
  tamanio = 'md',
  icono,
  ancho,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-xl transition-colors select-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ambar-500',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTES[variante],
        TAMANIOS[tamanio],
        ancho && 'w-full',
        className,
      )}
      {...props}
    >
      {icono}
      {children}
    </button>
  );
}

/** Botón flotante para el alta rápida en cada sección (pulgar, mobile). */
export function FabAgregar({
  onClick,
  label,
  icono,
}: {
  onClick: () => void;
  label: string;
  icono: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'fixed right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-ambar-500 px-5',
        'font-semibold text-carbon-950 shadow-xl shadow-black/40 transition-transform',
        'active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ambar-300',
        'bottom-[calc(5rem+env(safe-area-inset-bottom,0px))]',
      )}
    >
      {icono}
      <span className="text-sm">{label}</span>
    </button>
  );
}

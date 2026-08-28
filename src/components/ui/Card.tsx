import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-carbon-700 bg-carbon-800 shadow-lg shadow-black/20',
        className,
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  titulo: string;
  icono?: ReactNode;
  accion?: ReactNode;
  className?: string;
}

export function CardHeader({ titulo, icono, accion, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between gap-3 px-4 pt-4', className)}>
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-carbon-300">
        {icono}
        {titulo}
      </h2>
      {accion}
    </div>
  );
}

export function CardBody({ children, className }: CardProps) {
  return <div className={cn('p-4', className)}>{children}</div>;
}

/** Cifra destacada tipo instrumento: valor grande en mono + rótulo chico. */
interface StatProps {
  rotulo: string;
  valor: ReactNode;
  unidad?: string;
  detalle?: ReactNode;
  tono?: 'normal' | 'acento' | 'ok' | 'alerta' | 'peligro';
  icono?: ReactNode;
}

const TONOS: Record<NonNullable<StatProps['tono']>, string> = {
  normal: 'text-carbon-100',
  acento: 'text-ambar-400',
  ok: 'text-verde-500',
  alerta: 'text-ambar-400',
  peligro: 'text-rojo-500',
};

export function Stat({ rotulo, valor, unidad, detalle, tono = 'normal', icono }: StatProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-carbon-400">
        {icono}
        {rotulo}
      </span>
      <span className={cn('num text-2xl font-bold leading-none', TONOS[tono])}>
        {valor}
        {unidad ? (
          <span className="ml-1 text-sm font-medium text-carbon-400">{unidad}</span>
        ) : null}
      </span>
      {detalle ? <span className="text-xs text-carbon-400">{detalle}</span> : null}
    </div>
  );
}

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
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

interface CardLinkProps extends CardProps {
  to: string;
  /** Flecha en la esquina. Apagala si la tarjeta ya trae la suya. */
  flecha?: boolean;
}

/**
 * Tarjeta que lleva a otra pantalla. Se distingue de las informativas por el
 * borde ámbar, la flecha y el efecto al apretar: sin eso, tocar una tarjeta
 * parece no hacer nada y nadie descubre que navega.
 */
export function CardLink({ to, flecha = true, children, className }: CardLinkProps) {
  return (
    <Link to={to} className="group block">
      <Card
        className={cn(
          'relative h-full border-ambar-500/30 transition duration-150',
          'group-hover:border-ambar-500/70 group-active:scale-[0.98]',
          flecha && '[&>div]:pr-7',
          className,
        )}
      >
        {children}
        {flecha ? (
          <ChevronRight
            size={16}
            className="absolute right-2.5 top-3.5 text-ambar-400/70 transition-transform group-hover:translate-x-0.5 group-hover:text-ambar-400"
          />
        ) : null}
      </Card>
    </Link>
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
  /** Para cifras largas (precios): baja un escalón para no partirse en dos líneas. */
  compacto?: boolean;
}

const TONOS: Record<NonNullable<StatProps['tono']>, string> = {
  normal: 'text-carbon-100',
  acento: 'text-ambar-400',
  ok: 'text-verde-500',
  alerta: 'text-ambar-400',
  peligro: 'text-rojo-500',
};

export function Stat({
  rotulo,
  valor,
  unidad,
  detalle,
  tono = 'normal',
  icono,
  compacto,
}: StatProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-carbon-400">
        {icono}
        {rotulo}
      </span>
      <span
        className={cn(
          'num font-bold leading-none whitespace-nowrap',
          compacto ? 'text-xl' : 'text-2xl',
          TONOS[tono],
        )}
      >
        {valor}
        {unidad ? (
          <span className="ml-1 text-sm font-medium text-carbon-400">{unidad}</span>
        ) : null}
      </span>
      {detalle ? <span className="text-xs text-carbon-400">{detalle}</span> : null}
    </div>
  );
}

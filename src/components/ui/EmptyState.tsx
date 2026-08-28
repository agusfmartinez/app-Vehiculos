import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

interface EmptyStateProps {
  icono: ReactNode;
  titulo: string;
  mensaje: string;
  textoAccion?: string;
  onAccion?: () => void;
}

export function EmptyState({ icono, titulo, mensaje, textoAccion, onAccion }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-carbon-600 bg-carbon-850/60 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-carbon-700 text-ambar-400">
        {icono}
      </div>
      <h3 className="text-base font-semibold text-carbon-100">{titulo}</h3>
      <p className="max-w-xs text-sm text-carbon-400">{mensaje}</p>
      {textoAccion && onAccion ? (
        <Button variante="primario" tamanio="sm" onClick={onAccion} className="mt-1">
          {textoAccion}
        </Button>
      ) : null}
    </div>
  );
}

type TonoBadge = 'neutro' | 'ok' | 'alerta' | 'peligro' | 'acento';

const TONOS: Record<TonoBadge, string> = {
  neutro: 'bg-carbon-700 text-carbon-300 border-carbon-600',
  ok: 'bg-verde-500/12 text-verde-500 border-verde-500/30',
  alerta: 'bg-ambar-500/12 text-ambar-400 border-ambar-500/30',
  peligro: 'bg-rojo-500/12 text-rojo-500 border-rojo-500/30',
  acento: 'bg-ambar-500/15 text-ambar-300 border-ambar-500/30',
};

export function Badge({
  children,
  tono = 'neutro',
  icono,
}: {
  children: ReactNode;
  tono?: TonoBadge;
  icono?: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONOS[tono]}`}
    >
      {icono}
      {children}
    </span>
  );
}

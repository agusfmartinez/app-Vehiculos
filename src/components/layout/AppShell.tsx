import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { SelectorVehiculo } from '@/components/layout/SelectorVehiculo';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-carbon-900">
      <div className="mx-auto w-full max-w-2xl px-4 pt-4">
        <SelectorVehiculo onNuevo={() => navigate('/vehiculo')} />
      </div>
      <main className="pb-nav mx-auto w-full max-w-2xl px-4 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}

interface PageHeaderProps {
  titulo: string;
  subtitulo?: string;
  accion?: ReactNode;
  /** Pantallas que se entran desde el tablero y no están en la barra: link para volver. */
  volver?: boolean;
}

export function PageHeader({ titulo, subtitulo, accion, volver }: PageHeaderProps) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div>
        {volver ? (
          <Link
            to="/"
            className="-ml-1 mb-1 inline-flex items-center gap-0.5 text-xs font-medium text-ambar-400 hover:text-ambar-300"
          >
            <ChevronLeft size={14} />
            Tablero
          </Link>
        ) : null}
        <h1 className="text-xl font-bold tracking-tight text-carbon-100">{titulo}</h1>
        {subtitulo ? <p className="text-sm text-carbon-400">{subtitulo}</p> : null}
      </div>
      {accion}
    </header>
  );
}

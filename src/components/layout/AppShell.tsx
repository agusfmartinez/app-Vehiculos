import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
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
}

export function PageHeader({ titulo, subtitulo, accion }: PageHeaderProps) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-carbon-100">{titulo}</h1>
        {subtitulo ? <p className="text-sm text-carbon-400">{subtitulo}</p> : null}
      </div>
      {accion}
    </header>
  );
}

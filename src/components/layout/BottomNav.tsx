import { NavLink } from 'react-router-dom';
import { Fuel, Gauge, ShieldCheck, ShieldHalf, Wrench } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Nafta va al medio: es la sección que más se abre, y en el centro cae bajo el
 * pulgar. Vehículo salió de acá — se entra desde el tablero, porque se toca una
 * vez cada tanto y no compite con las secciones de uso diario.
 */
const TABS = [
  { to: '/', label: 'Tablero', icono: Gauge, exact: true },
  { to: '/services', label: 'Services', icono: Wrench },
  { to: '/combustible', label: 'Nafta', icono: Fuel },
  { to: '/seguro', label: 'Seguro', icono: ShieldHalf },
  { to: '/vtv', label: 'VTV', icono: ShieldCheck },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-carbon-700 bg-carbon-850/95 backdrop-blur">
      <ul className="safe-bottom mx-auto flex h-16 w-full max-w-2xl items-stretch">
        {TABS.map(({ to, label, icono: Icono, exact }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={exact}
              className={({ isActive }) =>
                cn(
                  'flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                  isActive ? 'text-ambar-400' : 'text-carbon-400 hover:text-carbon-200',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                      isActive && 'bg-ambar-500/15',
                    )}
                  >
                    <Icono size={20} strokeWidth={isActive ? 2.4 : 2} />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

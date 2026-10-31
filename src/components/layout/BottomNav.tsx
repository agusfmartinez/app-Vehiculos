import { NavLink } from 'react-router-dom';
import { Fuel, Gauge, ShieldCheck, ShieldHalf, Wrench } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * El tablero va al medio, como un home: cae bajo el pulgar y desde ahí se llega
 * al resto. Vehículo y Kilómetros no están acá — se entra desde sus tarjetas del
 * tablero, porque se tocan de vez en cuando y no compiten con las secciones de
 * uso diario.
 */
const TABS = [
  { to: '/services', label: 'Services', icono: Wrench },
  { to: '/combustible', label: 'Nafta', icono: Fuel },
  { to: '/', label: 'Tablero', icono: Gauge, exact: true, inicio: true },
  { to: '/seguro', label: 'Seguro', icono: ShieldHalf },
  { to: '/vtv', label: 'VTV', icono: ShieldCheck },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-carbon-700 bg-carbon-850/95 backdrop-blur">
      <ul className="safe-bottom mx-auto flex h-16 w-full max-w-2xl items-stretch">
        {TABS.map(({ to, label, icono: Icono, exact, inicio }) => (
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
                      'flex items-center justify-center rounded-full transition-all',
                      inicio
                        ? cn(
                            '-mt-6 h-14 w-14 border-4 border-carbon-900 shadow-lg shadow-black/40',
                            isActive
                              ? 'bg-ambar-500 text-carbon-900'
                              : 'bg-carbon-700 text-ambar-400',
                          )
                        : cn('h-7 w-12', isActive && 'bg-ambar-500/15'),
                    )}
                  >
                    <Icono size={inicio ? 24 : 20} strokeWidth={isActive ? 2.4 : 2} />
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

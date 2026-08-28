import type { Carroceria } from '@/types';

/**
 * Catálogo local de modelos comunes en Argentina.
 *
 * Por qué local y no una API: no existe hoy una API pública, gratuita y con
 * CORS que cubra el mercado argentino. NHTSA vPIC es gratis y sin key pero es
 * base de EE.UU. (a un Gol brasileño le devuelve la marca y poco más);
 * CarQuery quedó detrás de key y sin CORS; API-Ninjas / CarsXE / Auto.dev
 * requieren API key, que en una app 100% frontend queda expuesta en el bundle.
 *
 * Las capacidades son APROXIMADAS y varían por versión y año de fabricación.
 * Se usan como sugerencia editable, nunca como dato definitivo: el manual del
 * vehículo manda.
 */
export interface ModeloCatalogo {
  marca: string;
  modelo: string;
  carroceria: Carroceria;
  /** Litros, nominal. Aproximado. */
  tanque: number;
}

export const CATALOGO: ModeloCatalogo[] = [
  // Volkswagen
  { marca: 'Volkswagen', modelo: 'Gol', carroceria: 'hatchback', tanque: 55 },
  { marca: 'Volkswagen', modelo: 'Gol Trend', carroceria: 'hatchback', tanque: 55 },
  { marca: 'Volkswagen', modelo: 'Voyage', carroceria: 'sedan', tanque: 55 },
  { marca: 'Volkswagen', modelo: 'Suran', carroceria: 'hatchback', tanque: 51 },
  { marca: 'Volkswagen', modelo: 'Polo', carroceria: 'hatchback', tanque: 52 },
  { marca: 'Volkswagen', modelo: 'Virtus', carroceria: 'sedan', tanque: 52 },
  { marca: 'Volkswagen', modelo: 'Vento', carroceria: 'sedan', tanque: 55 },
  { marca: 'Volkswagen', modelo: 'up!', carroceria: 'hatchback', tanque: 50 },
  { marca: 'Volkswagen', modelo: 'T-Cross', carroceria: 'suv', tanque: 52 },
  { marca: 'Volkswagen', modelo: 'Nivus', carroceria: 'suv', tanque: 52 },
  { marca: 'Volkswagen', modelo: 'Amarok', carroceria: 'pickup', tanque: 80 },

  // Fiat
  { marca: 'Fiat', modelo: 'Uno', carroceria: 'hatchback', tanque: 48 },
  { marca: 'Fiat', modelo: 'Palio', carroceria: 'hatchback', tanque: 48 },
  { marca: 'Fiat', modelo: 'Siena', carroceria: 'sedan', tanque: 48 },
  { marca: 'Fiat', modelo: 'Argo', carroceria: 'hatchback', tanque: 48 },
  { marca: 'Fiat', modelo: 'Cronos', carroceria: 'sedan', tanque: 48 },
  { marca: 'Fiat', modelo: 'Pulse', carroceria: 'suv', tanque: 47 },
  { marca: 'Fiat', modelo: 'Toro', carroceria: 'pickup', tanque: 60 },
  { marca: 'Fiat', modelo: 'Strada', carroceria: 'pickup', tanque: 55 },
  { marca: 'Fiat', modelo: 'Fiorino', carroceria: 'furgon', tanque: 48 },

  // Renault
  { marca: 'Renault', modelo: 'Clio Mío', carroceria: 'hatchback', tanque: 50 },
  { marca: 'Renault', modelo: 'Sandero', carroceria: 'hatchback', tanque: 50 },
  { marca: 'Renault', modelo: 'Stepway', carroceria: 'hatchback', tanque: 50 },
  { marca: 'Renault', modelo: 'Logan', carroceria: 'sedan', tanque: 50 },
  { marca: 'Renault', modelo: 'Kwid', carroceria: 'hatchback', tanque: 38 },
  { marca: 'Renault', modelo: 'Duster', carroceria: 'suv', tanque: 50 },
  { marca: 'Renault', modelo: 'Captur', carroceria: 'suv', tanque: 50 },
  { marca: 'Renault', modelo: 'Alaskan', carroceria: 'pickup', tanque: 80 },
  { marca: 'Renault', modelo: 'Kangoo', carroceria: 'furgon', tanque: 50 },

  // Ford
  { marca: 'Ford', modelo: 'Ka', carroceria: 'hatchback', tanque: 42 },
  { marca: 'Ford', modelo: 'Fiesta Kinetic', carroceria: 'hatchback', tanque: 51 },
  { marca: 'Ford', modelo: 'Focus', carroceria: 'hatchback', tanque: 55 },
  { marca: 'Ford', modelo: 'EcoSport', carroceria: 'suv', tanque: 52 },
  { marca: 'Ford', modelo: 'Territory', carroceria: 'suv', tanque: 55 },
  { marca: 'Ford', modelo: 'Ranger', carroceria: 'pickup', tanque: 80 },
  { marca: 'Ford', modelo: 'Transit', carroceria: 'furgon', tanque: 80 },

  // Chevrolet
  { marca: 'Chevrolet', modelo: 'Corsa Classic', carroceria: 'sedan', tanque: 46 },
  { marca: 'Chevrolet', modelo: 'Celta', carroceria: 'hatchback', tanque: 45 },
  { marca: 'Chevrolet', modelo: 'Onix', carroceria: 'hatchback', tanque: 44 },
  { marca: 'Chevrolet', modelo: 'Onix Plus', carroceria: 'sedan', tanque: 44 },
  { marca: 'Chevrolet', modelo: 'Prisma', carroceria: 'sedan', tanque: 44 },
  { marca: 'Chevrolet', modelo: 'Cruze', carroceria: 'hatchback', tanque: 52 },
  { marca: 'Chevrolet', modelo: 'Tracker', carroceria: 'suv', tanque: 44 },
  { marca: 'Chevrolet', modelo: 'S10', carroceria: 'pickup', tanque: 76 },

  // Peugeot
  { marca: 'Peugeot', modelo: '207', carroceria: 'hatchback', tanque: 50 },
  { marca: 'Peugeot', modelo: '208', carroceria: 'hatchback', tanque: 50 },
  { marca: 'Peugeot', modelo: '308', carroceria: 'hatchback', tanque: 60 },
  { marca: 'Peugeot', modelo: '2008', carroceria: 'suv', tanque: 50 },
  { marca: 'Peugeot', modelo: 'Partner', carroceria: 'furgon', tanque: 55 },

  // Citroën
  { marca: 'Citroën', modelo: 'C3', carroceria: 'hatchback', tanque: 50 },
  { marca: 'Citroën', modelo: 'C4 Cactus', carroceria: 'suv', tanque: 50 },
  { marca: 'Citroën', modelo: 'C4 Lounge', carroceria: 'sedan', tanque: 60 },
  { marca: 'Citroën', modelo: 'Berlingo', carroceria: 'furgon', tanque: 55 },

  // Toyota
  { marca: 'Toyota', modelo: 'Etios', carroceria: 'hatchback', tanque: 45 },
  { marca: 'Toyota', modelo: 'Yaris', carroceria: 'hatchback', tanque: 42 },
  { marca: 'Toyota', modelo: 'Corolla', carroceria: 'sedan', tanque: 50 },
  { marca: 'Toyota', modelo: 'Corolla Cross', carroceria: 'suv', tanque: 47 },
  { marca: 'Toyota', modelo: 'Hilux', carroceria: 'pickup', tanque: 80 },
  { marca: 'Toyota', modelo: 'SW4', carroceria: 'suv', tanque: 80 },

  // Honda
  { marca: 'Honda', modelo: 'Fit', carroceria: 'hatchback', tanque: 40 },
  { marca: 'Honda', modelo: 'City', carroceria: 'sedan', tanque: 40 },
  { marca: 'Honda', modelo: 'HR-V', carroceria: 'suv', tanque: 50 },

  // Nissan
  { marca: 'Nissan', modelo: 'March', carroceria: 'hatchback', tanque: 41 },
  { marca: 'Nissan', modelo: 'Versa', carroceria: 'sedan', tanque: 41 },
  { marca: 'Nissan', modelo: 'Kicks', carroceria: 'suv', tanque: 41 },
  { marca: 'Nissan', modelo: 'Frontier', carroceria: 'pickup', tanque: 80 },

  // Jeep
  { marca: 'Jeep', modelo: 'Renegade', carroceria: 'suv', tanque: 55 },
  { marca: 'Jeep', modelo: 'Compass', carroceria: 'suv', tanque: 60 },
];

export const MARCAS = Array.from(new Set(CATALOGO.map((m) => m.marca))).sort();

export function modelosDe(marca: string): ModeloCatalogo[] {
  return CATALOGO.filter((m) => m.marca === marca).sort((a, b) =>
    a.modelo.localeCompare(b.modelo),
  );
}

export function buscarModelo(marca: string, modelo: string): ModeloCatalogo | undefined {
  const norm = (s: string) => s.trim().toLowerCase();
  return CATALOGO.find((m) => norm(m.marca) === norm(marca) && norm(m.modelo) === norm(modelo));
}

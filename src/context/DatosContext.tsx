import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { datosIniciales, migrar, nuevoId } from '@/lib/storage';
import {
  STORAGE_KEY,
  type CargaCombustible,
  type LecturaTanque,
  type Poliza,
  type RegistroVTV,
  type Service,
  type Vehiculo,
  type VehiculoData,
} from '@/types';

type SinIds<T> = Omit<T, 'id' | 'vehiculoId'>;

interface DatosContextValue {
  data: VehiculoData;
  setData: (a: VehiculoData | ((prev: VehiculoData) => VehiculoData)) => void;

  /** Vehículo seleccionado; null si todavía no hay ninguno cargado. */
  activo: Vehiculo | null;
  vehiculos: Vehiculo[];
  /** Registros del vehículo activo, ya filtrados. */
  services: Service[];
  cargas: CargaCombustible[];
  lecturas: LecturaTanque[];
  polizas: Poliza[];
  vtv: RegistroVTV[];
  /** Km del registro más alto cargado; el odómetro nunca puede ir por detrás. */
  kmMaxRegistrado: number;
  /** Km del registro más viejo, para medir la distancia recorrida. */
  kmMinRegistrado: number | null;

  seleccionarVehiculo: (id: string) => void;
  agregarVehiculo: (v: Omit<Vehiculo, 'id'>) => string;
  editarVehiculo: (v: Vehiculo) => void;
  borrarVehiculo: (id: string) => void;
  setKmActual: (km: number) => void;

  agregarService: (s: SinIds<Service>) => void;
  editarService: (s: Service) => void;
  borrarService: (id: string) => void;

  agregarCarga: (c: SinIds<CargaCombustible>) => void;
  editarCarga: (c: CargaCombustible) => void;
  borrarCarga: (id: string) => void;

  agregarLectura: (l: SinIds<LecturaTanque>) => void;
  editarLectura: (l: LecturaTanque) => void;
  borrarLectura: (id: string) => void;

  agregarPoliza: (p: SinIds<Poliza>) => void;
  editarPoliza: (p: Poliza) => void;
  borrarPoliza: (id: string) => void;

  agregarVtv: (v: SinIds<RegistroVTV>) => void;
  editarVtv: (v: RegistroVTV) => void;
  borrarVtv: (id: string) => void;

  reemplazarTodo: (d: unknown) => void;
  borrarTodo: () => void;
}

const DatosContext = createContext<DatosContextValue | null>(null);

export function DatosProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useLocalStorage<VehiculoData>(STORAGE_KEY, datosIniciales, {
    debounceMs: 400,
    migrar,
  });

  const activo = useMemo(
    () => data.vehiculos.find((v) => v.id === data.vehiculoActivoId) ?? null,
    [data.vehiculos, data.vehiculoActivoId],
  );
  const activoId = activo?.id ?? null;

  const services = useMemo(
    () => (activoId ? data.services.filter((s) => s.vehiculoId === activoId) : []),
    [data.services, activoId],
  );
  const cargas = useMemo(
    () => (activoId ? data.cargasCombustible.filter((c) => c.vehiculoId === activoId) : []),
    [data.cargasCombustible, activoId],
  );
  const lecturas = useMemo(
    () => (activoId ? data.lecturasTanque.filter((l) => l.vehiculoId === activoId) : []),
    [data.lecturasTanque, activoId],
  );
  const polizas = useMemo(
    () => (activoId ? data.polizas.filter((p) => p.vehiculoId === activoId) : []),
    [data.polizas, activoId],
  );
  const vtv = useMemo(
    () => (activoId ? data.vtv.filter((v) => v.vehiculoId === activoId) : []),
    [data.vtv, activoId],
  );

  // El odómetro sale del registro más alto: un service o una carga con más km
  // que el guardado significa que el auto ya pasó por ahí.
  const kmRegistrados = useMemo(() => {
    const todos = [
      ...services.map((s) => s.km),
      ...cargas.map((c) => c.km),
      ...lecturas.map((l) => l.km),
    ].filter((k) => Number.isFinite(k) && k > 0);
    return todos;
  }, [services, cargas, lecturas]);

  const kmMaxRegistrado = kmRegistrados.length ? Math.max(...kmRegistrados) : 0;
  const kmMinRegistrado = kmRegistrados.length ? Math.min(...kmRegistrados) : null;

  /**
   * Al cargar un service o una carga con km mayor al registrado, el odómetro
   * del vehículo se adelanta solo: si estuviste en el taller con 82.400 km,
   * el auto tiene al menos 82.400 km.
   */
  const conKmSincronizado = useCallback(
    (d: VehiculoData, vehiculoId: string, km: number): VehiculoData => {
      if (!Number.isFinite(km)) return d;
      return {
        ...d,
        vehiculos: d.vehiculos.map((v) =>
          v.id === vehiculoId && km > v.kmActual ? { ...v, kmActual: km } : v,
        ),
      };
    },
    [],
  );

  const value = useMemo<DatosContextValue>(() => {
    /** Alta genérica: asocia el registro al vehículo activo. */
    const alta =
      <T extends object>(
        clave: 'services' | 'cargasCombustible' | 'lecturasTanque' | 'polizas' | 'vtv',
      ) =>
      (registro: T) => {
        if (!activoId) return;
        setData((d) => {
          const nuevo = { ...registro, id: nuevoId(), vehiculoId: activoId };
          const conRegistro = {
            ...d,
            [clave]: [...(d[clave] as unknown[]), nuevo],
          } as VehiculoData;
          // Sólo services y cargas traen kilometraje con el que sincronizar.
          const km = (registro as { km?: number }).km;
          return km != null ? conKmSincronizado(conRegistro, activoId, km) : conRegistro;
        });
      };

    return {
      data,
      setData,
      activo,
      vehiculos: data.vehiculos,
      services,
      cargas,
      lecturas,
      polizas,
      vtv,
      kmMaxRegistrado,
      kmMinRegistrado,

      seleccionarVehiculo: (id) => setData((d) => ({ ...d, vehiculoActivoId: id })),

      agregarVehiculo: (v) => {
        const id = nuevoId();
        setData((d) => ({
          ...d,
          vehiculos: [...d.vehiculos, { ...v, id }],
          vehiculoActivoId: id,
        }));
        return id;
      },

      editarVehiculo: (v) =>
        setData((d) => ({
          ...d,
          vehiculos: d.vehiculos.map((x) => (x.id === v.id ? v : x)),
        })),

      /** Borra el vehículo y todos sus registros asociados. */
      borrarVehiculo: (id) =>
        setData((d) => {
          const vehiculos = d.vehiculos.filter((v) => v.id !== id);
          return {
            ...d,
            vehiculos,
            vehiculoActivoId:
              d.vehiculoActivoId === id ? (vehiculos[0]?.id ?? null) : d.vehiculoActivoId,
            services: d.services.filter((s) => s.vehiculoId !== id),
            cargasCombustible: d.cargasCombustible.filter((c) => c.vehiculoId !== id),
            lecturasTanque: d.lecturasTanque.filter((l) => l.vehiculoId !== id),
            polizas: d.polizas.filter((p) => p.vehiculoId !== id),
            vtv: d.vtv.filter((v) => v.vehiculoId !== id),
          };
        }),

      setKmActual: (km) =>
        setData((d) => ({
          ...d,
          vehiculos: d.vehiculos.map((v) =>
            v.id === activoId ? { ...v, kmActual: Math.max(0, km) } : v,
          ),
        })),

      agregarService: alta<SinIds<Service>>('services'),
      editarService: (s) =>
        setData((d) =>
          conKmSincronizado(
            { ...d, services: d.services.map((x) => (x.id === s.id ? s : x)) },
            s.vehiculoId,
            s.km,
          ),
        ),
      borrarService: (id) =>
        setData((d) => ({ ...d, services: d.services.filter((x) => x.id !== id) })),

      agregarCarga: alta<SinIds<CargaCombustible>>('cargasCombustible'),
      editarCarga: (c) =>
        setData((d) =>
          conKmSincronizado(
            { ...d, cargasCombustible: d.cargasCombustible.map((x) => (x.id === c.id ? c : x)) },
            c.vehiculoId,
            c.km,
          ),
        ),
      borrarCarga: (id) =>
        setData((d) => ({
          ...d,
          cargasCombustible: d.cargasCombustible.filter((x) => x.id !== id),
        })),

      agregarLectura: alta<SinIds<LecturaTanque>>('lecturasTanque'),
      editarLectura: (l) =>
        setData((d) =>
          conKmSincronizado(
            { ...d, lecturasTanque: d.lecturasTanque.map((x) => (x.id === l.id ? l : x)) },
            l.vehiculoId,
            l.km,
          ),
        ),
      borrarLectura: (id) =>
        setData((d) => ({ ...d, lecturasTanque: d.lecturasTanque.filter((x) => x.id !== id) })),

      agregarPoliza: alta<SinIds<Poliza>>('polizas'),
      editarPoliza: (p) =>
        setData((d) => ({ ...d, polizas: d.polizas.map((x) => (x.id === p.id ? p : x)) })),
      borrarPoliza: (id) =>
        setData((d) => ({ ...d, polizas: d.polizas.filter((x) => x.id !== id) })),

      agregarVtv: alta<SinIds<RegistroVTV>>('vtv'),
      editarVtv: (v) =>
        setData((d) => ({ ...d, vtv: d.vtv.map((x) => (x.id === v.id ? v : x)) })),
      borrarVtv: (id) => setData((d) => ({ ...d, vtv: d.vtv.filter((x) => x.id !== id) })),

      reemplazarTodo: (d) => setData(migrar(d)),
      borrarTodo: () => setData(datosIniciales),
    };
  }, [
    data,
    setData,
    activo,
    activoId,
    services,
    cargas,
    lecturas,
    polizas,
    vtv,
    kmMaxRegistrado,
    kmMinRegistrado,
    conKmSincronizado,
  ]);

  return <DatosContext.Provider value={value}>{children}</DatosContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDatos(): DatosContextValue {
  const ctx = useContext(DatosContext);
  if (!ctx) throw new Error('useDatos debe usarse dentro de <DatosProvider>');
  return ctx;
}

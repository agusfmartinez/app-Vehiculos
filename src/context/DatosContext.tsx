import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/db';
import {
  borrarRegistro,
  borrarTodoEnNube,
  borrarVehiculoEnCascada,
  escucharDatos,
  guardarPreferencias,
  guardarRegistro,
  nubeVacia,
  reemplazarTodoEnNube,
  type Coleccion,
} from '@/lib/nube';
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

/** Marca que lo que había en este navegador ya se subió a alguna cuenta. */
const CLAVE_MIGRADO = 'vehiculo-data-migrado-a-nube';

/**
 * Compatibilidad con services guardados antes de que `tipo` pasara a ser
 * `tipos` (arreglo, para agrupar varios trabajos de un mismo presupuesto).
 * No migra el documento en Firestore, sólo lo normaliza al leerlo.
 */
function normalizarService(s: Service & { tipo?: string }): Service {
  if (Array.isArray(s.tipos) && s.tipos.length > 0) return s;
  return { ...s, tipos: s.tipo ? [s.tipo] : [] };
}

interface DatosContextValue {
  data: VehiculoData;
  /** True mientras llega la primera respuesta de Firestore. */
  cargando: boolean;
  /** Mensaje de error de la nube, o null si todo va bien. */
  error: string | null;

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

/** Lo que quedó guardado en este navegador de la época sin cuentas. */
function datosLocalesViejos(): VehiculoData | null {
  try {
    if (localStorage.getItem(CLAVE_MIGRADO)) return null;
    const crudo = localStorage.getItem(STORAGE_KEY);
    if (!crudo) return null;
    const datos = migrar(JSON.parse(crudo));
    return datos.vehiculos.length > 0 ? datos : null;
  } catch {
    return null;
  }
}

export function DatosProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const uid = usuario?.uid ?? null;

  const [data, setData] = useState<VehiculoData>(datosIniciales);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db || !uid) return;
    setCargando(true);
    setError(null);

    const cortar = escucharDatos(db, uid, {
      onDatos: (d) => {
        setData(d);
        setCargando(false);
      },
      onError: (e) => {
        // Sin permisos o sin red: la caché local sigue sirviendo lo último.
        setError(
          e.message.includes('permission')
            ? 'La cuenta no tiene permiso para leer estos datos. Revisá las reglas de Firestore.'
            : 'No se pudo sincronizar con la nube. Los cambios se guardan y se suben al volver la conexión.',
        );
        setCargando(false);
      },
    });

    return cortar;
  }, [uid]);

  /*
   * Una sola vez por navegador: lo que estaba en localStorage antes de que la
   * app tuviera cuentas se sube a la cuenta con la que entrás, si esa cuenta
   * todavía está vacía. Después el localStorage deja de usarse.
   */
  useEffect(() => {
    if (!db || !uid || cargando) return;
    const viejos = datosLocalesViejos();
    if (!viejos) return;

    let cancelado = false;
    (async () => {
      try {
        if (!(await nubeVacia(db!, uid))) return;
        if (cancelado) return;
        await reemplazarTodoEnNube(db!, uid, viejos);
        localStorage.setItem(CLAVE_MIGRADO, new Date().toISOString());
      } catch {
        // Si falla, se reintenta en la próxima carga: nada se pierde.
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [uid, cargando]);

  const activo = useMemo(
    () => data.vehiculos.find((v) => v.id === data.vehiculoActivoId) ?? null,
    [data.vehiculos, data.vehiculoActivoId],
  );
  const activoId = activo?.id ?? null;

  const services = useMemo(
    () =>
      activoId
        ? data.services.filter((s) => s.vehiculoId === activoId).map(normalizarService)
        : [],
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
  const kmRegistrados = useMemo(
    () =>
      [
        ...services.map((s) => s.km),
        ...cargas.map((c) => c.km),
        ...lecturas.map((l) => l.km),
      ].filter((k) => Number.isFinite(k) && k > 0),
    [services, cargas, lecturas],
  );

  const kmMaxRegistrado = kmRegistrados.length ? Math.max(...kmRegistrados) : 0;
  const kmMinRegistrado = kmRegistrados.length ? Math.min(...kmRegistrados) : null;

  /**
   * Al cargar un service o una carga con km mayor al registrado, el odómetro
   * del vehículo se adelanta solo: si estuviste en el taller con 82.400 km,
   * el auto tiene al menos 82.400 km.
   */
  const sincronizarKm = useCallback(
    (vehiculoId: string, km: number) => {
      if (!db || !uid || !Number.isFinite(km)) return;
      const vehiculo = data.vehiculos.find((v) => v.id === vehiculoId);
      if (!vehiculo || km <= vehiculo.kmActual) return;
      void guardarRegistro(db, uid, 'vehiculos', { ...vehiculo, kmActual: km });
    },
    [uid, data.vehiculos],
  );

  /**
   * Contracara de `sincronizarKm`: al borrar el registro que había subido el
   * odómetro, éste se recalcula al récord que quede. Sólo actúa si el km
   * borrado coincide exacto con el guardado en el vehículo — es la única
   * señal segura de que ese número vino de este registro y no de una edición
   * manual tuya, que no hay que tocar.
   */
  const desincronizarKm = useCallback(
    (vehiculoId: string, kmBorrado: number, excluir: { coleccion: Coleccion; id: string }) => {
      if (!db || !uid) return;
      const vehiculo = data.vehiculos.find((v) => v.id === vehiculoId);
      if (!vehiculo || kmBorrado !== vehiculo.kmActual) return;

      const restantes = [
        ...data.services.map((s) => ({ ...s, coleccion: 'services' as const })),
        ...data.cargasCombustible.map((c) => ({ ...c, coleccion: 'cargas' as const })),
        ...data.lecturasTanque.map((l) => ({ ...l, coleccion: 'lecturas' as const })),
      ].filter(
        (r) =>
          r.vehiculoId === vehiculoId &&
          !(r.coleccion === excluir.coleccion && r.id === excluir.id) &&
          Number.isFinite(r.km) &&
          r.km > 0,
      );

      const nuevoMax = restantes.length ? Math.max(...restantes.map((r) => r.km)) : 0;
      if (nuevoMax === vehiculo.kmActual) return;
      void guardarRegistro(db, uid, 'vehiculos', { ...vehiculo, kmActual: nuevoMax });
    },
    [uid, data.vehiculos, data.services, data.cargasCombustible, data.lecturasTanque],
  );

  const value = useMemo<DatosContextValue>(() => {
    /** Escribe un registro, con el vehículo activo ya asociado. */
    const guardar = <T extends { id: string }>(nombre: Coleccion, registro: T) => {
      if (!db || !uid) return;
      void guardarRegistro(db, uid, nombre, registro);
    };

    const borrar = (nombre: Coleccion, id: string) => {
      if (!db || !uid) return;
      void borrarRegistro(db, uid, nombre, id);
    };

    /** Alta genérica: le pone id nuevo y lo cuelga del vehículo activo. */
    const alta =
      <T extends object>(nombre: Coleccion) =>
      (registro: T) => {
        if (!activoId) return;
        const nuevo = { ...registro, id: nuevoId(), vehiculoId: activoId };
        guardar(nombre, nuevo);
        // Sólo services, cargas y mediciones traen kilometraje.
        const km = (registro as { km?: number }).km;
        if (km != null) sincronizarKm(activoId, km);
      };

    /** Edición: además del registro, puede adelantar el odómetro. */
    const edicion =
      <T extends { id: string; vehiculoId: string; km: number }>(nombre: Coleccion) =>
      (registro: T) => {
        guardar(nombre, registro);
        sincronizarKm(registro.vehiculoId, registro.km);
      };

    return {
      data,
      cargando,
      error,
      activo,
      vehiculos: data.vehiculos,
      services,
      cargas,
      lecturas,
      polizas,
      vtv,
      kmMaxRegistrado,
      kmMinRegistrado,

      seleccionarVehiculo: (id) => {
        if (!db || !uid) return;
        void guardarPreferencias(db, uid, { vehiculoActivoId: id });
      },

      agregarVehiculo: (v) => {
        const id = nuevoId();
        guardar('vehiculos', { ...v, id });
        if (db && uid) void guardarPreferencias(db, uid, { vehiculoActivoId: id });
        return id;
      },

      editarVehiculo: (v) => guardar('vehiculos', v),

      /** Borra el vehículo y todos sus registros asociados. */
      borrarVehiculo: (id) => {
        if (!db || !uid) return;
        void borrarVehiculoEnCascada(db, uid, id).then(() => {
          if (data.vehiculoActivoId !== id) return;
          const otro = data.vehiculos.find((v) => v.id !== id)?.id ?? null;
          void guardarPreferencias(db!, uid, { vehiculoActivoId: otro });
        });
      },

      setKmActual: (km) => {
        if (!activo) return;
        guardar('vehiculos', { ...activo, kmActual: Math.max(0, km) });
      },

      agregarService: alta<SinIds<Service>>('services'),
      editarService: edicion<Service>('services'),
      borrarService: (id) => {
        const r = data.services.find((s) => s.id === id);
        borrar('services', id);
        if (r) desincronizarKm(r.vehiculoId, r.km, { coleccion: 'services', id });
      },

      agregarCarga: alta<SinIds<CargaCombustible>>('cargas'),
      editarCarga: edicion<CargaCombustible>('cargas'),
      borrarCarga: (id) => {
        const r = data.cargasCombustible.find((c) => c.id === id);
        borrar('cargas', id);
        if (r) desincronizarKm(r.vehiculoId, r.km, { coleccion: 'cargas', id });
      },

      agregarLectura: alta<SinIds<LecturaTanque>>('lecturas'),
      editarLectura: edicion<LecturaTanque>('lecturas'),
      borrarLectura: (id) => {
        const r = data.lecturasTanque.find((l) => l.id === id);
        borrar('lecturas', id);
        if (r) desincronizarKm(r.vehiculoId, r.km, { coleccion: 'lecturas', id });
      },

      agregarPoliza: alta<SinIds<Poliza>>('polizas'),
      editarPoliza: (p) => guardar('polizas', p),
      borrarPoliza: (id) => borrar('polizas', id),

      agregarVtv: alta<SinIds<RegistroVTV>>('vtv'),
      editarVtv: (v) => guardar('vtv', v),
      borrarVtv: (id) => borrar('vtv', id),

      reemplazarTodo: (d) => {
        if (!db || !uid) return;
        void reemplazarTodoEnNube(db, uid, migrar(d));
      },
      borrarTodo: () => {
        if (!db || !uid) return;
        void borrarTodoEnNube(db, uid);
      },
    };
  }, [
    data,
    cargando,
    error,
    uid,
    activo,
    activoId,
    services,
    cargas,
    lecturas,
    polizas,
    vtv,
    kmMaxRegistrado,
    kmMinRegistrado,
    sincronizarKm,
    desincronizarKm,
  ]);

  return <DatosContext.Provider value={value}>{children}</DatosContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDatos(): DatosContextValue {
  const ctx = useContext(DatosContext);
  if (!ctx) throw new Error('useDatos debe usarse dentro de <DatosProvider>');
  return ctx;
}

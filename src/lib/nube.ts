import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import { DATA_VERSION, type VehiculoData } from '@/types';
import { datosIniciales } from '@/lib/storage';

/**
 * Cada registro es un documento propio en vez de un JSON gigante en un solo
 * doc. Así dos dispositivos que editan cosas distintas no se pisan, un borrado
 * se propaga de verdad (el doc deja de existir) y cada cambio sube unos pocos
 * bytes en lugar de todo el historial.
 *
 *   usuarios/{uid}                    → { vehiculoActivoId, version }
 *   usuarios/{uid}/vehiculos/{id}
 *   usuarios/{uid}/services/{id}
 *   usuarios/{uid}/cargas/{id}
 *   usuarios/{uid}/lecturas/{id}
 *   usuarios/{uid}/polizas/{id}
 *   usuarios/{uid}/vtv/{id}
 */
export const COLECCIONES = [
  'vehiculos',
  'services',
  'cargas',
  'lecturas',
  'polizas',
  'vtv',
] as const;

export type Coleccion = (typeof COLECCIONES)[number];

/** Nombre de la colección en la nube para cada lista de `VehiculoData`. */
export const CLAVE_LOCAL: Record<Coleccion, keyof VehiculoData> = {
  vehiculos: 'vehiculos',
  services: 'services',
  cargas: 'cargasCombustible',
  lecturas: 'lecturasTanque',
  polizas: 'polizas',
  vtv: 'vtv',
};

function docUsuario(db: Firestore, uid: string) {
  return doc(db, 'usuarios', uid);
}

function col(db: Firestore, uid: string, nombre: Coleccion) {
  return collection(db, 'usuarios', uid, nombre);
}

/** Firestore rechaza `undefined`: los campos opcionales vacíos no se guardan. */
function sinUndefined<T extends object>(obj: T): Record<string, unknown> {
  const salida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) salida[k] = v;
  }
  return salida;
}

interface Suscripcion {
  onDatos: (d: VehiculoData) => void;
  onError: (e: Error) => void;
}

/**
 * Escucha las seis colecciones y el doc del usuario, y arma el `VehiculoData`
 * completo cada vez que algo cambia. Devuelve la función para cortar.
 */
export function escucharDatos(
  db: Firestore,
  uid: string,
  { onDatos, onError }: Suscripcion,
): Unsubscribe {
  const acumulado: VehiculoData = { ...datosIniciales };
  // Se emite recién cuando llegó la primera respuesta de todo, para no
  // renderizar un estado a medias que parezca "no tenés nada cargado".
  const listas = new Set<string>();
  const completo = () => listas.size === COLECCIONES.length + 1;

  const emitir = () => {
    if (completo()) onDatos({ ...acumulado });
  };

  const cortes: Unsubscribe[] = [
    onSnapshot(
      docUsuario(db, uid),
      (snap) => {
        const d = snap.data();
        acumulado.vehiculoActivoId = (d?.vehiculoActivoId as string | null) ?? null;
        acumulado.version = (d?.version as number) ?? DATA_VERSION;
        listas.add('usuario');
        emitir();
      },
      (e) => onError(e as Error),
    ),
    ...COLECCIONES.map((nombre) =>
      onSnapshot(
        col(db, uid, nombre),
        (snap) => {
          const registros = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          // El cast es inevitable: Firestore devuelve DocumentData sin tipar.
          (acumulado[CLAVE_LOCAL[nombre]] as unknown) = registros;
          listas.add(nombre);
          emitir();
        },
        (e) => onError(e as Error),
      ),
    ),
  ];

  return () => cortes.forEach((c) => c());
}

/** Alta o edición de un registro. `merge` deja intactos los campos que no vengan. */
export function guardarRegistro<T extends { id: string }>(
  db: Firestore,
  uid: string,
  nombre: Coleccion,
  registro: T,
): Promise<void> {
  const { id, ...resto } = registro;
  return setDoc(doc(db, 'usuarios', uid, nombre, id), sinUndefined(resto));
}

export function borrarRegistro(
  db: Firestore,
  uid: string,
  nombre: Coleccion,
  id: string,
): Promise<void> {
  return deleteDoc(doc(db, 'usuarios', uid, nombre, id));
}

export function guardarPreferencias(
  db: Firestore,
  uid: string,
  datos: { vehiculoActivoId?: string | null },
): Promise<void> {
  return setDoc(docUsuario(db, uid), { ...datos, version: DATA_VERSION }, { merge: true });
}

/** Borra el vehículo y, en el mismo lote, todos sus registros asociados. */
export async function borrarVehiculoEnCascada(
  db: Firestore,
  uid: string,
  vehiculoId: string,
): Promise<void> {
  const lote = writeBatch(db);
  lote.delete(doc(db, 'usuarios', uid, 'vehiculos', vehiculoId));

  for (const nombre of COLECCIONES) {
    if (nombre === 'vehiculos') continue;
    const snap = await getDocs(col(db, uid, nombre));
    snap.docs
      .filter((d) => d.data().vehiculoId === vehiculoId)
      .forEach((d) => lote.delete(d.ref));
  }

  await lote.commit();
}

/**
 * Sube un `VehiculoData` entero: se usa al importar un backup y al subir por
 * primera vez lo que había en el navegador. Reemplaza todo lo que hubiera.
 */
export async function reemplazarTodoEnNube(
  db: Firestore,
  uid: string,
  datos: VehiculoData,
): Promise<void> {
  await borrarTodoEnNube(db, uid);

  const lote = writeBatch(db);
  for (const nombre of COLECCIONES) {
    const registros = datos[CLAVE_LOCAL[nombre]] as { id: string }[];
    for (const r of registros) {
      const { id, ...resto } = r;
      lote.set(doc(db, 'usuarios', uid, nombre, id), sinUndefined(resto));
    }
  }
  lote.set(docUsuario(db, uid), {
    vehiculoActivoId: datos.vehiculoActivoId ?? null,
    version: DATA_VERSION,
  });

  await lote.commit();
}

export async function borrarTodoEnNube(db: Firestore, uid: string): Promise<void> {
  const lote = writeBatch(db);
  for (const nombre of COLECCIONES) {
    const snap = await getDocs(col(db, uid, nombre));
    snap.docs.forEach((d) => lote.delete(d.ref));
  }
  lote.set(docUsuario(db, uid), { vehiculoActivoId: null, version: DATA_VERSION });
  await lote.commit();
}

/** True si la cuenta todavía no tiene nada cargado. */
export async function nubeVacia(db: Firestore, uid: string): Promise<boolean> {
  const snap = await getDocs(col(db, uid, 'vehiculos'));
  return snap.empty;
}

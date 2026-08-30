import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

/*
 * La config de Firebase es pública por diseño: identifica al proyecto, no da
 * permisos. Lo que protege los datos son las reglas de seguridad
 * (firestore.rules), que sólo dejan a cada usuario tocar su propia rama.
 *
 * Acá vive sólo Auth. Firestore se inicializa en `@/lib/db`, que se carga
 * recién con la sesión abierta para no meterlo en el bundle del login.
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** Sin variables de entorno no se puede inicializar: la app avisa en vez de romper. */
export const hayFirebase = Boolean(config.apiKey && config.projectId && config.appId);

let appInstancia: FirebaseApp | null = null;
let authInstancia: Auth | null = null;

if (hayFirebase) {
  appInstancia = initializeApp(config);
  authInstancia = getAuth(appInstancia);
}

export const app = appInstancia;
export const auth = authInstancia;

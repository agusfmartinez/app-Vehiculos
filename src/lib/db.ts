import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { app } from '@/lib/firebase';

/*
 * Caché local persistente: la app sigue andando sin señal y encola las
 * escrituras hasta que vuelve la conexión. `persistentMultipleTabManager`
 * evita que dos pestañas peleen por el mismo lock de IndexedDB.
 *
 * Este módulo se importa sólo desde la parte privada de la app, así el chunk
 * de Firestore (~250 kB) no viaja en la pantalla de login.
 */
export const db: Firestore | null = app
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  : null;

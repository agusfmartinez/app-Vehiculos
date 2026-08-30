import { useEffect, useState } from 'react';

/**
 * Si el navegador tiene red. No garantiza que Firestore responda, pero alcanza
 * para avisar que los cambios quedan en cola en vez de fingir que se guardaron
 * en la nube.
 */
export function useEnLinea(): boolean {
  const [enLinea, setEnLinea] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const arriba = () => setEnLinea(true);
    const abajo = () => setEnLinea(false);
    window.addEventListener('online', arriba);
    window.addEventListener('offline', abajo);
    return () => {
      window.removeEventListener('online', arriba);
      window.removeEventListener('offline', abajo);
    };
  }, []);

  return enLinea;
}

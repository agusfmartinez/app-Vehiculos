import { useCallback, useEffect, useRef, useState } from 'react';

type Actualizador<T> = T | ((anterior: T) => T);

interface Opciones<T> {
  /** ms de espera antes de escribir a localStorage. */
  debounceMs?: number;
  /** Normaliza/migra lo leído del storage al shape actual. */
  migrar?: (raw: unknown) => T;
}

/**
 * Estado persistido en localStorage con escritura debounced.
 * El estado en memoria es la fuente de verdad para el render; el storage
 * se actualiza como efecto secundario, y siempre se hace un flush final
 * al desmontar o al cerrar la pestaña para no perder el último cambio.
 */
export function useLocalStorage<T>(
  key: string,
  valorInicial: T,
  { debounceMs = 400, migrar }: Opciones<T> = {},
) {
  const migrarRef = useRef(migrar);
  migrarRef.current = migrar;

  const [valor, setValor] = useState<T>(() => {
    try {
      const guardado = window.localStorage.getItem(key);
      if (guardado == null) return valorInicial;
      const parseado = JSON.parse(guardado) as unknown;
      return migrarRef.current ? migrarRef.current(parseado) : (parseado as T);
    } catch (e) {
      console.warn(`No se pudo leer "${key}" de localStorage:`, e);
      return valorInicial;
    }
  });

  const pendienteRef = useRef<T | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const escribir = useCallback(
    (v: T) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(v));
      } catch (e) {
        console.error(`No se pudo guardar "${key}" en localStorage:`, e);
      }
    },
    [key],
  );

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendienteRef.current !== null) {
      escribir(pendienteRef.current);
      pendienteRef.current = null;
    }
  }, [escribir]);

  // Programa la escritura debounced cada vez que cambia el valor.
  const primeraRef = useRef(true);
  useEffect(() => {
    if (primeraRef.current) {
      primeraRef.current = false;
      return;
    }
    pendienteRef.current = valor;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (pendienteRef.current !== null) {
        escribir(pendienteRef.current);
        pendienteRef.current = null;
      }
    }, debounceMs);
  }, [valor, debounceMs, escribir]);

  // Flush ante cierre/ocultamiento de la pestaña y al desmontar.
  useEffect(() => {
    const alOcultar = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', alOcultar);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', alOcultar);
      flush();
    };
  }, [flush]);

  const actualizar = useCallback((actualizador: Actualizador<T>) => {
    setValor((anterior) =>
      typeof actualizador === 'function'
        ? (actualizador as (a: T) => T)(anterior)
        : actualizador,
    );
  }, []);

  return [valor, actualizar, { flush }] as const;
}

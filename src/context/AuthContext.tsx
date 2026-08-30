import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, hayFirebase } from '@/lib/firebase';

interface AuthContextValue {
  usuario: User | null;
  /** True mientras Firebase resuelve si había sesión guardada. */
  cargando: boolean;
  error: string | null;
  entrar: () => Promise<void>;
  salir: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const proveedor = new GoogleAuthProvider();

/** Traducción de los códigos de error que le pueden pasar a un usuario real. */
function mensajeDeError(codigo: string): string {
  switch (codigo) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Cerraste la ventana de Google antes de terminar.';
    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana de Google. Permití las ventanas emergentes y probá de nuevo.';
    case 'auth/network-request-failed':
      return 'No hay conexión con Google. Revisá internet y volvé a intentar.';
    case 'auth/unauthorized-domain':
      return 'Este dominio no está autorizado en Firebase Authentication.';
    default:
      return 'No se pudo iniciar sesión. Probá de nuevo en un momento.';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [cargando, setCargando] = useState(hayFirebase);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => {
      setUsuario(u);
      setCargando(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      usuario,
      cargando,
      error,
      entrar: async () => {
        if (!auth) return;
        setError(null);
        try {
          await signInWithPopup(auth, proveedor);
        } catch (e) {
          const codigo = (e as { code?: string }).code ?? '';
          // Cerrar el popup a propósito no es un error que valga la pena mostrar.
          if (codigo === 'auth/popup-closed-by-user') return;
          setError(mensajeDeError(codigo));
        }
      },
      salir: async () => {
        if (!auth) return;
        await signOut(auth);
      },
    }),
    [usuario, cargando, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

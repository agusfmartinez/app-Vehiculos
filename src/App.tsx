import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { hayFirebase } from '@/lib/firebase';
import { LoginPage, SinConfigurar } from '@/features/auth/LoginPage';

// Firestore y las pantallas pesan: no se descargan hasta que hay sesión.
const AppPrivada = lazy(() => import('@/AppPrivada'));

/** Mientras Firebase resuelve si había sesión guardada. */
function Cargando() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-carbon-900">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-carbon-600 border-t-ambar-400" />
    </div>
  );
}

function Contenido() {
  const { usuario, cargando } = useAuth();

  if (cargando) return <Cargando />;
  if (!usuario) return <LoginPage />;

  return (
    <Suspense fallback={<Cargando />}>
      <AppPrivada />
    </Suspense>
  );
}

export default function App() {
  if (!hayFirebase) return <SinConfigurar />;

  return (
    <AuthProvider>
      <Contenido />
    </AuthProvider>
  );
}

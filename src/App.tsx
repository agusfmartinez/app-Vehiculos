import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { hayFirebase } from '@/lib/firebase';
import { Cargando } from '@/components/layout/Cargando';
import { LoginPage, SinConfigurar } from '@/features/auth/LoginPage';

// Firestore y las pantallas pesan: no se descargan hasta que hay sesión.
const AppPrivada = lazy(() => import('@/AppPrivada'));

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

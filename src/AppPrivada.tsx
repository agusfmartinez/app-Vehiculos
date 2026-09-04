import { Navigate, Route, Routes } from 'react-router-dom';
import { DatosProvider, useDatos } from '@/context/DatosContext';
import { AppShell } from '@/components/layout/AppShell';
import { Cargando } from '@/components/layout/Cargando';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { VehiculoPage } from '@/features/vehiculo/VehiculoPage';
import { ServicesPage } from '@/features/services/ServicesPage';
import { CombustiblePage } from '@/features/combustible/CombustiblePage';
import { SeguroPage } from '@/features/seguro/SeguroPage';
import { VtvPage } from '@/features/vtv/VtvPage';

/**
 * Espera a que llegue el primer snapshot real de Firestore antes de mostrar
 * cualquier pantalla. Sin esto, la primera carga renderiza un instante con
 * `datosIniciales` (sin vehículos) y se alcanza a ver el cartel de "cargá tu
 * primer auto" antes de que aparezca el que ya tenías.
 */
function Enrutado() {
  const { cargando } = useDatos();
  if (cargando) return <Cargando />;

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/vehiculo" element={<VehiculoPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/combustible" element={<CombustiblePage />} />
        <Route path="/seguro" element={<SeguroPage />} />
        <Route path="/vtv" element={<VtvPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

/**
 * Todo lo que necesita sesión. Va en su propio chunk: quien todavía no entró
 * no descarga Firestore ni las pantallas de la app.
 */
export default function AppPrivada() {
  return (
    <DatosProvider>
      <Enrutado />
    </DatosProvider>
  );
}

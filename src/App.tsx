import { Navigate, Route, Routes } from 'react-router-dom';
import { DatosProvider } from '@/context/DatosContext';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { VehiculoPage } from '@/features/vehiculo/VehiculoPage';
import { ServicesPage } from '@/features/services/ServicesPage';
import { CombustiblePage } from '@/features/combustible/CombustiblePage';
import { VtvPage } from '@/features/vtv/VtvPage';

export default function App() {
  return (
    <DatosProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/vehiculo" element={<VehiculoPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/combustible" element={<CombustiblePage />} />
          <Route path="/vtv" element={<VtvPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </DatosProvider>
  );
}

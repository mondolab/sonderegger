import { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { Layout } from './components/Layout';
import { Spinner } from './components/UI';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Clientes } from './pages/Clientes';
import { ClienteDetail } from './pages/ClienteDetail';
import { Vehiculos } from './pages/Vehiculos';
import { VehiculoDetail } from './pages/VehiculoDetail';
import { Turnos } from './pages/Turnos';
import { Trabajos } from './pages/Trabajos';
import { TrabajoDetail } from './pages/TrabajoDetail';
import { Presupuestos } from './pages/Presupuestos';
import { PresupuestoDetail } from './pages/PresupuestoDetail';
import { Comprobantes } from './pages/Comprobantes';
import { Inventario } from './pages/Inventario';
import { Caja } from './pages/Caja';
import { Reportes } from './pages/Reportes';
import { Configuracion } from './pages/Configuracion';

function Gate({ children }: { children: ReactNode }) {
  const { usuario, ready } = useAuth();
  if (!ready) return <Spinner />;
  if (!usuario) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <Gate>
                <Layout />
              </Gate>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/clientes/:id" element={<ClienteDetail />} />
            <Route path="/vehiculos" element={<Vehiculos />} />
            <Route path="/vehiculos/:id" element={<VehiculoDetail />} />
            <Route path="/turnos" element={<Turnos />} />
            <Route path="/trabajos" element={<Trabajos />} />
            <Route path="/trabajos/:id" element={<TrabajoDetail />} />
            <Route path="/presupuestos" element={<Presupuestos />} />
            <Route path="/presupuestos/:id" element={<PresupuestoDetail />} />
            <Route path="/comprobantes" element={<Comprobantes />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/caja" element={<Caja />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/configuracion" element={<Configuracion />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
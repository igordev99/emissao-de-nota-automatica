import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/Layout';
// import './services/debug'; // Debug tools - removido temporariamente
// App updated: 2024-09-25 - Tipos de Serviço implementados
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import ClientForm from './pages/ClientForm';
import Clients from './pages/Clients';
import Dashboard from './pages/Dashboard';
import ImportClients from './pages/ImportClients';
import Login from './pages/Login';
import NfseEmit from './pages/NfseEmit';
import NfseList from './pages/NfseList';
import SupplierForm from './pages/SupplierForm';
import Suppliers from './pages/Suppliers';
import ImportSuppliers from './pages/ImportSuppliers';
import ServiceTypes from './pages/ServiceTypes';
import ServiceTypeForm from './pages/ServiceTypeForm';
import ImportServiceTypes from './pages/ImportServiceTypes';
import SystemConfig from './pages/SystemConfig';
import SystemStatus from './pages/SystemStatus';
import UpholdConfig from './pages/UpholdConfig';
import WebhookForm from './pages/WebhookForm';
import Webhooks from './pages/Webhooks';
import FormulaGroupsPage from './pages/FormulaGroupsPage';
import FormulaGroupRowsPage from './pages/FormulaGroupRowsPage';
import AuthDebug from './components/AuthDebug';

function App() {
  try {
    return (
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="nfse" element={<NfseEmit />} />
              <Route path="nfse-list" element={<NfseList />} />
              <Route path="clients" element={<Clients />} />
              <Route path="clients/new" element={<ClientForm />} />
              <Route path="clients/:id/edit" element={<ClientForm />} />
              <Route path="clients/import" element={<ImportClients />} />
              <Route path="suppliers" element={<Suppliers />} />
              <Route path="suppliers/new" element={<SupplierForm />} />
              <Route path="suppliers/:id/edit" element={<SupplierForm />} />
              <Route path="suppliers/import" element={<ImportSuppliers />} />
              <Route path="service-types" element={<ServiceTypes />} />
              <Route path="service-types/new" element={<ServiceTypeForm />} />
              <Route path="service-types/:id/edit" element={<ServiceTypeForm />} />
              <Route path="service-types/import" element={<ImportServiceTypes />} />
              <Route path="uphold-config" element={<UpholdConfig />} />
              <Route path="system-config" element={<SystemConfig />} />
              <Route path="system-status" element={<SystemStatus />} />
              <Route path="webhooks" element={<Webhooks />} />
              <Route path="webhooks/new" element={<WebhookForm />} />
              <Route path="webhooks/:id/edit" element={<WebhookForm />} />
              
              {/* Rotas para Fórmulas */}
              <Route path="admin/formulas" element={<FormulaGroupsPage />} />
              <Route path="admin/formulas/groups/:groupId" element={<FormulaGroupRowsPage />} />
              
              {/* Debug temporário - remover após testes */}
              <Route path="admin/debug" element={<AuthDebug />} />
            </Route>
            {/* Redirecionar qualquer rota não encontrada para dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    );
  } catch (error) {
    console.error('Erro na aplicação:', error);
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h1>Erro na Aplicação</h1>
        <p>Erro: {String(error)}</p>
        <p>Verifique o console para mais detalhes.</p>
      </div>
    );
  }
}

export default App;

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/Layout';
import './services/debug'; // Debug tools
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import ClientForm from './pages/ClientForm';
import Clients from './pages/Clients';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import NfseEmit from './pages/NfseEmit';
import NfseList from './pages/NfseList';
import SupplierForm from './pages/SupplierForm';
import Suppliers from './pages/Suppliers';
import WebhookForm from './pages/WebhookForm';
import Webhooks from './pages/Webhooks';

function App() {
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
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="suppliers/new" element={<SupplierForm />} />
            <Route path="suppliers/:id/edit" element={<SupplierForm />} />
            <Route path="webhooks" element={<Webhooks />} />
            <Route path="webhooks/new" element={<WebhookForm />} />
            <Route path="webhooks/:id/edit" element={<WebhookForm />} />
          </Route>
          {/* Redirecionar qualquer rota não encontrada para dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

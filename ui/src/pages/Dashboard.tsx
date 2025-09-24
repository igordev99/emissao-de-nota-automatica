import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { nfseService } from '../services/nfse';
import api from '../services/api';
import type { NfseStats } from '../types';

interface SystemHealth {
  api: 'online' | 'offline' | 'loading';
  database: 'connected' | 'disconnected' | 'loading';
  certificate: 'configured' | 'not-configured' | 'expired' | 'loading';
}

export default function Dashboard() {
  const [stats, setStats] = useState<NfseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<SystemHealth>({
    api: 'loading',
    database: 'loading',
    certificate: 'loading'
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        // Carregar estatísticas
        const statsData = await nfseService.getStats();
        setStats(statsData);

        // Carregar health do sistema
        const healthResponse = await api.get('/health/deps');
        const healthData = healthResponse.data;

        // Mapear status dos componentes
        const dbStatus = healthData.components?.database?.status;
        const certStatus = healthData.components?.certificate?.status;

        setHealth({
          api: 'online',
          database: dbStatus === 'healthy' ? 'connected' : 'disconnected',
          certificate: certStatus === 'healthy' 
            ? 'configured' 
            : certStatus === 'not_configured' || certStatus === 'unhealthy'
            ? 'not-configured'
            : 'not-configured'
        });

      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setHealth({
          api: 'offline',
          database: 'disconnected', 
          certificate: 'not-configured'
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const statCards = [
    {
      name: 'Total de NFS-e',
      value: stats?.total || 0,
      color: 'bg-blue-500',
    },
    {
      name: 'Pendentes',
      value: stats?.pending || 0,
      color: 'bg-yellow-500',
    },
    {
      name: 'Sucesso',
      value: stats?.success || 0,
      color: 'bg-green-500',
    },
    {
      name: 'Rejeitadas',
      value: stats?.rejected || 0,
      color: 'bg-red-500',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Visão geral do sistema de emissão de NFS-e
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <div
              key={stat.name}
              className="bg-white overflow-hidden shadow rounded-lg"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div
                      className={`w-8 h-8 rounded-md ${stat.color} flex items-center justify-center`}
                    >
                      <span className="text-white text-sm font-medium">
                        {stat.value}
                      </span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.name}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stat.value.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Ações rápidas */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Ações Rápidas
            </h3>
            <div className="space-y-3">
              <Link 
                to="/nfse"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 block text-center"
              >
                Emitir NFS-e
              </Link>
              <Link 
                to="/clients/new"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 block text-center"
              >
                Cadastrar Cliente
              </Link>
              <Link 
                to="/suppliers/new"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 block text-center"
              >
                Cadastrar Fornecedor
              </Link>
              <Link 
                to="/clients/import"
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 block text-center"
              >
                Importar Clientes
              </Link>
            </div>
          </div>
        </div>

        {/* Status do sistema */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Status do Sistema
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">API Backend</span>
                {health.api === 'loading' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                ) : (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    health.api === 'online' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {health.api === 'online' ? 'Online' : 'Offline'}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Banco de Dados</span>
                {health.database === 'loading' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                ) : (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    health.database === 'connected' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {health.database === 'connected' ? 'Conectado' : 'Desconectado'}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Certificado Digital</span>
                {health.certificate === 'loading' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                ) : (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    health.certificate === 'configured' 
                      ? 'bg-green-100 text-green-800' 
                      : health.certificate === 'expired'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {health.certificate === 'configured' 
                      ? 'Configurado' 
                      : health.certificate === 'expired'
                      ? 'Expirado'
                      : 'Não Configurado'
                    }
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
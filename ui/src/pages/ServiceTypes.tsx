import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowUpTrayIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { ServiceTypesService } from '../services/serviceTypesService';
import type { Database } from '../lib/supabase';

type ServiceType = Database['public']['Tables']['service_types']['Row'];

export default function ServiceTypes() {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [filteredServiceTypes, setFilteredServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const loadServiceTypes = async () => {
    try {
      setLoading(true);
      const data = await ServiceTypesService.getAll(!showInactive); // activeOnly
      setServiceTypes(data);
      setFilteredServiceTypes(data);
    } catch (error) {
      console.error('Erro ao carregar tipos de serviço:', error);
      alert('Erro ao carregar tipos de serviço');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServiceTypes();
  }, [showInactive]);

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredServiceTypes(serviceTypes);
    } else {
      const filtered = serviceTypes.filter(serviceType => 
        serviceType.name.toLowerCase().includes(search.toLowerCase()) ||
        serviceType.code.includes(search)
      );
      setFilteredServiceTypes(filtered);
    }
  }, [search, serviceTypes]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // A filtragem já é feita no useEffect acima
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este tipo de serviço?')) return;

    try {
      setDeleteLoading(id);
      await ServiceTypesService.delete(id);
      await loadServiceTypes(); // Recarrega a lista
    } catch (error) {
      console.error('Erro ao excluir tipo de serviço:', error);
      alert('Erro ao excluir tipo de serviço');
    } finally {
      setDeleteLoading(null);
    }
  };

  const toggleActive = async (serviceType: ServiceType) => {
    try {
      await ServiceTypesService.toggleActive(serviceType.id, !serviceType.active);
      await loadServiceTypes(); // Recarrega a lista
    } catch (error) {
      console.error('Erro ao alterar status do tipo de serviço:', error);
      alert('Erro ao alterar status do tipo de serviço');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando tipos de serviço...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tipos de Serviço</h1>
              <p className="mt-2 text-sm text-gray-600">
                Gerencie os tipos de serviço para emissão de NFS-e
              </p>
            </div>
            <div className="flex space-x-4">
              <Link
                to="/service-types/import"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                Importar Tipos de Serviço
              </Link>
              <Link
                to="/service-types/new"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Novo Tipo de Serviço
              </Link>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="p-6">
            <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-64">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                  Buscar tipos de serviço
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder="Pesquisar por código, nome ou descrição..."
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center">
                <input
                  id="show-inactive"
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="show-inactive" className="ml-2 text-sm text-gray-700">
                  Mostrar inativos
                </label>
              </div>
              
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Buscar
              </button>
            </form>
          </div>
        </div>

        {/* Results */}
        {serviceTypes && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {filteredServiceTypes.length} tipo(s) de serviço encontrado(s)
              </h3>
            </div>
            
            {filteredServiceTypes.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">Nenhum tipo de serviço encontrado.</p>
                <Link
                  to="/service-types/new"
                  className="mt-2 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Criar primeiro tipo de serviço
                </Link>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Código
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nome
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ISS Retido
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Criado em
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredServiceTypes.map((serviceType: ServiceType) => (
                        <tr key={serviceType.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {serviceType.code}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div className="font-medium">{serviceType.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              serviceType.iss_retained 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {serviceType.iss_retained ? 'Sim' : 'Não'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              serviceType.active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {serviceType.active ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(serviceType.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-3">
                              <button
                                onClick={() => toggleActive(serviceType)}
                                className="text-gray-400 hover:text-gray-600"
                                title={serviceType.active ? 'Desativar' : 'Ativar'}
                              >
                                {serviceType.active ? (
                                  <EyeSlashIcon className="h-4 w-4" />
                                ) : (
                                  <EyeIcon className="h-4 w-4" />
                                )}
                              </button>
                              <Link
                                to={`/service-types/${serviceType.id}/edit`}
                                className="text-indigo-600 hover:text-indigo-900"
                                title="Editar"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </Link>
                              <button
                                onClick={() => handleDelete(serviceType.id)}
                                disabled={deleteLoading === serviceType.id}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                title="Excluir"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
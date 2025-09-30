import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

import { ServiceTypesService } from '../services/serviceTypesService';

interface FormData {
  code: string;
  name: string;
  issRetained: boolean;
  active: boolean;
}

const initialFormData: FormData = {
  code: '',
  name: '',
  issRetained: false,
  active: true
};

export default function ServiceTypeForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && id) {
      loadServiceType(id);
    }
  }, [id, isEditing]);

  const loadServiceType = async (serviceTypeId: string) => {
    try {
      setLoading(true);
      const serviceType = await ServiceTypesService.getById(serviceTypeId);
      if (serviceType) {
        setFormData({
          code: serviceType.code,
          name: serviceType.name,
          issRetained: serviceType.iss_retained,
          active: serviceType.active
        });
      }
    } catch (error) {
      console.error('Erro ao carregar tipo de serviço:', error);
      setError('Erro ao carregar tipo de serviço');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaveLoading(true);

    try {
      console.log('🚀 [ServiceTypeForm] Iniciando submit...');
      
      const serviceTypeData = {
        code: formData.code,
        name: formData.name,
        iss_retained: formData.issRetained,
        active: formData.active
      };
      
      console.log('📋 [ServiceTypeForm] Dados para salvar:', serviceTypeData);

      if (isEditing && id) {
        console.log('✏️ [ServiceTypeForm] Atualizando tipo de serviço...');
        await ServiceTypesService.update(id, serviceTypeData);
      } else {
        console.log('➕ [ServiceTypeForm] Criando novo tipo de serviço...');
        await ServiceTypesService.create(serviceTypeData);
      }
      
      console.log('✅ [ServiceTypeForm] Salvo com sucesso, redirecionando...');
      navigate('/service-types');
    } catch (error: any) {
      console.error('❌ [ServiceTypeForm] Erro ao salvar tipo de serviço:', error);
      setError(error.message || 'Erro ao salvar tipo de serviço');
    } finally {
      console.log('🏁 [ServiceTypeForm] Finalizando submit...');
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando tipo de serviço...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Link
              to="/service-types"
              className="flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Voltar para Tipos de Serviço
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? 'Editar Tipo de Serviço' : 'Novo Tipo de Serviço'}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {isEditing 
              ? 'Altere as informações do tipo de serviço' 
              : 'Preencha as informações para criar um novo tipo de serviço'
            }
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Erro</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Código */}
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  Código *
                </label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  required
                  value={formData.code}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Ex: 2500, 1023, 7617"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Código do serviço (pode ser qualquer número ou texto)
                </p>
              </div>

              {/* ISS Retido */}
              <div className="flex items-center h-full">
                <div className="flex items-center">
                  <input
                    id="issRetained"
                    name="issRetained"
                    type="checkbox"
                    checked={formData.issRetained}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="issRetained" className="ml-2 block text-sm text-gray-700">
                    ISS Retido na Fonte
                  </label>
                </div>
              </div>
            </div>

            {/* Nome */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Nome *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Nome descritivo do serviço"
              />
            </div>

            {/* Status */}
            <div>
              <div className="flex items-center">
                <input
                  id="active"
                  name="active"
                  type="checkbox"
                  checked={formData.active}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
                  Ativo
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Tipos de serviço inativos não aparecem na seleção para emissão de NFS-e
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Link
                to="/service-types"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={saveLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {saveLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    {isEditing ? 'Salvar Alterações' : 'Criar Tipo de Serviço'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
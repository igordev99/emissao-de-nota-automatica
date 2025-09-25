import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';

import SearchableSelect from '../components/SearchableSelect';
import { hybridClientService, hybridNfseService, hybridSupplierService } from '../services';
import { serviceTypeService } from '../services/serviceTypes';
import type { NfseEmitRequest, Client, Supplier, ServiceType } from '../types';

interface NfseEmitFormData extends NfseEmitRequest {}

interface AlertProps {
  type: 'success' | 'error';
  title: string;
  message: string;
}

const Alert = ({ type, title, message }: AlertProps) => {
  const isSuccess = type === 'success';
  const bgColor = isSuccess ? 'bg-green-50' : 'bg-red-50';
  const borderColor = isSuccess ? 'border-green-200' : 'border-red-200';
  const iconColor = isSuccess ? 'text-green-400' : 'text-red-400';
  const titleColor = isSuccess ? 'text-green-800' : 'text-red-800';
  const messageColor = isSuccess ? 'text-green-700' : 'text-red-700';
  const iconPath = isSuccess
    ? "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
    : "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z";

  return (
    <div className={`mb-6 ${bgColor} border ${borderColor} rounded-md p-4`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className={`h-5 w-5 ${iconColor}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d={iconPath} clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className={`text-sm font-medium ${titleColor}`}>
            {title}
          </h3>
          <div className={`mt-2 text-sm ${messageColor}`}>
            <p>{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function NfseEmit() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [serviceTypesLoading, setServiceTypesLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<NfseEmitFormData>();

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      try {
        const [clientsData, suppliersData] = await Promise.all([
          hybridClientService.getClients(),
          hybridSupplierService.getSuppliers()
        ]);
        setClients(clientsData.items);
        setSuppliers(suppliersData.items);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };
    loadData();
  }, []);

  // Carregar tipos de serviço
  useEffect(() => {
    const loadServiceTypes = async () => {
      setServiceTypesLoading(true);
      try {
        const response = await serviceTypeService.getServiceTypes();
        if (response.success) {
          setServiceTypes(response.serviceTypes);
        }
      } catch (error) {
        console.error('Erro ao carregar tipos de serviço:', error);
      } finally {
        setServiceTypesLoading(false);
      }
    };
    loadServiceTypes();
  }, []);

  const onSubmit = async (data: NfseEmitFormData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await hybridNfseService.emitNfse(data);
      setSuccess(true);
      reset();
      setSelectedClientId('');
      setSelectedSupplierId('');
      setSelectedServiceTypeId('');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao emitir NFS-e');
    } finally {
      setLoading(false);
    }
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setValue('customer.name', client.name);
      setValue('customer.email', client.email || '');
      if (client.document.length === 11) {
        setValue('customer.cpf', client.document);
        setValue('customer.cnpj', '');
      } else {
        setValue('customer.cnpj', client.document);
        setValue('customer.cpf', '');
      }
    }
  };

  const handleSupplierSelect = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    const supplier = suppliers.find(s => s.id === supplierId);
    if (supplier) {
      setValue('provider.cnpj', supplier.cnpj);
    }
  };

  const handleServiceTypeSelect = (serviceTypeId: string) => {
    setSelectedServiceTypeId(serviceTypeId);
    const serviceType = serviceTypes.find(st => st.id.toString() === serviceTypeId);
    if (serviceType) {
      setValue('serviceCode', serviceType.code);
      setValue('serviceDescription', serviceType.name);
      setValue('issRetained', serviceType.issRetido);
    }
  };

  const clearClientSelection = () => {
    setSelectedClientId('');
    setValue('customer.name', '');
    setValue('customer.email', '');
    setValue('customer.cpf', '');
    setValue('customer.cnpj', '');
  };

  const clearSupplierSelection = () => {
    setSelectedSupplierId('');
    setValue('provider.cnpj', '');
  };

  const clearServiceTypeSelection = () => {
    setSelectedServiceTypeId('');
    setValue('serviceCode', '');
    setValue('serviceDescription', '');
    setValue('issRetained', false);
  };

  // Preparar opções para os componentes SearchableSelect
  const clientOptions = clients.map(client => ({
    id: client.id,
    label: client.name,
    sublabel: client.document
  }));

  const supplierOptions = suppliers.map(supplier => ({
    id: supplier.id,
    label: supplier.name,
    sublabel: supplier.cnpj
  }));

  const serviceTypeOptions = serviceTypes.map(serviceType => ({
    id: serviceType.id.toString(),
    label: `${serviceType.code} - ${serviceType.name}`,
    sublabel: serviceType.issRetido ? 'ISS Retido' : ''
  }));

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Emitir NFS-e</h1>
          <p className="mt-2 text-sm text-gray-600">
            Preencha os dados para emitir uma nova Nota Fiscal de Serviços Eletrônica
          </p>
        </div>

        {success && (
          <Alert
            type="success"
            title="NFS-e emitida com sucesso!"
            message="A nota fiscal foi enviada para processamento."
          />
        )}

        {error && (
          <Alert
            type="error"
            title="Erro ao emitir NFS-e"
            message={error}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Principal - Formulário */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Dados do RPS */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Dados do RPS</h3>
                  <p className="mt-1 text-sm text-gray-500">Informações básicas do documento</p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="rpsSeries" className="block text-sm font-medium text-gray-700 mb-1">
                        Série do RPS <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="rpsSeries"
                        {...register('rpsSeries', { required: 'Série do RPS é obrigatória' })}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Ex: A"
                      />
                      {errors.rpsSeries && (
                        <p className="mt-1 text-sm text-red-600">{errors.rpsSeries.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="issueDate" className="block text-sm font-medium text-gray-700 mb-1">
                        Data de Emissão <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        id="issueDate"
                        {...register('issueDate', { required: 'Data de emissão é obrigatória' })}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      {errors.issueDate && (
                        <p className="mt-1 text-sm text-red-600">{errors.issueDate.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dados do Serviço */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Dados do Serviço</h3>
                  <p className="mt-1 text-sm text-gray-500">Informações sobre o serviço prestado</p>
                </div>
                <div className="p-6 space-y-6">
                  {/* Seleção de Tipo de Serviço */}
                  <SearchableSelect
                    options={serviceTypeOptions}
                    value={selectedServiceTypeId}
                    placeholder={serviceTypesLoading ? 'Carregando tipos de serviço...' : 'Selecione um tipo de serviço...'}
                    onSelect={handleServiceTypeSelect}
                    onClear={clearServiceTypeSelection}
                    disabled={serviceTypesLoading || serviceTypes.length === 0}
                    label="Tipo de Serviço (Uphold)"
                  />
                  <p className="text-sm text-gray-500">
                    Selecionar um tipo preencherá automaticamente código, descrição e ISS retido
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="serviceCode" className="block text-sm font-medium text-gray-700 mb-1">
                        Código do Serviço <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="serviceCode"
                        {...register('serviceCode', { required: 'Código do serviço é obrigatório' })}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Ex: 1.01"
                      />
                      {errors.serviceCode && (
                        <p className="mt-1 text-sm text-red-600">{errors.serviceCode.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="cnae" className="block text-sm font-medium text-gray-700 mb-1">
                        CNAE (Opcional)
                      </label>
                      <input
                        type="text"
                        id="cnae"
                        {...register('cnae')}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Ex: 6201-5/00"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="serviceDescription" className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição do Serviço <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="serviceDescription"
                      rows={3}
                      {...register('serviceDescription', { required: 'Descrição do serviço é obrigatória' })}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Descreva o serviço prestado..."
                    />
                    {errors.serviceDescription && (
                      <p className="mt-1 text-sm text-red-600">{errors.serviceDescription.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Valores */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Valores</h3>
                  <p className="mt-1 text-sm text-gray-500">Informações financeiras do serviço</p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label htmlFor="serviceAmount" className="block text-sm font-medium text-gray-700 mb-1">
                        Valor do Serviço (R$) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        id="serviceAmount"
                        {...register('serviceAmount', {
                          required: 'Valor do serviço é obrigatório',
                          min: { value: 0.01, message: 'Valor deve ser maior que zero' }
                        })}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="0.00"
                      />
                      {errors.serviceAmount && (
                        <p className="mt-1 text-sm text-red-600">{errors.serviceAmount.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="deductionsAmount" className="block text-sm font-medium text-gray-700 mb-1">
                        Deduções (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        id="deductionsAmount"
                        {...register('deductionsAmount', {
                          min: { value: 0, message: 'Valor não pode ser negativo' }
                        })}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="0.00"
                      />
                      {errors.deductionsAmount && (
                        <p className="mt-1 text-sm text-red-600">{errors.deductionsAmount.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700 mb-1">
                        Alíquota (%) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        id="taxRate"
                        {...register('taxRate', {
                          required: 'Alíquota é obrigatória',
                          min: { value: 0, message: 'Alíquota deve ser maior ou igual a zero' },
                          max: { value: 100, message: 'Alíquota não pode ser maior que 100%' }
                        })}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="0.00"
                      />
                      {errors.taxRate && (
                        <p className="mt-1 text-sm text-red-600">{errors.taxRate.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="issRetained"
                          type="checkbox"
                          {...register('issRetained')}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="issRetained" className="font-medium text-gray-700">
                          ISS Retido na Fonte
                        </label>
                        <p className="text-gray-500">
                          Marque se o ISS será retido na fonte pelo tomador do serviço
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prestador */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Prestador do Serviço</h3>
                  <p className="mt-1 text-sm text-gray-500">Dados da empresa que prestará o serviço</p>
                </div>
                <div className="p-6 space-y-6">
                  <SearchableSelect
                    options={supplierOptions}
                    value={selectedSupplierId}
                    placeholder="Selecione um fornecedor..."
                    onSelect={handleSupplierSelect}
                    onClear={clearSupplierSelection}
                    label="Fornecedor Cadastrado"
                  />

                  <div>
                    <label htmlFor="providerCnpj" className="block text-sm font-medium text-gray-700 mb-1">
                      CNPJ do Prestador <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="providerCnpj"
                      {...register('provider.cnpj', {
                        required: 'CNPJ do prestador é obrigatório',
                        pattern: {
                          value: /^\d{14}$/,
                          message: 'CNPJ deve ter 14 dígitos'
                        }
                      })}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="00000000000000"
                    />
                    {errors.provider?.cnpj && (
                      <p className="mt-1 text-sm text-red-600">{errors.provider.cnpj.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Tomador */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Tomador do Serviço</h3>
                  <p className="mt-1 text-sm text-gray-500">Dados do cliente que receberá o serviço</p>
                </div>
                <div className="p-6 space-y-6">
                  <SearchableSelect
                    options={clientOptions}
                    value={selectedClientId}
                    placeholder="Selecione um cliente..."
                    onSelect={handleClientSelect}
                    onClear={clearClientSelection}
                    label="Cliente Cadastrado"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
                        Nome/Razão Social <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="customerName"
                        {...register('customer.name', { required: 'Nome do tomador é obrigatório' })}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Nome completo ou razão social"
                      />
                      {errors.customer?.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.customer.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-1">
                        E-mail
                      </label>
                      <input
                        type="email"
                        id="customerEmail"
                        {...register('customer.email')}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="email@exemplo.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="customerCpf" className="block text-sm font-medium text-gray-700 mb-1">
                        CPF (Pessoa Física)
                      </label>
                      <input
                        type="text"
                        id="customerCpf"
                        {...register('customer.cpf', {
                          pattern: {
                            value: /^\d{11}$/,
                            message: 'CPF deve ter 11 dígitos'
                          }
                        })}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="00000000000"
                      />
                      {errors.customer?.cpf && (
                        <p className="mt-1 text-sm text-red-600">{errors.customer.cpf.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="customerCnpj" className="block text-sm font-medium text-gray-700 mb-1">
                        CNPJ (Pessoa Jurídica)
                      </label>
                      <input
                        type="text"
                        id="customerCnpj"
                        {...register('customer.cnpj', {
                          pattern: {
                            value: /^\d{14}$/,
                            message: 'CNPJ deve ter 14 dígitos'
                          }
                        })}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="00000000000000"
                      />
                      {errors.customer?.cnpj && (
                        <p className="mt-1 text-sm text-red-600">{errors.customer.cnpj.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Informações Adicionais */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Informações Adicionais</h3>
                  <p className="mt-1 text-sm text-gray-500">Dados complementares (opcional)</p>
                </div>
                <div className="p-6">
                  <div>
                    <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-700 mb-1">
                      Observações
                    </label>
                    <textarea
                      id="additionalInfo"
                      rows={3}
                      {...register('additionalInfo')}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Informações adicionais sobre o serviço..."
                    />
                  </div>
                </div>
              </div>

              {/* Botões */}
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setSelectedClientId('');
                    setSelectedSupplierId('');
                    setSelectedServiceTypeId('');
                  }}
                  className="w-full sm:w-auto bg-white py-3 px-6 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Limpar Formulário
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto bg-blue-600 py-3 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Emitindo...' : 'Emitir NFS-e'}
                </button>
              </div>
            </form>
          </div>

          {/* Coluna Lateral - Resumo/Ajuda */}
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Guia Rápido</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="text-sm">
                    <h4 className="font-medium text-gray-900">1. Dados Básicos</h4>
                    <p className="text-gray-600">Preencha série do RPS e data de emissão</p>
                  </div>
                  <div className="text-sm">
                    <h4 className="font-medium text-gray-900">2. Tipo de Serviço</h4>
                    <p className="text-gray-600">Use o dropdown do Uphold para facilitar o preenchimento</p>
                  </div>
                  <div className="text-sm">
                    <h4 className="font-medium text-gray-900">3. Valores</h4>
                    <p className="text-gray-600">Informe valor do serviço, deduções e alíquota</p>
                  </div>
                  <div className="text-sm">
                    <h4 className="font-medium text-gray-900">4. Prestador e Tomador</h4>
                    <p className="text-gray-600">Use a busca para encontrar fornecedores e clientes rapidamente</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Dica</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>Use os campos de busca para encontrar rapidamente clientes e fornecedores já cadastrados no sistema.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
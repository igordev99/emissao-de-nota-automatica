import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { clientService } from '../services/clients';
import { nfseService } from '../services/nfse';
import { supplierService } from '../services/suppliers';
import type { NfseEmitRequest, Client, Supplier } from '../types';

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

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<NfseEmitFormData>();

  const issRetained = watch('issRetained');

  // Carregar clientes e fornecedores
  useEffect(() => {
    const loadData = async () => {
      try {
        const [clientsData, suppliersData] = await Promise.all([
          clientService.getClients(),
          supplierService.getSuppliers()
        ]);
        setClients(clientsData.items);
        setSuppliers(suppliersData.items);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };
    loadData();
  }, []);

  const onSubmit = async (data: NfseEmitFormData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await nfseService.emitNfse(data);
      setSuccess(true);
      reset();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao emitir NFS-e');
    } finally {
      setLoading(false);
    }
  };

  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setValue('customer.name', client.name);
      setValue('customer.email', client.email || '');
      if (client.document.length === 11) {
        setValue('customer.cpf', client.document);
        setValue('customer.cnpj', undefined);
      } else {
        setValue('customer.cnpj', client.document);
        setValue('customer.cpf', undefined);
      }
    }
  };

  const handleSupplierSelect = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (supplier) {
      setValue('provider.cnpj', supplier.cnpj);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Emitir NFS-e</h1>
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Dados do RPS */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Dados do RPS
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="rpsSeries" className="block text-sm font-medium text-gray-700">
                  Série do RPS
                </label>
                <input
                  type="text"
                  id="rpsSeries"
                  {...register('rpsSeries', { required: 'Série do RPS é obrigatória' })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Ex: A"
                />
                {errors.rpsSeries && (
                  <p className="mt-1 text-sm text-red-600">{errors.rpsSeries.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="issueDate" className="block text-sm font-medium text-gray-700">
                  Data de Emissão
                </label>
                <input
                  type="date"
                  id="issueDate"
                  {...register('issueDate', { required: 'Data de emissão é obrigatória' })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Dados do Serviço
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="serviceCode" className="block text-sm font-medium text-gray-700">
                  Código do Serviço
                </label>
                <input
                  type="text"
                  id="serviceCode"
                  {...register('serviceCode', { required: 'Código do serviço é obrigatório' })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Ex: 1.01"
                />
                {errors.serviceCode && (
                  <p className="mt-1 text-sm text-red-600">{errors.serviceCode.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="cnae" className="block text-sm font-medium text-gray-700">
                  CNAE (Opcional)
                </label>
                <input
                  type="text"
                  id="cnae"
                  {...register('cnae')}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Ex: 6201-5/00"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="serviceDescription" className="block text-sm font-medium text-gray-700">
                  Descrição do Serviço
                </label>
                <textarea
                  id="serviceDescription"
                  rows={3}
                  {...register('serviceDescription', { required: 'Descrição do serviço é obrigatória' })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Descreva o serviço prestado..."
                />
                {errors.serviceDescription && (
                  <p className="mt-1 text-sm text-red-600">{errors.serviceDescription.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Valores */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Valores
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label htmlFor="serviceAmount" className="block text-sm font-medium text-gray-700">
                  Valor do Serviço (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  id="serviceAmount"
                  {...register('serviceAmount', {
                    required: 'Valor do serviço é obrigatório',
                    min: { value: 0.01, message: 'Valor deve ser maior que zero' }
                  })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="0.00"
                />
                {errors.serviceAmount && (
                  <p className="mt-1 text-sm text-red-600">{errors.serviceAmount.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="deductionsAmount" className="block text-sm font-medium text-gray-700">
                  Deduções (R$) - Opcional
                </label>
                <input
                  type="number"
                  step="0.01"
                  id="deductionsAmount"
                  {...register('deductionsAmount', {
                    min: { value: 0, message: 'Valor não pode ser negativo' }
                  })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="0.00"
                />
                {errors.deductionsAmount && (
                  <p className="mt-1 text-sm text-red-600">{errors.deductionsAmount.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700">
                  Alíquota (%)
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
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="0.00"
                />
                {errors.taxRate && (
                  <p className="mt-1 text-sm text-red-600">{errors.taxRate.message}</p>
                )}
              </div>
            </div>

            <div className="mt-4">
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
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Prestador do Serviço
            </h3>

            <div className="mb-4">
              <label htmlFor="supplierSelect" className="block text-sm font-medium text-gray-700 mb-2">
                Selecionar Fornecedor Cadastrado
              </label>
              <select
                id="supplierSelect"
                onChange={(e) => handleSupplierSelect(e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Selecione um fornecedor...</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} - {supplier.cnpj}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="providerCnpj" className="block text-sm font-medium text-gray-700">
                CNPJ do Prestador
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
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Tomador do Serviço
            </h3>

            <div className="mb-4">
              <label htmlFor="clientSelect" className="block text-sm font-medium text-gray-700 mb-2">
                Selecionar Cliente Cadastrado
              </label>
              <select
                id="clientSelect"
                onChange={(e) => handleClientSelect(e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Selecione um cliente...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} - {client.document}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">
                  Nome/Razão Social
                </label>
                <input
                  type="text"
                  id="customerName"
                  {...register('customer.name', { required: 'Nome do tomador é obrigatório' })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {errors.customer?.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.customer.name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700">
                  E-mail (Opcional)
                </label>
                <input
                  type="email"
                  id="customerEmail"
                  {...register('customer.email')}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="customerCpf" className="block text-sm font-medium text-gray-700">
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
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="00000000000"
                />
                {errors.customer?.cpf && (
                  <p className="mt-1 text-sm text-red-600">{errors.customer.cpf.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="customerCnpj" className="block text-sm font-medium text-gray-700">
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
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Informações Adicionais
            </h3>
            <div>
              <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-700">
                Observações (Opcional)
              </label>
              <textarea
                id="additionalInfo"
                rows={3}
                {...register('additionalInfo')}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Informações adicionais sobre o serviço..."
              />
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => reset()}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Limpar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Emitindo...' : 'Emitir NFS-e'}
          </button>
        </div>
      </form>
    </div>
  );
}

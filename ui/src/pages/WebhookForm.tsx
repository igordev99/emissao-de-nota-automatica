import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { webhooksService } from '../services/webhooks';
import type { CreateWebhookData } from '../services/webhooks';

interface WebhookFormData extends CreateWebhookData {}

const availableEvents = [
  { value: 'nfse.status_changed', label: 'Mudança de Status NFS-e', description: 'Notificado quando uma NFS-e muda de status (Pendente → Sucesso/Rejeitada)' }
];

export default function WebhookForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<WebhookFormData>();

  const secret = watch('secret');

  useEffect(() => {
    if (isEditing) {
      const loadWebhook = async () => {
        try {
          // Como não temos endpoint para buscar webhook individual, vamos listar todos e encontrar o específico
          const webhooks = await webhooksService.getWebhooks();
          const webhook = webhooks.find(w => w.id === id);

          if (webhook) {
            setValue('url', webhook.url);
            setValue('secret', webhook.secret || '');
            setSelectedEvents(webhook.events);
          } else {
            setError('Webhook não encontrado');
          }
        } catch (error) {
          console.error('Erro ao carregar webhook:', error);
          setError('Erro ao carregar dados do webhook');
        } finally {
          setFetchLoading(false);
        }
      };
      loadWebhook();
    }
  }, [id, isEditing, setValue]);

  const onSubmit = async (data: WebhookFormData) => {
    if (selectedEvents.length === 0) {
      setError('Selecione pelo menos um evento');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const webhookData = {
        ...data,
        events: selectedEvents,
        secret: data.secret || undefined
      };

      if (isEditing) {
        // Para edição, precisamos excluir o webhook atual e criar um novo
        // Como não temos endpoint de update, fazemos delete + create
        await webhooksService.deleteWebhook(id!);
        await webhooksService.createWebhook(webhookData);
      } else {
        await webhooksService.createWebhook(webhookData);
      }
      navigate('/webhooks');
    } catch (error: any) {
      setError(error.response?.data?.message || `Erro ao ${isEditing ? 'atualizar' : 'criar'} webhook`);
    } finally {
      setLoading(false);
    }
  };

  const handleEventToggle = (eventValue: string) => {
    setSelectedEvents(prev =>
      prev.includes(eventValue)
        ? prev.filter(e => e !== eventValue)
        : [...prev, eventValue]
    );
  };

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Editar Webhook' : 'Novo Webhook'}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {isEditing ? 'Atualize as configurações do webhook' : 'Configure um webhook para receber notificações do sistema'}
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Erro
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* URL do Webhook */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Configuração do Webhook
            </h3>
            <div className="space-y-6">
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                  URL do Webhook *
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">https://</span>
                  </div>
                  <input
                    type="url"
                    id="url"
                    {...register('url', {
                      required: 'URL é obrigatória',
                      pattern: {
                        value: /^https?:\/\/.+/,
                        message: 'URL deve começar com http:// ou https://'
                      }
                    })}
                    className="block w-full pl-16 pr-3 py-2 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="seusistema.com/webhook/nfse"
                  />
                </div>
                {errors.url && (
                  <p className="mt-1 text-sm text-red-600">{errors.url.message}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Esta URL receberá as notificações quando eventos ocorrerem no sistema.
                </p>
              </div>

              <div>
                <label htmlFor="secret" className="block text-sm font-medium text-gray-700">
                  Secret (Opcional)
                </label>
                <input
                  type="password"
                  id="secret"
                  {...register('secret')}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="seu-secret-seguro-aqui"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Secret usado para assinar as notificações webhook. Mantenha em segredo.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Eventos */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Eventos para Notificação *
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Selecione quais eventos você deseja receber notificações:
            </p>

            <div className="space-y-3">
              {availableEvents.map((event) => (
                <div key={event.value} className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id={event.value}
                      type="checkbox"
                      checked={selectedEvents.includes(event.value)}
                      onChange={() => handleEventToggle(event.value)}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor={event.value} className="font-medium text-gray-700">
                      {event.label}
                    </label>
                    <p className="text-gray-500">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {selectedEvents.length === 0 && (
              <p className="mt-2 text-sm text-red-600">
                Selecione pelo menos um evento para receber notificações.
              </p>
            )}
          </div>
        </div>

        {/* Exemplo de Payload */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Exemplo de Payload
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Este é um exemplo do payload que será enviado para sua URL:
            </p>

            <pre className="bg-gray-800 text-gray-100 p-4 rounded-md text-xs overflow-x-auto">
{`{
  "event": "nfse.status_changed",
  "invoiceId": "inv_123456789",
  "oldStatus": "PENDING",
  "newStatus": "SUCCESS",
  "nfseNumber": "123456789",
  "verificationCode": "ABC123DEF456",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "metadata": {
    "providerCnpj": "12345678000199",
    "customerDoc": "12345678901",
    "serviceAmount": 1500.00
  }
}`}
            </pre>

            {secret && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">
                  O payload será assinado com o header <code className="bg-gray-200 px-1 rounded">X-Webhook-Signature</code>:
                </p>
                <pre className="bg-gray-800 text-gray-100 p-2 rounded text-xs">
                  X-Webhook-Signature: {btoa(`${secret}:[payload]`)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/webhooks')}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (isEditing ? 'Atualizando...' : 'Criando...') : (isEditing ? 'Atualizar' : 'Criar')}
          </button>
        </div>
      </form>
    </div>
  );
}
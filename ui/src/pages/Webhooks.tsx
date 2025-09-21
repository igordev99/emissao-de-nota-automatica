import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { webhooksService } from '../services/webhooks';
import type { WebhookConfig } from '../services/webhooks';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  GlobeAltIcon,
  KeyIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

export default function Webhooks() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const loadWebhooks = async () => {
    try {
      setLoading(true);
      const data = await webhooksService.getWebhooks();
      setWebhooks(data);
    } catch (error) {
      console.error('Erro ao carregar webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWebhooks();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este webhook?')) return;

    try {
      setDeleteLoading(id);
      await webhooksService.deleteWebhook(id);
      loadWebhooks();
    } catch (error) {
      console.error('Erro ao excluir webhook:', error);
      alert('Erro ao excluir webhook');
    } finally {
      setDeleteLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Webhooks</h1>
            <p className="mt-2 text-sm text-gray-600">
              Gerencie as configurações de webhooks para notificações
            </p>
          </div>
          <Link
            to="/webhooks/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Novo Webhook
          </Link>
        </div>
      </div>

      {/* Lista de webhooks */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : webhooks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <GlobeAltIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum webhook configurado</h3>
              <p className="mt-1 text-sm text-gray-500">
                Comece criando seu primeiro webhook para receber notificações.
              </p>
              <div className="mt-6">
                <Link
                  to="/webhooks/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Criar primeiro webhook
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {webhooks.map((webhook) => (
              <li key={webhook.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <GlobeAltIcon className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <h3 className="text-sm font-medium text-gray-900">
                            {webhook.url}
                          </h3>
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Ativo
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <BoltIcon className="h-4 w-4 mr-1 text-gray-400" />
                              <span>Eventos: {webhook.events.join(', ')}</span>
                            </div>
                            {webhook.secret && (
                              <div className="flex items-center">
                                <KeyIcon className="h-4 w-4 mr-1 text-gray-400" />
                                <span>Secret configurado</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            Criado em {formatDate(webhook.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/webhooks/${webhook.id}/edit`}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="Editar"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(webhook.id)}
                        disabled={deleteLoading === webhook.id}
                        className="text-red-600 hover:text-red-900 p-1 disabled:opacity-50"
                        title="Excluir"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Informações sobre webhooks */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <GlobeAltIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Sobre Webhooks
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Webhooks permitem que seu sistema receba notificações em tempo real sobre mudanças no status das NFS-e.
                Configure uma URL para receber eventos como emissões bem-sucedidas, rejeições e cancelamentos.
              </p>
              <p className="mt-2">
                <strong>Eventos disponíveis:</strong> nfse.status_changed
              </p>
              <p className="mt-1">
                <strong>Segurança:</strong> Configure um secret para validar a autenticidade das notificações via assinatura HMAC.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
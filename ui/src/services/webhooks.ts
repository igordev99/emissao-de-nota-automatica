import api from './api';

export interface WebhookConfig {
  id: string;
  url: string;
  secret?: string;
  events: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookData {
  url: string;
  secret?: string;
  events: string[];
}

export const webhooksService = {
  // Listar webhooks
  async getWebhooks(): Promise<WebhookConfig[]> {
    const response = await api.get('/api/webhooks');
    return response.data;
  },

  // Criar webhook
  async createWebhook(data: CreateWebhookData): Promise<WebhookConfig> {
    const response = await api.post('/api/webhooks', data);
    return response.data;
  },

  // Deletar webhook
  async deleteWebhook(id: string): Promise<void> {
    await api.delete(`/api/webhooks/${id}`);
  }
};
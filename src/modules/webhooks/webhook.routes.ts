import { FastifyInstance } from 'fastify';

import { webhookService } from './webhook.service';

export async function webhookRoutes(app: FastifyInstance) {
  // Registrar webhook
  app.post('/webhooks', async (request, reply) => {
    const { url, secret, events } = request.body as { url: string; secret?: string; events: string[] };

    const webhook = await webhookService.registerWebhook(url, secret, events);

    return reply.status(201).send(webhook);
  });

  // Listar webhooks
  app.get('/webhooks', async (request, reply) => {
    const webhooks = await webhookService.listWebhooks();
    return reply.send(webhooks);
  });

  // Remover webhook
  app.delete('/webhooks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const deleted = await webhookService.deleteWebhook(id);

    if (!deleted) {
      return reply.status(404).send({
        success: false,
        message: 'Webhook não encontrado'
      });
    }

    return reply.send({
      success: true,
      message: 'Webhook removido com sucesso'
    });
  });
}
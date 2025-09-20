import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { webhookService } from './webhook.service';

const registerWebhookSchema = z.object({
  url: z.string().url(),
  secret: z.string().optional(),
  events: z.array(z.string())
});

const webhookIdSchema = z.object({
  id: z.string().uuid()
});

export async function webhookRoutes(app: FastifyInstance) {
  // Registrar webhook
  app.post('/webhooks', {
    schema: {
      description: 'Registrar um novo webhook para notificações',
      tags: ['webhooks'],
      body: registerWebhookSchema
    }
  }, async (request, reply) => {
    const { url, secret, events } = request.body as z.infer<typeof registerWebhookSchema>;

    const webhook = await webhookService.registerWebhook(url, secret, events);

    return reply.status(201).send(webhook);
  });

  // Listar webhooks
  app.get('/webhooks', {
    schema: {
      description: 'Listar todos os webhooks ativos',
      tags: ['webhooks'],
      response: {
        200: z.array(z.object({
          id: z.string(),
          url: z.string(),
          events: z.array(z.string()),
          active: z.boolean(),
          createdAt: z.date(),
          updatedAt: z.date(),
          secret: z.string().optional()
        }))
      }
    }
  }, async (request, reply) => {
    const webhooks = await webhookService.listWebhooks();
    return reply.send(webhooks);
  });

  // Remover webhook
  app.delete('/webhooks/:id', {
    schema: {
      description: 'Remover um webhook',
      tags: ['webhooks'],
      params: webhookIdSchema,
      response: {
        200: z.object({
          success: z.boolean(),
          message: z.string()
        }),
        404: z.object({
          success: z.boolean(),
          message: z.string()
        })
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof webhookIdSchema>;

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
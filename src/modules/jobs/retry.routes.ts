import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { retryService } from './retry.service';

const retryInvoiceSchema = z.object({
  invoiceId: z.string().uuid()
});

export async function retryRoutes(app: FastifyInstance) {
  // Iniciar serviço de retry
  app.post('/jobs/retry/start', {
    schema: {
      description: 'Iniciar o serviço de reprocessamento automático',
      tags: ['jobs'],
      response: {
        200: z.object({
          success: z.boolean(),
          message: z.string()
        }),
        500: z.object({
          success: z.boolean(),
          message: z.string()
        })
      }
    }
  }, async (request, reply) => {
    try {
      await retryService.start();
      return reply.send({
        success: true,
        message: 'Serviço de reprocessamento iniciado'
      });
    } catch (error: any) {
      return (reply as any).status(500).send({
        success: false,
        message: `Erro ao iniciar serviço: ${error.message}`
      });
    }
  });

  // Parar serviço de retry
  app.post('/jobs/retry/stop', {
    schema: {
      description: 'Parar o serviço de reprocessamento automático',
      tags: ['jobs'],
      response: {
        200: z.object({
          success: z.boolean(),
          message: z.string()
        })
      }
    }
  }, async (request, reply) => {
    try {
      await retryService.stop();
      return reply.send({
        success: true,
        message: 'Serviço de reprocessamento parado'
      });
    } catch (error: any) {
      return (reply as any).status(500).send({
        success: false,
        message: `Erro ao parar serviço: ${error.message}`
      });
    }
  });

  // Retry manual de uma invoice específica
  app.post('/jobs/retry/invoice', {
    schema: {
      description: 'Reprocessar manualmente uma invoice pendente',
      tags: ['jobs'],
      body: retryInvoiceSchema,
      response: {
        200: z.object({
          success: z.boolean(),
          message: z.string()
        }),
        404: z.object({
          success: z.boolean(),
          message: z.string()
        }),
        400: z.object({
          success: z.boolean(),
          message: z.string()
        }),
        500: z.object({
          success: z.boolean(),
          message: z.string()
        })
      }
    }
  }, async (request, reply) => {
    const { invoiceId } = request.body as z.infer<typeof retryInvoiceSchema>;

    try {
      await retryService.retryInvoiceById(invoiceId);
      return reply.send({
        success: true,
        message: 'Invoice reenfileirada para processamento'
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.status(404).send({
          success: false,
          message: 'Invoice não encontrada'
        });
      }
      if (error.message.includes('not PENDING')) {
        return reply.status(400).send({
          success: false,
          message: 'Invoice não está pendente'
        });
      }
      return reply.status(500).send({
        success: false,
        message: `Erro ao reprocessar: ${error.message}`
      });
    }
  });

  // Estatísticas de retry
  app.get('/jobs/retry/stats', {
    schema: {
      description: 'Obter estatísticas do serviço de reprocessamento',
      tags: ['jobs'],
      response: {
        200: z.object({
          pendingCount: z.number(),
          retryableCount: z.number(),
          maxRetriesExceeded: z.number()
        })
      }
    }
  }, async (request, reply) => {
    const stats = await retryService.getRetryStats();
    return reply.send(stats);
  });
}
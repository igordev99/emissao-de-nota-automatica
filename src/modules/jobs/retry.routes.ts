import { FastifyInstance } from 'fastify';

import { retryService } from './retry.service';

export async function retryRoutes(app: FastifyInstance) {
  // Iniciar serviço de retry
  app.post('/jobs/retry/start', async (request, reply) => {
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
  app.post('/jobs/retry/stop', async (request, reply) => {
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
  app.post('/jobs/retry/invoice', async (request, reply) => {
    const { invoiceId } = request.body as { invoiceId: string };

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
  app.get('/jobs/retry/stats', async (request, reply) => {
    const stats = await retryService.getRetryStats();
    return reply.send(stats);
  });
}
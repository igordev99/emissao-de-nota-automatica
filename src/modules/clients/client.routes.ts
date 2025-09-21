import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { clientService, ClientData } from './client.service';

const clientIdSchema = z.object({
  id: z.string().uuid()
});

export async function clientRoutes(app: FastifyInstance) {
  // Criar cliente
  app.post('/clients', {
    schema: {
      description: 'Criar um novo cliente',
      tags: ['clients']
    }
  }, async (request, reply) => {
    const clientData = request.body as ClientData;

    const client = await clientService.createClient(clientData);

    return reply.status(201).send(client);
  });

  // Listar clientes
  app.get('/clients', async (request, reply) => {
    const { page = 1, pageSize = 20, search } = request.query as any;

    const result = await clientService.listClients(page, pageSize, search);
    return reply.send(result);
  });

  // Obter cliente por ID
  app.get('/clients/:id', async (request, reply) => {
    const { id } = request.params as z.infer<typeof clientIdSchema>;

    const client = await clientService.getClient(id);

    if (!client) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Cliente não encontrado'
      });
    }

    return reply.send(client);
  });

  // Obter cliente por documento
  app.get('/clients/document/:document', async (request, reply) => {
    const { document } = request.params as { document: string };

    const client = await clientService.getClientByDocument(document);

    if (!client) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Cliente não encontrado'
      });
    }

    return reply.send(client);
  });

  // Atualizar cliente
  app.put('/clients/:id', async (request, reply) => {
    const { id } = request.params as z.infer<typeof clientIdSchema>;
    const updateData = request.body as Partial<ClientData>;

    const client = await clientService.updateClient(id, updateData);

    if (!client) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Cliente não encontrado'
      });
    }

    return reply.send(client);
  });

  // Remover cliente
  app.delete('/clients/:id', async (request, reply) => {
    const { id } = request.params as z.infer<typeof clientIdSchema>;

    const deleted = await clientService.deleteClient(id);

    if (!deleted) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Cliente não encontrado'
      });
    }

    return reply.send({
      success: true,
      message: 'Cliente removido com sucesso'
    });
  });
}
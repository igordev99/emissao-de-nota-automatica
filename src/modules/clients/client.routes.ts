import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { clientService, ClientData } from './client.service';

const createClientSchema = z.object({
  name: z.string().min(1),
  document: z.string().min(11).max(14),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.object({
    street: z.string(),
    number: z.string(),
    complement: z.string().optional(),
    neighborhood: z.string(),
    city: z.string(),
    state: z.string().length(2),
    zipCode: z.string()
  }).optional()
});

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  document: z.string().min(11).max(14).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.object({
    street: z.string(),
    number: z.string(),
    complement: z.string().optional(),
    neighborhood: z.string(),
    city: z.string(),
    state: z.string().length(2),
    zipCode: z.string()
  }).optional()
});

const clientIdSchema = z.object({
  id: z.string().uuid()
});

const listClientsQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val)).refine(val => val > 0).optional(),
  pageSize: z.string().transform(val => parseInt(val)).refine(val => val > 0 && val <= 100).optional(),
  search: z.string().optional()
});

const clientResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  document: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.any().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

const clientsListResponseSchema = z.object({
  items: z.array(clientResponseSchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number()
});

const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string()
});

const successResponseSchema = z.object({
  success: z.boolean(),
  message: z.string()
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
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

import { clientService, ClientData } from './client.service';

const clientIdSchema = z.object({
  id: z.string().uuid()
});

const createClientSchema = z.object({
  name: z.string().min(1),
  document: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.object({
    street: z.string().min(1),
    number: z.string().min(1),
    complement: z.string().optional(),
    neighborhood: z.string().min(1),
    city: z.string().min(1),
    state: z.string().length(2),
    zipCode: z.string().min(8)
  }).optional()
});

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  document: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.object({
    street: z.string().min(1),
    number: z.string().min(1),
    complement: z.string().optional(),
    neighborhood: z.string().min(1),
    city: z.string().min(1),
    state: z.string().length(2),
    zipCode: z.string().min(8)
  }).optional()
});

const extractUpholdSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const listClientsQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val)).optional(),
  pageSize: z.string().transform(val => parseInt(val)).optional(),
  search: z.string().optional()
});

const execFileAsync = promisify(execFile);

export async function clientRoutes(app: FastifyInstance) {
  // Criar cliente
  app.post('/clients', async (request, reply) => {
    const clientData = request.body as ClientData;

    // Validar entrada
    const validation = createClientSchema.safeParse(clientData);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Dados inválidos',
        details: validation.error.issues
      });
    }

    const client = await clientService.createClient(clientData);

    return reply.status(201).send(client);
  });

  // Listar clientes
  app.get('/clients', async (request, reply) => {
    const { page = 1, pageSize = 20, search } = request.query as z.infer<typeof listClientsQuerySchema>;

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

    // Validar entrada
    const validation = updateClientSchema.safeParse(updateData);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Dados inválidos',
        details: validation.error.issues
      });
    }

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
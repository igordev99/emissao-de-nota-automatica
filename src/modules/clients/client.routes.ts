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

  // Extração automática do Uphold
  app.post('/extract-uphold-clients', async (request, reply) => {
    try {
      const { email, password } = request.body as z.infer<typeof extractUpholdSchema>;

      // Validar entrada
      const validation = extractUpholdSchema.safeParse({ email, password });
      if (!validation.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Email e senha são obrigatórios',
          details: validation.error.issues
        });
      }

      // Caminho para o script de extração
      const scriptPath = path.resolve(process.cwd(), 'scripts', 'extract-clientes-focused.js');
      
      // Verificar se o script existe
      try {
        await fs.access(scriptPath);
      } catch {
        return reply.status(500).send({
          error: 'SCRIPT_NOT_FOUND',
          message: 'Script de extração não encontrado'
        });
      }

      // Executar o script Puppeteer
      const { stdout, stderr } = await execFileAsync('node', [scriptPath], {
        env: {
          ...process.env,
          UPHOLD_EMAIL: email,
          UPHOLD_PASSWORD: password
        },
        timeout: 60000 // 1 minuto timeout
      });

      if (stderr) {
        app.log.warn({ stderr }, 'Script stderr output');
      }

      // Tentar parsear o resultado
      let extractedData;
      try {
        // O script pode retornar múltiplas linhas, pegar a última que contém o JSON
        const lines = stdout.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        extractedData = JSON.parse(lastLine);
      } catch (parseError) {
        app.log.error(`Failed to parse extraction result: stdout=${stdout}, stderr=${stderr}, error=${parseError}`);
        return reply.status(500).send({
          error: 'PARSE_ERROR',
          message: 'Erro ao processar dados extraídos',
          debug: stdout
        });
      }

      // Transformar dados para o formato esperado
      const clients = extractedData.clients?.map((client: any) => ({
        nome: client.nome || client.name || '',
        email: client.email || '',
        documento: client.documento || client.document || client.cpfCnpj || '',
        inscricaoMunicipal: client.inscricaoMunicipal || client.inscricao || ''
      })) || [];

      return reply.send({
        success: true,
        message: `${clients.length} clientes extraídos com sucesso`,
        clients,
        extractedAt: new Date().toISOString()
      });

    } catch (error: any) {
      app.log.error('Extraction error:', error);
      
      if (error.code === 'ETIMEDOUT') {
        return reply.status(408).send({
          error: 'TIMEOUT',
          message: 'Tempo limite excedido na extração'
        });
      }

      return reply.status(500).send({
        error: 'EXTRACTION_ERROR',
        message: 'Erro durante a extração dos dados',
        details: error.message
      });
    }
  });
}
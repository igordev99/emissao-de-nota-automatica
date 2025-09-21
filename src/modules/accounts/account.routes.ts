import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { accountService, AccountData } from './account.service';

const accountIdSchema = z.object({
  id: z.string().uuid()
});

const createAccountSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  parentId: z.string().uuid().optional(),
  description: z.string().optional(),
  active: z.boolean().optional()
});

const updateAccountSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']).optional(),
  parentId: z.string().uuid().optional(),
  description: z.string().optional(),
  active: z.boolean().optional()
});

const listAccountsQuerySchema = z.object({
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']).optional(),
  parentId: z.string().uuid().optional(),
  activeOnly: z.string().transform(val => val === 'true').optional(),
  page: z.string().transform(val => parseInt(val)).optional(),
  pageSize: z.string().transform(val => parseInt(val)).optional()
});

const successResponseSchema = z.object({
  success: z.boolean(),
  message: z.string()
});

const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string()
});

export async function accountRoutes(app: FastifyInstance) {
  // Criar conta
  app.post('/accounts', async (request, reply) => {
    const accountData = request.body as AccountData;

    // Validar entrada
    const validation = createAccountSchema.safeParse(accountData);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Dados inválidos',
        details: validation.error.issues
      });
    }

    const account = await accountService.createAccount(accountData);

    return reply.status(201).send(account);
  });

  // Listar contas
  app.get('/accounts', async (request, reply) => {
    const { type, parentId, activeOnly = true, page = 1, pageSize = 20 } = request.query as z.infer<typeof listAccountsQuerySchema>;

    const result = await accountService.listAccounts(type, parentId, activeOnly, page, pageSize);
    return reply.send(result);
  });

  // Obter conta por ID
  app.get('/accounts/:id', async (request, reply) => {
    const { id } = request.params as z.infer<typeof accountIdSchema>;
    const { includeChildren = false } = request.query as { includeChildren?: boolean };

    const account = await accountService.getAccount(id, includeChildren);

    if (!account) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Conta não encontrada'
      });
    }

    return reply.send(account);
  });

  // Obter conta por código
  app.get('/accounts/code/:code', async (request, reply) => {
    const { code } = request.params as { code: string };
    const { includeChildren = false } = request.query as { includeChildren?: boolean };

    const account = await accountService.getAccountByCode(code, includeChildren);

    if (!account) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Conta não encontrada'
      });
    }

    return reply.send(account);
  });

  // Obter hierarquia completa de contas
  app.get('/accounts/hierarchy', async (request, reply) => {
    const hierarchy = await accountService.getAccountHierarchy();
    return reply.send(hierarchy);
  });

  // Atualizar conta
  app.put('/accounts/:id', async (request, reply) => {
    const { id } = request.params as z.infer<typeof accountIdSchema>;
    const updateData = request.body as Partial<AccountData>;

    // Validar entrada
    const validation = updateAccountSchema.safeParse(updateData);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Dados inválidos',
        details: validation.error.issues
      });
    }

    const account = await accountService.updateAccount(id, updateData);

    if (!account) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Conta não encontrada'
      });
    }

    return reply.send(account);
  });

  // Remover conta
  app.delete('/accounts/:id', async (request, reply) => {
    const { id } = request.params as z.infer<typeof accountIdSchema>;

    try {
      const deleted = await accountService.deleteAccount(id);

      if (!deleted) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Conta não encontrada'
        });
      }

      return reply.send({
        success: true,
        message: 'Conta removida com sucesso'
      });
    } catch (error: any) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: error.message
      });
    }
  });
}
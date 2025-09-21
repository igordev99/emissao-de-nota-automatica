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

const accountsListResponseSchema = z.object({
  accounts: z.array(z.object({
    id: z.string().uuid(),
    code: z.string(),
    name: z.string(),
    type: z.string(),
    parentId: z.string().uuid().nullable(),
    description: z.string().nullable(),
    active: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string()
  })),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number()
  })
});

const accountsHierarchyResponseSchema = z.array(z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  type: z.string(),
  parentId: z.string().uuid().nullable(),
  description: z.string().nullable(),
  active: z.boolean(),
  children: z.array(z.any()) // Recursive structure
}));

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
  app.post('/accounts', {
    schema: {
      description: 'Criar uma nova conta',
      tags: ['accounts'],
      body: createAccountSchema
    }
  }, async (request, reply) => {
    const accountData = request.body as AccountData;

    const account = await accountService.createAccount(accountData);

    return reply.status(201).send(account);
  });

  // Listar contas
  app.get('/accounts', {
    schema: {
      description: 'Listar contas',
      tags: ['accounts'],
      querystring: listAccountsQuerySchema,
      response: {
        200: accountsListResponseSchema
      }
    }
  }, async (request, reply) => {
    const { type, parentId, activeOnly = true, page = 1, pageSize = 20 } = request.query as z.infer<typeof listAccountsQuerySchema>;

    const result = await accountService.listAccounts(type, parentId, activeOnly, page, pageSize);
    return reply.send(result);
  });

  // Obter conta por ID
  app.get('/accounts/:id', {
    schema: {
      description: 'Obter conta por ID',
      tags: ['accounts'],
      params: accountIdSchema,
      querystring: z.object({
        includeChildren: z.string().transform(val => val === 'true').optional()
      })
    }
  }, async (request, reply) => {
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
  app.get('/accounts/code/:code', {
    schema: {
      description: 'Obter conta por código',
      tags: ['accounts'],
      params: z.object({
        code: z.string().min(1)
      }),
      querystring: z.object({
        includeChildren: z.string().transform(val => val === 'true').optional()
      })
    }
  }, async (request, reply) => {
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
  app.get('/accounts/hierarchy', {
    schema: {
      description: 'Obter hierarquia completa de contas',
      tags: ['accounts'],
      response: {
        200: accountsHierarchyResponseSchema
      }
    }
  }, async (request, reply) => {
    const hierarchy = await accountService.getAccountHierarchy();
    return reply.send(hierarchy);
  });

  // Atualizar conta
  app.put('/accounts/:id', {
    schema: {
      description: 'Atualizar conta',
      tags: ['accounts'],
      params: accountIdSchema,
      body: updateAccountSchema
    }
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof accountIdSchema>;
    const updateData = request.body as Partial<AccountData>;

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
  app.delete('/accounts/:id', {
    schema: {
      description: 'Remover conta',
      tags: ['accounts'],
      params: accountIdSchema,
      response: {
        200: successResponseSchema,
        400: errorResponseSchema,
        404: errorResponseSchema
      }
    }
  }, async (request, reply) => {
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
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { AuthError } from '../../core/errors';
import { prisma } from '../../infra/db/prisma';
import { decryptToBase64 } from '../../infra/security/crypto';

import { emitInvoice, getInvoice, cancelInvoiceById, getEmissionStats } from './nfse.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function registerNfseRoutes(app: FastifyInstance<any, any, any, any, any>) {
  const hasSwagger = typeof (app as any).swagger === 'function';
  interface EmitBody {
    rpsNumber?: string; rpsSeries?: string; serviceCode?: string; serviceDescription?: string;
    serviceAmount?: number; taxRate?: number; issRetained?: boolean; provider?: any; customer?: any; [k: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
  type EmitRequest = FastifyRequest<{ Body: EmitBody; Headers: { 'idempotency-key'?: string } }>;
  if (hasSwagger) {
    app.post('/nfse/emitir', {
      schema: {
        tags: ['NFSe'],
        summary: 'Emitir NFS-e',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          additionalProperties: true,
          properties: {
            rpsNumber: { type: 'string', description: 'Número do RPS (opcional; auto numeração se ausente)' },
            rpsSeries: { type: 'string', description: 'Série do RPS' },
            issueDate: { type: 'string', description: 'Data de emissão ISO; default no servidor' },
            serviceCode: { type: 'string', description: 'Código do serviço (ex.: 101)' },
            serviceDescription: { type: 'string', description: 'Descrição do serviço' },
            serviceAmount: { type: 'number', description: 'Valor do serviço' },
            taxRate: { type: 'number', description: 'Alíquota (0.01 = 1%)' },
            issRetained: { type: 'boolean', description: 'ISS retido pelo tomador?' },
            provider: { type: 'object', properties: { cnpj: { type: 'string', description: 'CNPJ do prestador (somente dígitos)' } }, required: ['cnpj'] },
            customer: { type: 'object', properties: { cnpj: { type: 'string' }, cpf: { type: 'string' }, name: { type: 'string' } }, required: ['name'] }
          },
          example: {
            rpsSeries: 'A',
            serviceCode: '101',
            serviceDescription: 'Serviço de teste',
            serviceAmount: 100.5,
            taxRate: 0.02,
            issRetained: false,
            provider: { cnpj: '11111111000111' },
            customer: { cpf: '12345678909', name: 'Cliente Teste' }
          }
        },
        response: {
          200: { type: 'object', properties: { status: { type: 'string' }, id: { type: 'string' }, nfseNumber: { type: 'string' } }, required: ['status','id'] },
          202: { type: 'object', properties: { status: { type: 'string' }, id: { type: 'string' }, nfseNumber: { type: 'string' } }, required: ['status','id'] },
          400: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' }, code: { type: 'string' }, details: {} }, required: ['message'] } }, required: ['error'] } as any,
          422: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' }, code: { type: 'string' }, details: {} }, required: ['message'] } }, required: ['error'] } as any,
          401: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' }, code: { type: 'string' }, details: {} }, required: ['message'] } }, required: ['error'] } as any
        }
      } as any,
      preValidation: async (req: FastifyRequest) => { try { await (req as any).jwtVerify(); } catch { throw new AuthError(); } }
    } as any, async (req: EmitRequest, reply: FastifyReply) => {
      const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
      const result = await emitInvoice(req.body, idempotencyKey);
      return reply.code(result.status === 'PENDING' ? 202 : 200).send(result);
    });
  } else {
    app.post('/nfse/emitir', { preValidation: async (req: FastifyRequest) => { try { await (req as any).jwtVerify(); } catch { throw new AuthError(); } } } as any, async (req: EmitRequest, reply: FastifyReply) => {
      const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
      const result = await emitInvoice(req.body, idempotencyKey);
      return reply.code(result.status === 'PENDING' ? 202 : 200).send(result);
    });
  }

  interface IdParam { id: string }
  type IdRequest = FastifyRequest<{ Params: IdParam }>;
  if (hasSwagger) {
  app.get('/nfse/:id', {
      schema: {
        tags: ['NFSe'],
        summary: 'Consultar NFS-e por ID',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        response: {
          200: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string' }, nfseNumber: { type: 'string' }, verificationCode: { type: 'string' }, cancelReason: { type: 'string' }, canceledAt: { type: 'string' } }, required: ['id','status'] },
          401: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' }, code: { type: 'string' }, details: {} }, required: ['message'] } }, required: ['error'] } as any,
          404: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' }, code: { type: 'string' }, details: {} }, required: ['message'] } }, required: ['error'] } as any,
          422: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' }, code: { type: 'string' }, details: {} }, required: ['message'] } }, required: ['error'] } as any
        }
      } as any,
      preValidation: async (req: FastifyRequest) => { try { await (req as any).jwtVerify(); } catch { throw new AuthError(); } }
    } as any, async (req: IdRequest, reply: FastifyReply) => {
      const id = req.params.id;
      const invoice = await getInvoice(id);
      if (!invoice) return reply.code(404).send({ error: { message: 'Not found' } });
      return reply.send({ id: invoice.id, status: invoice.status, nfseNumber: invoice.nfseNumber, verificationCode: (invoice as any).verificationCode, cancelReason: (invoice as any).cancelReason, canceledAt: (invoice as any).canceledAt ? new Date((invoice as any).canceledAt).toISOString() : undefined });
    });
  } else {
    app.get('/nfse/:id', { preValidation: async (req: FastifyRequest) => { try { await (req as any).jwtVerify(); } catch { throw new AuthError(); } } } as any, async (req: IdRequest, reply: FastifyReply) => {
      const id = req.params.id;
      const invoice = await getInvoice(id);
      if (!invoice) return reply.code(404).send({ error: { message: 'Not found' } });
      return reply.send({ id: invoice.id, status: invoice.status, nfseNumber: invoice.nfseNumber, verificationCode: (invoice as any).verificationCode, cancelReason: (invoice as any).cancelReason, canceledAt: (invoice as any).canceledAt ? new Date((invoice as any).canceledAt).toISOString() : undefined });
    });
  }

  if (hasSwagger) {
    app.get('/nfse/:id/pdf', {
      schema: {
        tags: ['NFSe'],
        summary: 'Obter PDF em base64',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        response: {
          200: { type: 'object', properties: { id: { type: 'string' }, pdfBase64: { type: 'string' } }, required: ['id','pdfBase64'] },
          401: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' }, code: { type: 'string' }, details: {} }, required: ['message'] } }, required: ['error'] } as any,
          404: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' }, code: { type: 'string' }, details: {} }, required: ['message'] } }, required: ['error'] } as any
        }
      } as any,
      preValidation: async (req: FastifyRequest) => { try { await (req as any).jwtVerify(); } catch { throw new AuthError(); } }
    } as any, async (req: IdRequest, reply: FastifyReply) => {
      const id = req.params.id;
      const invoice = await getInvoice(id);
      if (!invoice || !invoice.pdfBase64) return reply.code(404).send({ error: { message: 'PDF not found' } });
      let b64: string;
      try {
        const parsed = JSON.parse(invoice.pdfBase64);
        if (parsed && parsed.v !== undefined) {
          b64 = decryptToBase64(parsed);
        } else {
          b64 = invoice.pdfBase64;
        }
      } catch {
        b64 = invoice.pdfBase64;
      }
      return reply.send({ id: invoice.id, pdfBase64: b64 });
    });
  } else {
    app.get('/nfse/:id/pdf', { preValidation: async (req: FastifyRequest) => { try { await (req as any).jwtVerify(); } catch { throw new AuthError(); } } } as any, async (req: IdRequest, reply: FastifyReply) => {
      const id = req.params.id;
      const invoice = await getInvoice(id);
      if (!invoice || !invoice.pdfBase64) return reply.code(404).send({ error: { message: 'PDF not found' } });
      let b64: string;
      try {
        const parsed = JSON.parse(invoice.pdfBase64);
        if (parsed && parsed.v !== undefined) {
          b64 = decryptToBase64(parsed);
        } else {
          b64 = invoice.pdfBase64;
        }
      } catch {
        b64 = invoice.pdfBase64;
      }
      return reply.send({ id: invoice.id, pdfBase64: b64 });
    });
  }

  if (hasSwagger) {
    app.get('/nfse/:id/xml', {
      schema: {
        tags: ['NFSe'],
        summary: 'Obter XML em base64',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        response: {
          200: { type: 'object', properties: { id: { type: 'string' }, xmlBase64: { type: 'string' } }, required: ['id','xmlBase64'] },
          401: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' }, code: { type: 'string' }, details: {} }, required: ['message'] } }, required: ['error'] } as any,
          404: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' }, code: { type: 'string' }, details: {} }, required: ['message'] } }, required: ['error'] } as any
        }
      } as any,
      preValidation: async (req: FastifyRequest) => { try { await (req as any).jwtVerify(); } catch { throw new AuthError(); } }
    } as any, async (req: IdRequest, reply: FastifyReply) => {
      const id = req.params.id;
      const invoice = await getInvoice(id);
      if (!invoice || !invoice.xmlBase64) return reply.code(404).send({ error: { message: 'XML not found' } });
      let b64: string;
      try {
        const parsed = JSON.parse(invoice.xmlBase64);
        if (parsed && parsed.v !== undefined) {
          b64 = decryptToBase64(parsed);
        } else {
          b64 = invoice.xmlBase64;
        }
      } catch {
        b64 = invoice.xmlBase64;
      }
      return reply.send({ id: invoice.id, xmlBase64: b64 });
    });
  } else {
    app.get('/nfse/:id/xml', { preValidation: async (req: FastifyRequest) => { try { await (req as any).jwtVerify(); } catch { throw new AuthError(); } } } as any, async (req: IdRequest, reply: FastifyReply) => {
      const id = req.params.id;
      const invoice = await getInvoice(id);
      if (!invoice || !invoice.xmlBase64) return reply.code(404).send({ error: { message: 'XML not found' } });
      let b64: string;
      try {
        const parsed = JSON.parse(invoice.xmlBase64);
        if (parsed && parsed.v !== undefined) {
          b64 = decryptToBase64(parsed);
        } else {
          b64 = invoice.xmlBase64;
        }
      } catch {
        b64 = invoice.xmlBase64;
      }
      return reply.send({ id: invoice.id, xmlBase64: b64 });
    });
  }

  // Listagem com filtros e paginação
  if (hasSwagger) {
    app.get('/nfse', {
      schema: {
        tags: ['NFSe'],
        summary: 'Listar NFS-e',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['PENDING','SUCCESS','REJECTED','CANCELLED'], description: 'Filtra por status' },
            providerCnpj: { type: 'string', description: 'CNPJ do prestador' },
            nfseNumber: { type: 'string', description: 'Número da NFS-e' },
            verificationCode: { type: 'string', description: 'Código de verificação' },
            customerDoc: { type: 'string', description: 'Documento do tomador (CPF/CNPJ)' },
            from: { type: 'string', description: 'Data inicial (ISO)' },
            to: { type: 'string', description: 'Data final (ISO)' },
            minAmount: { type: 'number', description: 'Valor mínimo do serviço' },
            maxAmount: { type: 'number', description: 'Valor máximo do serviço' },
            q: { type: 'string', description: 'Busca textual simples em serviceDescription' },
            sortBy: { type: 'string', enum: ['createdAt','issueDate','nfseNumber'], default: 'createdAt', description: 'Campo de ordenação' },
            sortDir: { type: 'string', enum: ['asc','desc'], default: 'desc', description: 'Direção de ordenação' },
            page: { type: 'integer', minimum: 1, default: 1, description: 'Página (1-based)' },
            pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20, description: 'Itens por página' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              pageSize: { type: 'integer' },
              total: { type: 'integer' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    status: { type: 'string' },
                    nfseNumber: { type: 'string' },
                    rpsNumber: { type: 'string' },
                    rpsSeries: { type: 'string' },
                    issueDate: { type: 'string' },
                    providerCnpj: { type: 'string' },
                    customerDoc: { type: 'string' },
                    serviceAmount: { type: 'number' }
                  },
                  required: ['id','status','rpsNumber','rpsSeries','issueDate','providerCnpj','serviceAmount']
                }
              }
            },
            required: ['page','pageSize','total','items']
          },
          401: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' }, code: { type: 'string' }, details: {} }, required: ['message'] } }, required: ['error'] } as any
        }
      } as any,
      preValidation: async (req: FastifyRequest) => { try { await (req as any).jwtVerify(); } catch { throw new AuthError(); } }
  } as any, async (req: FastifyRequest<{ Querystring: { status?: string; providerCnpj?: string; nfseNumber?: string; verificationCode?: string; customerDoc?: string; from?: string; to?: string; minAmount?: number; maxAmount?: number; q?: string; sortBy?: 'createdAt'|'issueDate'|'nfseNumber'; sortDir?: 'asc'|'desc'; page?: number; pageSize?: number } }>, reply: FastifyReply) => {
      const q = req.query;
      const page = Math.max(1, Number(q.page || 1));
      const pageSize = Math.min(100, Math.max(1, Number(q.pageSize || 20)));
      const where: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (q.status) where.status = q.status;
      if (q.providerCnpj) where.providerCnpj = q.providerCnpj;
      if (q.nfseNumber) where.nfseNumber = q.nfseNumber;
      if (q.verificationCode) where.verificationCode = q.verificationCode;
      if (q.customerDoc) where.customerDoc = q.customerDoc;
      if (q.from || q.to) {
        where.issueDate = {};
        if (q.from) (where.issueDate as any).gte = new Date(q.from); // eslint-disable-line @typescript-eslint/no-explicit-any
        if (q.to) (where.issueDate as any).lte = new Date(q.to); // eslint-disable-line @typescript-eslint/no-explicit-any
      }
      if (q.minAmount || q.maxAmount) {
        where.serviceAmount = {};
        if (q.minAmount !== undefined) (where.serviceAmount as any).gte = q.minAmount; // eslint-disable-line @typescript-eslint/no-explicit-any
        if (q.maxAmount !== undefined) (where.serviceAmount as any).lte = q.maxAmount; // eslint-disable-line @typescript-eslint/no-explicit-any
      }
      // Basic contains for serviceDescription (DB adapter may adapt accordingly)
      if (q.q) {
        where.serviceDescription = { contains: q.q } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      }
      const orderField = (q.sortBy || 'createdAt');
      const orderDir = (q.sortDir || 'desc');
      const [total, items] = await Promise.all([
        prisma.invoice.count({ where }) as any,
        prisma.invoice.findMany({
          where,
          orderBy: { [orderField]: orderDir },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: { id: true, status: true, nfseNumber: true, rpsNumber: true, rpsSeries: true, issueDate: true, providerCnpj: true, customerDoc: true, serviceAmount: true }
        }) as any
      ]);
      const mapped = items.map((i: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        ...i,
        issueDate: new Date(i.issueDate).toISOString(),
        serviceAmount: Number(i.serviceAmount)
      }));
      return reply.send({ page, pageSize, total, items: mapped });
    });
  } else {
  app.get('/nfse', { preValidation: async (req: FastifyRequest) => { try { await (req as any).jwtVerify(); } catch { throw new AuthError(); } } } as any, async (req: FastifyRequest<{ Querystring: { status?: string; providerCnpj?: string; nfseNumber?: string; verificationCode?: string; customerDoc?: string; from?: string; to?: string; minAmount?: number; maxAmount?: number; q?: string; sortBy?: 'createdAt'|'issueDate'|'nfseNumber'; sortDir?: 'asc'|'desc'; page?: number; pageSize?: number } }>, reply: FastifyReply) => {
      const q = req.query;
      const page = Math.max(1, Number(q.page || 1));
      const pageSize = Math.min(100, Math.max(1, Number(q.pageSize || 20)));
      const where: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (q.status) where.status = q.status;
      if (q.providerCnpj) where.providerCnpj = q.providerCnpj;
      if (q.nfseNumber) where.nfseNumber = q.nfseNumber;
      if (q.verificationCode) where.verificationCode = q.verificationCode;
      if (q.customerDoc) where.customerDoc = q.customerDoc;
      if (q.from || q.to) {
        where.issueDate = {};
        if (q.from) (where.issueDate as any).gte = new Date(q.from); // eslint-disable-line @typescript-eslint/no-explicit-any
        if (q.to) (where.issueDate as any).lte = new Date(q.to); // eslint-disable-line @typescript-eslint/no-explicit-any
      }
      if (q.minAmount || q.maxAmount) {
        where.serviceAmount = {};
        if (q.minAmount !== undefined) (where.serviceAmount as any).gte = q.minAmount; // eslint-disable-line @typescript-eslint/no-explicit-any
        if (q.maxAmount !== undefined) (where.serviceAmount as any).lte = q.maxAmount; // eslint-disable-line @typescript-eslint/no-explicit-any
      }
      if (q.q) {
        where.serviceDescription = { contains: q.q } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      }
      const orderField = (q.sortBy || 'createdAt');
      const orderDir = (q.sortDir || 'desc');
      const [total, items] = await Promise.all([
        prisma.invoice.count({ where }) as any,
        prisma.invoice.findMany({
          where,
          orderBy: { [orderField]: orderDir },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: { id: true, status: true, nfseNumber: true, rpsNumber: true, rpsSeries: true, issueDate: true, providerCnpj: true, customerDoc: true, serviceAmount: true }
        }) as any
      ]);
      const mapped = items.map((i: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        ...i,
        issueDate: new Date(i.issueDate).toISOString(),
        serviceAmount: Number(i.serviceAmount)
      }));
      return reply.send({ page, pageSize, total, items: mapped });
    });
  }

  // Cancelamento (stub Not Implemented por enquanto)
  if (hasSwagger) {
    app.post('/nfse/:id/cancel', {
      schema: {
        tags: ['NFSe'],
        summary: 'Cancelar NFS-e',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        body: { type: 'object', properties: { reason: { type: 'string', description: 'Motivo do cancelamento', example: 'Duplicidade de emissão' } } },
        response: {
          200: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string' }, canceledAt: { type: 'string' } }, required: ['id','status'] },
          409: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' }, code: { type: 'string', example: 'INVALID_STATE' }, details: {} }, required: ['message'] } }, required: ['error'] } as any,
          401: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' }, code: { type: 'string' }, details: {} }, required: ['message'] } }, required: ['error'] } as any,
          404: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' }, code: { type: 'string' }, details: {} }, required: ['message'] } }, required: ['error'] } as any
        }
      } as any,
      preValidation: async (req: FastifyRequest) => { try { await (req as any).jwtVerify(); } catch { throw new AuthError(); } }
    } as any, async (req: FastifyRequest<{ Params: IdParam; Body: { reason?: string } }>, reply: FastifyReply) => {
      const id = req.params.id;
      const reason = req.body?.reason;
      const result = await cancelInvoiceById(id, reason);
      if (!result) return reply.code(404).send({ error: { message: 'Not found' } });
      return reply.send(result);
    });
  } else {
    app.post('/nfse/:id/cancel', { preValidation: async (req: FastifyRequest) => { try { await (req as any).jwtVerify(); } catch { throw new AuthError(); } } } as any, async (req: FastifyRequest<{ Params: IdParam; Body: { reason?: string } }>, reply: FastifyReply) => {
      const id = req.params.id;
      const reason = req.body?.reason;
      const result = await cancelInvoiceById(id, reason);
      if (!result) return reply.code(404).send({ error: { message: 'Not found' } });
      return reply.send(result);
    });
  }

  // Estatísticas de emissão
  if (hasSwagger) {
    app.get('/nfse/estatisticas', {
      schema: {
        tags: ['NFSe'],
        summary: 'Obter estatísticas de emissão',
        security: [{ bearerAuth: [] }],
        response: {
          200: { type: 'object', properties: { total: { type: 'integer' }, success: { type: 'integer' }, pending: { type: 'integer' }, rejected: { type: 'integer' }, cancelled: { type: 'integer' } }, required: ['total','success','pending','rejected','cancelled'] },
          401: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' }, code: { type: 'string' }, details: {} }, required: ['message'] } }, required: ['error'] } as any
        }
      } as any,
      preValidation: async (req: FastifyRequest) => { try { await (req as any).jwtVerify(); } catch { throw new AuthError(); } }
    } as any, async (req: FastifyRequest, reply: FastifyReply) => {
      const stats = await getEmissionStats();
      return reply.send(stats);
    });
  } else {
    app.get('/nfse/estatisticas', { preValidation: async (req: FastifyRequest) => { try { await (req as any).jwtVerify(); } catch { throw new AuthError(); } } } as any, async (req: FastifyRequest, reply: FastifyReply) => {
      const stats = await getEmissionStats();
      return reply.send(stats);
    });
  }

  // Nova rota: Estatísticas de emissão
  if (hasSwagger) {
    app.get('/nfse/stats', {
      schema: {
        tags: ['NFSe'],
        summary: 'Estatísticas de emissão',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            from: { type: 'string', description: 'Data inicial (ISO)' },
            to: { type: 'string', description: 'Data final (ISO)' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              period: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } } },
              counts: { type: 'object', properties: { total: { type: 'integer' }, success: { type: 'integer' }, pending: { type: 'integer' }, rejected: { type: 'integer' }, cancelled: { type: 'integer' } } },
              totalAmount: { type: 'number' },
              successRate: { type: 'string' }
            }
          }
        }
      } as any }, // eslint-disable-line @typescript-eslint/no-explicit-any
      async (req: FastifyRequest<{ Querystring: { from?: string; to?: string } }>, reply: FastifyReply) => {
        const { from, to } = req.query;
        const fromDate = from ? new Date(from) : undefined;
        const toDate = to ? new Date(to) : undefined;
        const stats = await getEmissionStats(fromDate, toDate);
        return reply.send(stats);
      });
  } else {
    app.get('/nfse/stats', async (req: FastifyRequest<{ Querystring: { from?: string; to?: string } }>, reply: FastifyReply) => {
      const { from, to } = req.query;
      const fromDate = from ? new Date(from) : undefined;
      const toDate = to ? new Date(to) : undefined;
      const stats = await getEmissionStats(fromDate, toDate);
      return reply.send(stats);
    });
  }

  // Endpoint simplificado para tipos de serviço (Uphold integration)
  if (hasSwagger) {
    app.get('/tipos-servico', {
      schema: {
        tags: ['NFSe'],
        summary: 'Listar tipos de serviço do Uphold',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              serviceTypes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    code: { type: 'string' },
                    name: { type: 'string' },
                    issRetido: { type: 'boolean' }
                  }
                }
              },
              total: { type: 'number' },
              extractedAt: { type: 'string' }
            }
          },
          404: { type: 'object', properties: { error: { type: 'string' }, message: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' } } } } }
        }
      } as any,
      preValidation: async (req: FastifyRequest) => { try { await (req as any).jwtVerify(); } catch { throw new AuthError(); } }
    } as any, async (req: FastifyRequest, reply: FastifyReply) => {
      // Delegar para o endpoint do uphold-config
      try {
        const response = await app.inject({
          method: 'GET',
          url: '/api/service-types',
          headers: req.headers
        });
        
        if (response.statusCode === 200) {
          return reply.send(response.json());
        } else {
          return reply.status(response.statusCode).send(response.json());
        }
      } catch (error: any) {
        app.log.error('Error delegating to uphold service-types:', error);
        return reply.status(500).send({
          error: 'DELEGATION_ERROR',
          message: 'Erro ao obter tipos de serviço'
        });
      }
    });
  } else {
    app.get('/tipos-servico', { preValidation: async (req: FastifyRequest) => { try { await (req as any).jwtVerify(); } catch { throw new AuthError(); } } } as any, async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const response = await app.inject({
          method: 'GET',
          url: '/api/service-types',
          headers: req.headers
        });
        
        if (response.statusCode === 200) {
          return reply.send(response.json());
        } else {
          return reply.status(response.statusCode).send(response.json());
        }
      } catch (error: any) {
        app.log.error('Error delegating to uphold service-types:', error);
        return reply.status(500).send({
          error: 'DELEGATION_ERROR',
          message: 'Erro ao obter tipos de serviço'
        });
      }
    });
  }
}

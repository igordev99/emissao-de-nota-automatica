import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { AuthError } from '../../core/errors';
import { prisma } from '../../infra/db/prisma';
import { decryptToBase64 } from '../../infra/security/crypto';

import { emitInvoice, getInvoice, cancelInvoiceById } from './nfse.service';

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
        headers: { type: 'object', properties: { 'idempotency-key': { type: 'string' } } },
        body: {
          type: 'object',
          properties: {
            rpsNumber: { type: 'string' },
            rpsSeries: { type: 'string' },
            issueDate: { type: 'string' },
            serviceCode: { type: 'string' },
            serviceDescription: { type: 'string' },
            serviceAmount: { type: 'number' },
            taxRate: { type: 'number' },
            issRetained: { type: 'boolean' },
            cnae: { type: 'string' },
            deductionsAmount: { type: 'number' },
            provider: { type: 'object', properties: { cnpj: { type: 'string' } }, required: ['cnpj'] },
            customer: { type: 'object', properties: { cpf: { type: 'string' }, cnpj: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' } }, required: ['name'] },
            additionalInfo: { type: 'string' }
          },
          required: ['rpsSeries','issueDate','serviceCode','serviceDescription','serviceAmount','taxRate','issRetained','provider','customer']
        },
        response: {
          200: { type: 'object', properties: { status: { type: 'string' }, id: { type: 'string' }, nfseNumber: { type: 'string' } }, required: ['status','id'] },
          202: { type: 'object', properties: { status: { type: 'string' }, id: { type: 'string' }, nfseNumber: { type: 'string' } }, required: ['status','id'] },
          400: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' }, code: { type: 'string' }, details: {} }, required: ['message'] } }, required: ['error'] } as any,
          422: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' }, code: { type: 'string' }, details: {} }, required: ['message'] } }, required: ['error'] } as any,
          401: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' }, code: { type: 'string' }, details: {} }, required: ['message'] } }, required: ['error'] } as any
        }
      } as any
    } as any, async (req: EmitRequest, reply: FastifyReply) => {
      // Autenticação JWT (simplificada) - futuramente hook global
      try {
        await req.jwtVerify();
      } catch {
        throw new AuthError();
      }
      const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
      const result = await emitInvoice(req.body, idempotencyKey);
      return reply.code(result.status === 'PENDING' ? 202 : 200).send(result);
    });
  } else {
    app.post('/nfse/emitir', async (req: EmitRequest, reply: FastifyReply) => {
      // Autenticação JWT (simplificada) - futuramente hook global
      try {
        await req.jwtVerify();
      } catch {
        throw new AuthError();
      }
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
          200: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string' }, nfseNumber: { type: 'string' } }, required: ['id','status'] },
          401: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' }, code: { type: 'string' }, details: {} }, required: ['message'] } }, required: ['error'] } as any,
          404: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' }, code: { type: 'string' }, details: {} }, required: ['message'] } }, required: ['error'] } as any,
          422: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' }, code: { type: 'string' }, details: {} }, required: ['message'] } }, required: ['error'] } as any
        }
      } as any
    } as any, async (req: IdRequest, reply: FastifyReply) => {
      try { await (req as any).jwtVerify(); } catch { throw new AuthError(); } // eslint-disable-line @typescript-eslint/no-explicit-any
      const id = req.params.id;
      const invoice = await getInvoice(id);
      if (!invoice) return reply.code(404).send({ error: { message: 'Not found' } });
      return reply.send({ id: invoice.id, status: invoice.status, nfseNumber: invoice.nfseNumber });
    });
  } else {
    app.get('/nfse/:id', async (req: IdRequest, reply: FastifyReply) => {
      try { await (req as any).jwtVerify(); } catch { throw new AuthError(); } // eslint-disable-line @typescript-eslint/no-explicit-any
      const id = req.params.id;
      const invoice = await getInvoice(id);
      if (!invoice) return reply.code(404).send({ error: { message: 'Not found' } });
      return reply.send({ id: invoice.id, status: invoice.status, nfseNumber: invoice.nfseNumber });
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
      } as any
    } as any, async (req: IdRequest, reply: FastifyReply) => {
      try { await (req as any).jwtVerify(); } catch { throw new AuthError(); } // eslint-disable-line @typescript-eslint/no-explicit-any
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
    app.get('/nfse/:id/pdf', async (req: IdRequest, reply: FastifyReply) => {
      try { await (req as any).jwtVerify(); } catch { throw new AuthError(); } // eslint-disable-line @typescript-eslint/no-explicit-any
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
      } as any
    } as any, async (req: IdRequest, reply: FastifyReply) => {
      try { await (req as any).jwtVerify(); } catch { throw new AuthError(); } // eslint-disable-line @typescript-eslint/no-explicit-any
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
    app.get('/nfse/:id/xml', async (req: IdRequest, reply: FastifyReply) => {
      try { await (req as any).jwtVerify(); } catch { throw new AuthError(); } // eslint-disable-line @typescript-eslint/no-explicit-any
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
            customerDoc: { type: 'string', description: 'Documento do tomador (CPF/CNPJ)' },
            from: { type: 'string', description: 'Data inicial (ISO)' },
            to: { type: 'string', description: 'Data final (ISO)' },
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
      } as any
  } as any, async (req: FastifyRequest<{ Querystring: { status?: string; providerCnpj?: string; nfseNumber?: string; customerDoc?: string; from?: string; to?: string; page?: number; pageSize?: number } }>, reply: FastifyReply) => {
      try {
        await (req as any).jwtVerify(); // eslint-disable-line @typescript-eslint/no-explicit-any
      } catch {
        throw new AuthError();
      }
      const q = req.query;
      const page = Math.max(1, Number(q.page || 1));
      const pageSize = Math.min(100, Math.max(1, Number(q.pageSize || 20)));
      const where: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (q.status) where.status = q.status;
  if (q.providerCnpj) where.providerCnpj = q.providerCnpj;
  if (q.nfseNumber) where.nfseNumber = q.nfseNumber;
      if (q.customerDoc) where.customerDoc = q.customerDoc;
      if (q.from || q.to) {
        where.issueDate = {};
        if (q.from) (where.issueDate as any).gte = new Date(q.from); // eslint-disable-line @typescript-eslint/no-explicit-any
        if (q.to) (where.issueDate as any).lte = new Date(q.to); // eslint-disable-line @typescript-eslint/no-explicit-any
      }
      const [total, items] = await Promise.all([
        prisma.invoice.count({ where }) as any,
        prisma.invoice.findMany({
          where,
          orderBy: { createdAt: 'desc' },
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
  app.get('/nfse', async (req: FastifyRequest<{ Querystring: { status?: string; providerCnpj?: string; nfseNumber?: string; customerDoc?: string; from?: string; to?: string; page?: number; pageSize?: number } }>, reply: FastifyReply) => {
      try {
        await (req as any).jwtVerify(); // eslint-disable-line @typescript-eslint/no-explicit-any
      } catch {
        throw new AuthError();
      }
      const q = req.query;
      const page = Math.max(1, Number(q.page || 1));
      const pageSize = Math.min(100, Math.max(1, Number(q.pageSize || 20)));
      const where: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (q.status) where.status = q.status;
  if (q.providerCnpj) where.providerCnpj = q.providerCnpj;
  if (q.nfseNumber) where.nfseNumber = q.nfseNumber;
      if (q.customerDoc) where.customerDoc = q.customerDoc;
      if (q.from || q.to) {
        where.issueDate = {};
        if (q.from) (where.issueDate as any).gte = new Date(q.from); // eslint-disable-line @typescript-eslint/no-explicit-any
        if (q.to) (where.issueDate as any).lte = new Date(q.to); // eslint-disable-line @typescript-eslint/no-explicit-any
      }
      const [total, items] = await Promise.all([
        prisma.invoice.count({ where }) as any,
        prisma.invoice.findMany({
          where,
          orderBy: { createdAt: 'desc' },
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
        response: {
          200: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string' } }, required: ['id','status'] },
          401: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' }, code: { type: 'string' }, details: {} }, required: ['message'] } }, required: ['error'] } as any,
          404: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' }, code: { type: 'string' }, details: {} }, required: ['message'] } }, required: ['error'] } as any
        }
      } as any
    } as any, async (req: IdRequest, reply: FastifyReply) => {
      try { await (req as any).jwtVerify(); } catch { throw new AuthError(); } // eslint-disable-line @typescript-eslint/no-explicit-any
      const id = req.params.id;
      const result = await cancelInvoiceById(id);
      if (!result) return reply.code(404).send({ error: { message: 'Not found' } });
      return reply.send(result);
    });
  } else {
    app.post('/nfse/:id/cancel', async (req: IdRequest, reply: FastifyReply) => {
      try { await (req as any).jwtVerify(); } catch { throw new AuthError(); } // eslint-disable-line @typescript-eslint/no-explicit-any
      const id = req.params.id;
      const result = await cancelInvoiceById(id);
      if (!result) return reply.code(404).send({ error: { message: 'Not found' } });
      return reply.send(result);
    });
  }
}

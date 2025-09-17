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
        headers: { $ref: '#/components/schemas/NfseIdempotencyHeaders' },
        body: { $ref: '#/components/schemas/NfseEmitRequest' },
        response: {
          200: { $ref: '#/components/schemas/NfseEmitResponse' },
          202: { $ref: '#/components/schemas/NfseEmitResponse' },
          400: { $ref: '#/components/schemas/ErrorEnvelope' },
          422: { $ref: '#/components/schemas/ErrorEnvelope' },
          401: { $ref: '#/components/schemas/ErrorEnvelope' }
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
        params: { $ref: '#/components/schemas/IdParam' },
        response: {
          200: { $ref: '#/components/schemas/NfseStatusResponse' },
          401: { $ref: '#/components/schemas/ErrorEnvelope' },
          404: { $ref: '#/components/schemas/ErrorEnvelope' },
          422: { $ref: '#/components/schemas/ErrorEnvelope' }
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
        params: { $ref: '#/components/schemas/IdParam' },
        response: {
          200: { $ref: '#/components/schemas/NfsePdfResponse' },
          401: { $ref: '#/components/schemas/ErrorEnvelope' },
          404: { $ref: '#/components/schemas/ErrorEnvelope' }
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
        params: { $ref: '#/components/schemas/IdParam' },
        response: {
          200: { $ref: '#/components/schemas/NfseXmlResponse' },
          401: { $ref: '#/components/schemas/ErrorEnvelope' },
          404: { $ref: '#/components/schemas/ErrorEnvelope' }
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
        querystring: { $ref: '#/components/schemas/NfseListQuery' },
        response: {
          200: { $ref: '#/components/schemas/NfseListResponse' },
          401: { $ref: '#/components/schemas/ErrorEnvelope' }
        }
      } as any
    } as any, async (req: FastifyRequest<{ Querystring: { status?: string; providerCnpj?: string; customerDoc?: string; from?: string; to?: string; page?: number; pageSize?: number } }>, reply: FastifyReply) => {
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
    app.get('/nfse', async (req: FastifyRequest<{ Querystring: { status?: string; providerCnpj?: string; customerDoc?: string; from?: string; to?: string; page?: number; pageSize?: number } }>, reply: FastifyReply) => {
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
        params: { $ref: '#/components/schemas/IdParam' },
        response: {
          200: { $ref: '#/components/schemas/NfseCancelResponse' },
          401: { $ref: '#/components/schemas/ErrorEnvelope' },
          404: { $ref: '#/components/schemas/ErrorEnvelope' }
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

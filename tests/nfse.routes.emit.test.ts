/* eslint-disable @typescript-eslint/no-explicit-any */
import jwt from '@fastify/jwt';
import Fastify from 'fastify';

import { buildLogger } from '../src/infra/logging/logger';
import { registerNfseRoutes } from '../src/modules/nfse/nfse.routes';

// Mock axios para evitar chamadas HTTP reais nos testes
jest.mock('axios');

// Mock Prisma com armazenamento em memória e idempotência
jest.mock('../src/infra/db/prisma', () => {
  const invoices: any[] = [];
  const idempotency: Record<string, any> = {};
  return {
    prisma: {
      invoice: {
        create: jest.fn(async ({ data }: any) => {
          const rec = { ...data, id: 'inv_' + (invoices.length + 1), status: 'PENDING', createdAt: new Date(), updatedAt: new Date() };
          invoices.push(rec);
          return rec;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const idx = invoices.findIndex(i => i.id === where.id);
          invoices[idx] = { ...invoices[idx], ...data, updatedAt: new Date() };
          return invoices[idx];
        }),
        findUnique: jest.fn(async ({ where }: any) => invoices.find(i => i.id === where.id) || null),
        count: jest.fn(async ({ where }: any) => invoices.filter(i => Object.entries(where || {}).every(([k, v]) => i[k] === v)).length),
        findMany: jest.fn(async ({ where, orderBy, skip = 0, take = 20 }: any) => {
          let rows = invoices.filter((i) => {
            if (!where) return true;
            return Object.entries(where).every(([k, v]) => {
              if (k === 'issueDate' && v && (v as any).gte || (v as any).lte) { // eslint-disable-line
                const d = new Date(i.issueDate).getTime();
                const gte = (v as any).gte ? new Date((v as any).gte).getTime() : -Infinity;
                const lte = (v as any).lte ? new Date((v as any).lte).getTime() : Infinity;
                return d >= gte && d <= lte;
              }
              return (i as any)[k] === v; // eslint-disable-line
            });
          });
          if (orderBy && orderBy.createdAt === 'desc') rows = rows.sort((a, b) => b.createdAt - a.createdAt);
          return rows.slice(skip, skip + take).map(i => ({
            id: i.id,
            status: i.status,
            nfseNumber: i.nfseNumber,
            rpsNumber: i.rpsNumber,
            rpsSeries: i.rpsSeries,
            issueDate: i.issueDate,
            providerCnpj: i.providerCnpj,
            customerDoc: i.customerDoc,
            serviceAmount: i.serviceAmount,
          }));
        })
      },
      idempotencyKey: {
        findUnique: jest.fn(async ({ where }: any) => {
          const rec = idempotency[where.key];
          if (!rec) return null;
          const invoice = invoices.find(i => i.id === rec.invoiceId) || null;
          return { ...rec, invoice };
        }),
        create: jest.fn(async ({ data }: any) => { idempotency[data.key] = data; const invoice = invoices.find(i => i.id === data.invoiceId) || null; return { ...data, invoice }; }),
        update: jest.fn(async ({ where, data }: any) => { idempotency[where.key] = { ...idempotency[where.key], ...data }; const rec = idempotency[where.key]; const invoice = invoices.find(i => i.id === rec.invoiceId) || null; return { ...rec, invoice }; })
      },
      webhookConfig: {
        findMany: jest.fn(async () => []),
        findUnique: jest.fn(async () => null),
        create: jest.fn(async () => ({})),
        update: jest.fn(async () => ({})),
        delete: jest.fn(async () => ({}))
      },
      logEntry: { create: jest.fn(async () => undefined) }
    }
  };
});

// Mock do agente para controlar retorno de status
const agent = { mode: 'SUCCESS' as 'SUCCESS' | 'PENDING', nfseNumber: '2025' };
jest.mock('../src/core/agent/agent-client', () => ({
  agentClient: {
    emitInvoice: jest.fn(async () => {
      if (agent.mode === 'PENDING') return { status: 'PENDING' };
      return { status: 'SUCCESS', nfseNumber: agent.nfseNumber };
    }),
    cancelInvoice: jest.fn()
  }
}));

describe('NFSe routes - POST /nfse/emitir', () => {
  function makeApp() {
    const app = Fastify({ logger: buildLogger() });
    app.register(jwt, { secret: 'test' });
    app.decorate('genToken', function () { return (app as any).jwt.sign({ sub: 'u1' }); });
    registerNfseRoutes(app as any);
    return app as any;
  }

  it('returns 401 without bearer token', async () => {
    const app = makeApp();
    await app.ready();
  const r = await app.inject({ method: 'POST', url: '/nfse/emitir', payload: { serviceCode: '101', serviceDescription: 'x', serviceAmount: 1, taxRate: 0.01, issRetained: false, provider: { cnpj: '11111111000111' }, customer: { cnpj: '22222222000122', name: 'Cliente' } } });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('returns 202 when agent responds PENDING', async () => {
    agent.mode = 'PENDING';
    const app = makeApp();
    await app.ready();
    const token = app.genToken();
  const r = await app.inject({ method: 'POST', url: '/nfse/emitir', headers: { authorization: `Bearer ${token}` }, payload: { rpsNumber: '1', rpsSeries: 'A', serviceCode: '101', serviceDescription: 'x', serviceAmount: 1, taxRate: 0.01, issRetained: false, provider: { cnpj: '11111111000111' }, customer: { cnpj: '22222222000122', name: 'Cliente' } } });
    expect(r.statusCode).toBe(202);
    const body = r.json();
    expect(body).toHaveProperty('id');
    expect(body.status).toBe('PENDING');
    await app.close();
  });

  it('returns 200 when agent responds SUCCESS and sets nfseNumber', async () => {
    agent.mode = 'SUCCESS';
    agent.nfseNumber = '9999';
    const app = makeApp();
    await app.ready();
    const token = app.genToken();
  const r = await app.inject({ method: 'POST', url: '/nfse/emitir', headers: { authorization: `Bearer ${token}` }, payload: { rpsNumber: '2', rpsSeries: 'A', serviceCode: '101', serviceDescription: 'x', serviceAmount: 1, taxRate: 0.01, issRetained: false, provider: { cnpj: '11111111000111' }, customer: { cnpj: '22222222000122', name: 'Cliente' } } });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.status).toBe('SUCCESS');
    expect(body.nfseNumber).toBe('9999');
    await app.close();
  });

  it('is idempotent when idempotency-key header is provided', async () => {
    agent.mode = 'SUCCESS';
    const app = makeApp();
    await app.ready();
    const token = app.genToken();
    const headers = { authorization: `Bearer ${token}`, 'idempotency-key': 'idem-123' } as any;

  const r1 = await app.inject({ method: 'POST', url: '/nfse/emitir', headers, payload: { rpsNumber: '3', rpsSeries: 'A', serviceCode: '101', serviceDescription: 'x', serviceAmount: 1, taxRate: 0.01, issRetained: false, provider: { cnpj: '11111111000111' }, customer: { cnpj: '22222222000122', name: 'Cliente' } } });
    const b1 = r1.json();

  const r2 = await app.inject({ method: 'POST', url: '/nfse/emitir', headers, payload: { rpsNumber: '3', rpsSeries: 'A', serviceCode: '101', serviceDescription: 'x', serviceAmount: 1, taxRate: 0.01, issRetained: false, provider: { cnpj: '11111111000111' }, customer: { cnpj: '22222222000122', name: 'Cliente' } } });
    const b2 = r2.json();

    // Sempre deve manter o mesmo status e, quando houver id, deve ser estável
    expect(b1.status).toBe(b2.status);
    if (b1.id && b2.id) {
      expect(b1.id).toBe(b2.id);
    }
    await app.close();
  });

  it('returns 409 when same idempotency-key is reused with a different payload', async () => {
    agent.mode = 'SUCCESS';
    const app = makeApp();
    await app.ready();
    const token = app.genToken();
    const headers = { authorization: `Bearer ${token}`, 'idempotency-key': 'idem-409' } as any;

    const basePayload = { rpsNumber: '30', rpsSeries: 'A', serviceCode: '101', serviceDescription: 'x', serviceAmount: 1, taxRate: 0.01, issRetained: false, provider: { cnpj: '11111111000111' }, customer: { cnpj: '22222222000122', name: 'Cliente' } };

    const r1 = await app.inject({ method: 'POST', url: '/nfse/emitir', headers, payload: basePayload });
    expect(r1.statusCode).toBe(200);

    // Diverge um campo relevante do payload
    const r2 = await app.inject({ method: 'POST', url: '/nfse/emitir', headers, payload: { ...basePayload, serviceAmount: 2 } });
    expect(r2.statusCode).toBe(409);
    await app.close();
  });
});

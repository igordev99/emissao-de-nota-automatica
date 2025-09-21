/* eslint-disable @typescript-eslint/no-explicit-any */
import Fastify from 'fastify';
import jwt from '@fastify/jwt';

import { buildLogger } from '../src/infra/logging/logger';
import { registerNfseRoutes } from '../src/modules/nfse/nfse.routes';

// Mock Prisma with in-memory store
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
        count: jest.fn(async ({ where }: any) => invoices.filter(i => Object.entries(where || {}).every(([k, v]) => (i as any)[k] === v)).length),
        findMany: jest.fn(async ({ where, orderBy, skip = 0, take = 20 }: any) => {
          let rows = invoices.filter((i) => {
            if (!where) return true;
            return Object.entries(where).every(([k, v]) => (i as any)[k] === v);
          });
          if (orderBy && orderBy.createdAt === 'desc') rows = rows.sort((a, b) => (b as any).createdAt - (a as any).createdAt);
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
      logEntry: { create: jest.fn(async () => undefined) }
    }
  };
});

// Mock agent: cancel returns CANCELLED; emit returns SUCCESS
jest.mock('../src/core/agent/agent-client', () => ({
  agentClient: {
    emitInvoice: jest.fn(async () => ({ status: 'SUCCESS', nfseNumber: 'X1' })),
    cancelInvoice: jest.fn(async () => ({ status: 'CANCELLED' }))
  }
}));

describe('NFSe routes - cancel with reason', () => {
  function makeApp() {
    const app = Fastify({ logger: buildLogger() });
    app.register(jwt, { secret: 'test' });
    app.decorate('genToken', function () { return (app as any).jwt.sign({ sub: 'u1' }); });
    registerNfseRoutes(app as any);
    return app as any;
  }

  it('accepts reason and returns canceledAt when cancelled', async () => {
    const app = makeApp();
    await app.ready();
    const token = app.genToken();
    // emit first (provide rpsNumber to avoid findFirst)
  const emit = await app.inject({ method: 'POST', url: '/nfse/emitir', headers: { authorization: `Bearer ${token}` }, payload: { rpsNumber: '10', rpsSeries: 'A', serviceCode: '101', serviceDescription: 'Teste', serviceAmount: 10.5, taxRate: 0.02, issRetained: false, provider: { cnpj: '12345678000100' }, customer: { cpf: '12345678909', name: 'Teste' } } });
    expect([200, 202]).toContain(emit.statusCode);
    const { id } = emit.json();
    expect(id).toBeTruthy();

    const cancel = await app.inject({ method: 'POST', url: `/nfse/${id}/cancel`, headers: { authorization: `Bearer ${token}` }, payload: { reason: 'Duplicidade' } });
    expect(cancel.statusCode).toBe(200);
    const body = cancel.json();
    expect(body.id).toBe(id);
    expect(body.status).toBeDefined();
    if (body.status === 'CANCELLED') {
      expect(typeof body.canceledAt).toBe('string');
    }
    await app.close();
  });
});

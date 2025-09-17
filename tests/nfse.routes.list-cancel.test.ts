/* eslint-disable @typescript-eslint/no-explicit-any */
import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { registerNfseRoutes } from '../src/modules/nfse/nfse.routes';
import { buildLogger } from '../src/infra/logging/logger';

// Mock prisma for listing
jest.mock('../src/infra/db/prisma', () => {
  const items: any[] = [
    { id: 'i1', status: 'SUCCESS', nfseNumber: '100', rpsNumber: '1', rpsSeries: 'A', issueDate: new Date('2024-01-10'), providerCnpj: '11111111000111', customerDoc: '22222222000122', serviceAmount: 100.12 },
    { id: 'i2', status: 'PENDING', nfseNumber: null, rpsNumber: '2', rpsSeries: 'A', issueDate: new Date('2024-02-10'), providerCnpj: '11111111000111', customerDoc: '33333333000133', serviceAmount: 50.00 },
    { id: 'i3', status: 'REJECTED', nfseNumber: null, rpsNumber: '3', rpsSeries: 'B', issueDate: new Date('2024-03-15'), providerCnpj: '99999999000199', customerDoc: '44444444000144', serviceAmount: 75.50 }
  ];
  return {
    prisma: {
      invoice: {
        count: jest.fn(async ({ where }: any) => {
          return items.filter(i =>
            (!where?.status || i.status === where.status) &&
            (!where?.providerCnpj || i.providerCnpj === where.providerCnpj) &&
            (!where?.customerDoc || i.customerDoc === where.customerDoc) &&
            (!where?.issueDate?.gte || new Date(i.issueDate) >= new Date(where.issueDate.gte)) &&
            (!where?.issueDate?.lte || new Date(i.issueDate) <= new Date(where.issueDate.lte))
          ).length;
        }),
        findMany: jest.fn(async ({ where, skip, take }: any) => {
          const filtered = items.filter(i =>
            (!where?.status || i.status === where.status) &&
            (!where?.providerCnpj || i.providerCnpj === where.providerCnpj) &&
            (!where?.customerDoc || i.customerDoc === where.customerDoc) &&
            (!where?.issueDate?.gte || new Date(i.issueDate) >= new Date(where.issueDate.gte)) &&
            (!where?.issueDate?.lte || new Date(i.issueDate) <= new Date(where.issueDate.lte))
          );
          const sliced = filtered.slice(skip || 0, (skip || 0) + (take || filtered.length));
          return sliced;
        }),
        findUnique: jest.fn(async ({ where }: any) => items.find(i => i.id === where.id) || null),
        update: jest.fn(async ({ where, data }: any) => {
          const idx = items.findIndex(i => i.id === where.id);
          if (idx >= 0) items[idx] = { ...items[idx], ...data };
          return items[idx];
        })
      }
    }
  };
});

jest.mock('../src/core/agent/agent-client', () => ({
  agentClient: { cancelInvoice: jest.fn().mockResolvedValue({ status: 'CANCELLED' }) }
}));

describe('NFSe routes - list and cancel', () => {
  function makeApp() {
    const app = Fastify({ logger: buildLogger() });
    app.register(jwt, { secret: 'test' });
    // hook simples para gerar token em testes
    app.addHook('onReady', async () => {});
    app.decorate('genToken', function () {
      return (app as any).jwt.sign({ sub: 'u1' });
    });
    app.addHook('preHandler', async (req: any, res: any) => {
      // nada
    });
    registerNfseRoutes(app as any);
    return app as any;
  }

  it('lists invoices with pagination and filters', async () => {
    const app = makeApp();
    await app.ready();
    const token = app.genToken();
    // first page
    const r = await app.inject({ method: 'GET', url: '/nfse?page=1&pageSize=2&status=SUCCESS', headers: { authorization: `Bearer ${token}` } });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(2);
    expect(body.total).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(body.items)).toBe(true);
    await app.close();
  });

  it('cancel returns 200 with status', async () => {
    const app = makeApp();
    await app.ready();
    const token = app.genToken();
    const r = await app.inject({ method: 'POST', url: '/nfse/i1/cancel', headers: { authorization: `Bearer ${token}` } });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.id).toBe('i1');
    expect(['REJECTED','PENDING','SUCCESS','CANCELLED'].includes(body.status)).toBe(true);
    await app.close();
  });
});

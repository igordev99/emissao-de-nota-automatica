/* eslint-disable @typescript-eslint/no-explicit-any */
import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { registerNfseRoutes } from '../src/modules/nfse/nfse.routes';
import { buildLogger } from '../src/infra/logging/logger';

// Mock prisma minimal para not found e queries
jest.mock('../src/infra/db/prisma', () => {
  return {
    prisma: {
      invoice: {
        findUnique: jest.fn(async ({ where }: any) => null),
        count: jest.fn(async () => 0),
        findMany: jest.fn(async () => [])
      }
    }
  };
});

// Mock agent-client para evitar efeitos colaterais
jest.mock('../src/core/agent/agent-client', () => ({
  agentClient: {
    cancelInvoice: jest.fn().mockResolvedValue({ status: 'CANCELLED' })
  }
}));

describe('NFSe routes - auth (401) and not found (404)', () => {
  function makeApp() {
    const app = Fastify({ logger: buildLogger() });
    app.register(jwt, { secret: 'test' });
    app.addHook('onReady', async () => {});
    app.decorate('genToken', function () {
      return (app as any).jwt.sign({ sub: 'u1' });
    });
    registerNfseRoutes(app as any);
    return app as any;
  }

  it('GET /nfse requires auth (401 when missing)', async () => {
    const app = makeApp();
    await app.ready();
    const r = await app.inject({ method: 'GET', url: '/nfse' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('GET /nfse/:id returns 404 when not found', async () => {
    const app = makeApp();
    await app.ready();
    const token = app.genToken();
    const r = await app.inject({ method: 'GET', url: '/nfse/unknown', headers: { authorization: `Bearer ${token}` } });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('GET /nfse/:id/pdf returns 404 when not found', async () => {
    const app = makeApp();
    await app.ready();
    const token = app.genToken();
    const r = await app.inject({ method: 'GET', url: '/nfse/unknown/pdf', headers: { authorization: `Bearer ${token}` } });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('GET /nfse/:id/xml returns 404 when not found', async () => {
    const app = makeApp();
    await app.ready();
    const token = app.genToken();
    const r = await app.inject({ method: 'GET', url: '/nfse/unknown/xml', headers: { authorization: `Bearer ${token}` } });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('POST /nfse/:id/cancel requires auth (401 when missing)', async () => {
    const app = makeApp();
    await app.ready();
    const r = await app.inject({ method: 'POST', url: '/nfse/any/cancel' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });
});

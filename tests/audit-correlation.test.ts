/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildApp } from '../src/app';
import { prisma } from '../src/infra/db/prisma';

// Mock axios para evitar chamadas HTTP reais nos testes
jest.mock('axios');

// Mock prisma.logEntry.create to capture traceId
jest.mock('../src/infra/db/prisma', () => {
  return {
    prisma: {
      logEntry: {
        create: jest.fn(async ({ data }: any) => data)
      },
      invoice: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'inv_test', status: 'PENDING', rpsNumber: '1' }),
        update: jest.fn().mockResolvedValue({ id: 'inv_test', status: 'SUCCESS' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'inv_test', status: 'SUCCESS' })
      },
      idempotencyKey: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({})
      },
      webhookConfig: {
        findMany: jest.fn(async () => []),
        findUnique: jest.fn(async () => null),
        create: jest.fn(async () => ({})),
        update: jest.fn(async () => ({})),
        delete: jest.fn(async () => ({}))
      },
      $queryRaw: jest.fn().mockResolvedValue(1)
    }
  };
});

jest.mock('../src/core/agent/agent-client', () => ({
  agentClient: { emitInvoice: jest.fn().mockResolvedValue({ status: 'SUCCESS', nfseNumber: '1234' }), cancelInvoice: jest.fn().mockResolvedValue({ status: 'CANCELLED' }) }
}));

describe('Audit correlation id propagation', () => {
  it('includes correlation id in audit log entries', async () => {
    const app = await buildApp();
    await app.ready();
    const tkResp = await app.inject({ method: 'POST', url: '/auth/token', payload: { sub: 'u1' } });
    const token = tkResp.json().token as string;
    const corr = 'corr-test-456';
    const r = await app.inject({ method: 'POST', url: '/nfse/emitir', headers: { authorization: `Bearer ${token}`, 'x-correlation-id': corr }, payload: { rpsSeries: 'A', serviceCode: '101', serviceDescription: 'x', serviceAmount: 1, taxRate: 0.01, issRetained: false, provider: { cnpj: '11111111000111' }, customer: { cnpj: '22222222000122', name: 'Cliente' } } });
    expect(r.statusCode).toBe(200);
    const calls = (prisma.logEntry.create as any).mock.calls as any[];
    const anyWithTrace = calls.find(c => c[0]?.data?.traceId === corr);
    expect(anyWithTrace).toBeTruthy();
    await app.close();
  });
});

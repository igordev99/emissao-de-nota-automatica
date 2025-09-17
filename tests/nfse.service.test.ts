/* eslint-disable @typescript-eslint/no-explicit-any */
import { emitInvoice } from '../src/modules/nfse/nfse.service';

// Mock prisma to avoid real DB connection
jest.mock('../src/infra/db/prisma', () => {
  const invoices: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  const idempotency: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    prisma: {
      invoice: {
        create: jest.fn(async ({ data }: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          const rec = { ...data, id: 'inv_' + (invoices.length + 1), createdAt: new Date(), updatedAt: new Date(), nfseNumber: null };
          invoices.push(rec);
          return rec;
        }),
        update: jest.fn(async ({ where, data }: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          const idx = invoices.findIndex(i => i.id === where.id);
          invoices[idx] = { ...invoices[idx], ...data, updatedAt: new Date() };
          return invoices[idx];
        }),
        findUnique: jest.fn(async ({ where }: any) => invoices.find(i => i.id === where.id) || null)
      },
      idempotencyKey: {
        findUnique: jest.fn(async ({ where }: any) => {
          const rec = idempotency[where.key];
          if (!rec) return null;
          return { ...rec, invoice: invoices.find(i => i.id === rec.invoiceId) || null };
        }),
        create: jest.fn(async ({ data }: any) => { idempotency[data.key] = data; return { ...data, invoice: invoices.find(i => i.id === data.invoiceId) || null }; }),
        update: jest.fn(async ({ where, data }: any) => { idempotency[where.key] = { ...idempotency[where.key], ...data }; const rec = idempotency[where.key]; return { ...rec, invoice: invoices.find(i => i.id === rec.invoiceId) || null }; })
      },
      logEntry: { create: jest.fn(async () => undefined) }
    }
  };
});

jest.mock('../src/core/agent/agent-client', () => {
  return {
    agentClient: { emitInvoice: jest.fn().mockResolvedValue({ status: 'SUCCESS', nfseNumber: '2024' }) }
  };
});

describe('nfse.service emitInvoice', () => {
  beforeAll(async () => {
    // no setup needed
  });
  it('emits and persists invoice', async () => {
    const result = await emitInvoice({
      rpsNumber: '55',
      rpsSeries: 'B',
      serviceCode: '101',
      serviceDescription: 'Serviço',
      serviceAmount: 200,
      taxRate: 0.03,
      issRetained: false,
      provider: { cnpj: '12345678000199' },
      customer: { cnpj: '99887766000155', name: 'Cliente Teste' }
    }, 'idem-55-B');
    expect(result.status).toBe('SUCCESS');
    expect(result.nfseNumber).toBe('2024');
  });

  it('idempotent second call returns same status', async () => {
    const r1 = await emitInvoice({
      rpsNumber: '90', rpsSeries: 'B', serviceCode: '101', serviceDescription: 'S', serviceAmount: 100, taxRate: 0.03, issRetained: false, provider: { cnpj: '12345678000199' }, customer: { cnpj: '99887766000155', name: 'C' }
    }, 'idem-90-B');
    const r2 = await emitInvoice({
      rpsNumber: '90', rpsSeries: 'B', serviceCode: '101', serviceDescription: 'S', serviceAmount: 100, taxRate: 0.03, issRetained: false, provider: { cnpj: '12345678000199' }, customer: { cnpj: '99887766000155', name: 'C' }
    }, 'idem-90-B');
    expect(r1.id).toBe(r2.id);
  });
});

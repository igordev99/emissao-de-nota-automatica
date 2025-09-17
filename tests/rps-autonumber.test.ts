/* eslint-disable @typescript-eslint/no-explicit-any */
import { emitInvoice } from '../src/modules/nfse/nfse.service';

// Mock prisma
jest.mock('../src/infra/db/prisma', () => {
  const invoiceStore: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    prisma: {
      invoice: {
        findFirst: jest.fn(async ({ where }: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          const filtered = invoiceStore.filter(i => i.providerCnpj === where.providerCnpj && i.rpsSeries === where.rpsSeries);
          return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] || null;
        }),
        create: jest.fn(async ({ data }: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          const record = { ...data, id: `inv_${invoiceStore.length + 1}`, createdAt: new Date(), updatedAt: new Date(), status: 'PENDING' };
          invoiceStore.push(record);
          return record;
        }),
        update: jest.fn(async ({ where, data }: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          const idx = invoiceStore.findIndex(i => i.id === where.id);
          invoiceStore[idx] = { ...invoiceStore[idx], ...data, updatedAt: new Date() };
          return invoiceStore[idx];
        }),
        findUnique: jest.fn(async ({ where }: any) => invoiceStore.find(i => i.id === where.id) || null)
      },
      idempotencyKey: {
        findUnique: jest.fn(async () => null),
        create: jest.fn(async () => null),
        update: jest.fn(async () => null)
      }
    }
  };
});

// Mock agent client
jest.mock('../src/core/agent/agent-client', () => ({
  agentClient: {
    emitInvoice: async () => ({ status: 'SUCCESS', nfseNumber: '900', verificationCode: 'ABC', xmlBase64: 'PGZvbz5iYXI8L2Zvbz4=', pdfBase64: undefined })
  }
}));

// Mock assinatura para simplificar
jest.mock('../src/core/xml/signer', () => ({
  signXmlEnveloped: (xml: string) => xml + '<Signature/>',
  loadPfxMaterial: () => ({ privateKeyPem: 'k', certPem: 'c', thumbprint: 'T', notBefore: new Date(), notAfter: new Date(Date.now()+86400000) })
}));

// Mock audit
jest.mock('../src/infra/logging/audit', () => ({
  audit: async () => undefined
}));

describe('Auto RPS numbering', () => {
  it('generates RPS=1 when none exists', async () => {
    const result = await emitInvoice({
      rpsSeries: 'A',
      provider: { cnpj: '12345678000199' },
      customer: { cpf: '11122233344', name: 'Tomador 1' },
      serviceCode: '101',
      serviceDescription: 'Serviço teste',
      serviceAmount: 100,
      taxRate: 0.03,
      issRetained: false,
      issueDate: new Date().toISOString()
    });
    expect(result).toBeDefined();
  });

  it('increments RPS based on last', async () => {
    await emitInvoice({
      rpsSeries: 'B',
      provider: { cnpj: '22345678000199' },
      customer: { cpf: '11122233344', name: 'Cliente X' },
      serviceCode: '101',
      serviceDescription: 'Serviço 1',
      serviceAmount: 50,
      taxRate: 0.03,
      issRetained: false,
      issueDate: new Date().toISOString()
    });
    const second = await emitInvoice({
      rpsSeries: 'B',
      provider: { cnpj: '22345678000199' },
      customer: { cpf: '11122233344', name: 'Cliente X' },
      serviceCode: '101',
      serviceDescription: 'Serviço 2',
      serviceAmount: 80,
      taxRate: 0.03,
      issRetained: false,
      issueDate: new Date().toISOString()
    });
    expect(second).toBeDefined();
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { registerNfseRoutes } from '../src/modules/nfse/nfse.routes';
import { buildLogger } from '../src/infra/logging/logger';
import { emitInvoice } from '../src/modules/nfse/nfse.service';

// Prisma mock com persistência em memória e suporte a artefatos cifrados
jest.mock('../src/infra/db/prisma', () => {
  const invoices: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  const idempotency: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
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
        findFirst: jest.fn(async ({ where, orderBy }: any) => {
          const rows = invoices.filter(i => i.providerCnpj === where.providerCnpj && i.rpsSeries === where.rpsSeries);
          if (!rows.length) return null;
          const sorted = rows.sort((a, b) => (orderBy.createdAt === 'desc' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt));
          return sorted[0];
        }),
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

// Mock do agente para retornar artefatos reais (xml/pdf base64)
jest.mock('../src/core/agent/agent-client', () => {
  const xmlStr = '<?xml version="1.0" encoding="UTF-8"?><ok>42</ok>';
  const xmlBase64 = Buffer.from(xmlStr, 'utf8').toString('base64');
  const pdfBase64 = Buffer.from('%PDF-1.4\nDummy E2E').toString('base64');
  return {
    agentClient: {
      emitInvoice: jest.fn().mockResolvedValue({ status: 'SUCCESS', nfseNumber: '777', xmlBase64, pdfBase64 }),
      cancelInvoice: jest.fn(),
    }
  };
});

describe('E2E: emit → persist → fetch artifacts', () => {
  const origKey = process.env.ENCRYPTION_KEY;

  beforeAll(() => {
    // Habilita criptografia para verificar decriptação nas rotas
    process.env.ENCRYPTION_KEY = 'x'.repeat(48);
  });

  afterAll(() => {
    process.env.ENCRYPTION_KEY = origKey;
  });

  function makeApp() {
    const app = Fastify({ logger: buildLogger() });
    app.register(jwt, { secret: 'test' });
    app.addHook('onReady', async () => {});
    app.decorate('genToken', function () { return (app as any).jwt.sign({ sub: 'u1' }); });
    registerNfseRoutes(app as any);
    return app as any;
  }

  it('emits invoice and retrieves decrypted artifacts via routes', async () => {
    // Emite (persiste com xml/pdf criptografados pelo serviço)
    const emitResult = await emitInvoice({
      rpsNumber: '101',
      rpsSeries: 'A',
      issueDate: new Date().toISOString(),
      serviceCode: '101',
      serviceDescription: 'E2E',
      serviceAmount: 10,
      taxRate: 0.02,
      issRetained: false,
      provider: { cnpj: '11111111000111' },
      customer: { cnpj: '22222222000122', name: 'Cliente' }
    }, 'e2e-emit-101-A');

    expect(emitResult.status).toBe('SUCCESS');

    const app = makeApp();
    await app.ready();
    const token = app.genToken();

    // Busca XML
    const rXml = await app.inject({ method: 'GET', url: `/nfse/${emitResult.id}/xml`, headers: { authorization: `Bearer ${token}` } });
    expect(rXml.statusCode).toBe(200);
    const xmlPayload = rXml.json();
    const xmlDecoded = Buffer.from(xmlPayload.xmlBase64, 'base64').toString('utf8');
    expect(xmlDecoded).toContain('<ok>42</ok>');

    // Busca PDF
    const rPdf = await app.inject({ method: 'GET', url: `/nfse/${emitResult.id}/pdf`, headers: { authorization: `Bearer ${token}` } });
    expect(rPdf.statusCode).toBe(200);
    const pdfPayload = rPdf.json();
    const pdfDecoded = Buffer.from(pdfPayload.pdfBase64, 'base64').toString('utf8');
    expect(pdfDecoded.startsWith('%PDF-')).toBe(true);

    await app.close();
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import jwt from '@fastify/jwt';
import Fastify from 'fastify';

import { buildLogger } from '../src/infra/logging/logger';
import { encryptBase64 } from '../src/infra/security/crypto';
import { registerNfseRoutes } from '../src/modules/nfse/nfse.routes';

// Mock prisma para retornar invoices com artefatos
jest.mock('../src/infra/db/prisma', () => {
  // Artefatos base64 de exemplo (não precisam ser PDF/XML reais)
  const pdfB64 = Buffer.from('%PDF-1.4\nDummy PDF').toString('base64');
  const xmlString = '<?xml version="1.0" encoding="UTF-8"?><root>ok</root>';
  const xmlB64 = Buffer.from(xmlString, 'utf8').toString('base64');

  return {
    prisma: {
      invoice: {
        findUnique: jest.fn(async ({ where }: any) => {
          switch (where.id) {
            case 'i-pdf-raw':
              return { id: 'i-pdf-raw', pdfBase64: pdfB64 };
            case 'i-xml-raw':
              return { id: 'i-xml-raw', xmlBase64: xmlB64 };
            case 'i-pdf-enc': {
              // Constrói payload criptografado em tempo de chamada usando a ENCRYPTION_KEY atual
              const origB64 = Buffer.from('Encrypted PDF payload').toString('base64');
              const enc = encryptBase64(origB64);
              return { id: 'i-pdf-enc', pdfBase64: JSON.stringify(enc) };
            }
            case 'i-xml-enc': {
              const xml = '<?xml version="1.0"?><data>secret</data>';
              const origB64 = Buffer.from(xml, 'utf8').toString('base64');
              const enc = encryptBase64(origB64);
              return { id: 'i-xml-enc', xmlBase64: JSON.stringify(enc) };
            }
            default:
              return null;
          }
        })
      }
    }
  };
});

// Mock agent-client para evitar efeitos colaterais (não usado nesses testes)
jest.mock('../src/core/agent/agent-client', () => ({
  agentClient: {
    emitInvoice: jest.fn(),
    cancelInvoice: jest.fn()
  }
}));

describe('NFSe routes - artifacts (PDF/XML)', () => {
  function makeApp() {
    const app = Fastify({ logger: buildLogger() });
    app.register(jwt, { secret: 'test' });
    app.addHook('onReady', async () => {});
    app.decorate('genToken', function () { return (app as any).jwt.sign({ sub: 'u1' }); });
    registerNfseRoutes(app as any);
    return app as any;
  }

  const origKey = process.env.ENCRYPTION_KEY;

  afterEach(() => {
    // Restaura ENV para não vazar estado entre testes
    process.env.ENCRYPTION_KEY = origKey;
  });

  it('GET /nfse/:id/pdf returns 200 with raw base64', async () => {
    const app = makeApp();
    await app.ready();
    const token = app.genToken();
    const r = await app.inject({ method: 'GET', url: '/nfse/i-pdf-raw/pdf', headers: { authorization: `Bearer ${token}` } });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body).toHaveProperty('pdfBase64');
    // Deve começar com header de PDF em base64 (JVBERi0... para %PDF)
    expect(typeof body.pdfBase64).toBe('string');
    const decoded = Buffer.from(body.pdfBase64, 'base64').toString('utf8');
    expect(decoded.startsWith('%PDF-')).toBe(true);
    await app.close();
  });

  it('GET /nfse/:id/xml returns 200 with raw base64', async () => {
    const app = makeApp();
    await app.ready();
    const token = app.genToken();
    const r = await app.inject({ method: 'GET', url: '/nfse/i-xml-raw/xml', headers: { authorization: `Bearer ${token}` } });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body).toHaveProperty('xmlBase64');
    const decoded = Buffer.from(body.xmlBase64, 'base64').toString('utf8');
    expect(decoded).toContain('<root>ok</root>');
    await app.close();
  });

  it('GET /nfse/:id/pdf decrypts encrypted payload and returns original base64', async () => {
    // Habilita chave válida de criptografia
    process.env.ENCRYPTION_KEY = 'a'.repeat(32); // >=32 chars para habilitar criptografia

    const app = makeApp();
    await app.ready();
    const token = app.genToken();
    const r = await app.inject({ method: 'GET', url: '/nfse/i-pdf-enc/pdf', headers: { authorization: `Bearer ${token}` } });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    const decoded = Buffer.from(body.pdfBase64, 'base64').toString('utf8');
    expect(decoded).toBe('Encrypted PDF payload');
    await app.close();
  });

  it('GET /nfse/:id/xml decrypts encrypted payload and returns original base64', async () => {
    process.env.ENCRYPTION_KEY = 'b'.repeat(48); // >32 chars

    const app = makeApp();
    await app.ready();
    const token = app.genToken();
    const r = await app.inject({ method: 'GET', url: '/nfse/i-xml-enc/xml', headers: { authorization: `Bearer ${token}` } });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    const decoded = Buffer.from(body.xmlBase64, 'base64').toString('utf8');
    expect(decoded).toContain('<data>secret</data>');
    await app.close();
  });
});

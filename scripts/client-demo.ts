#!/usr/bin/env tsx
import { createNfseClient } from '../src/client';

async function main() {
  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
  const client = createNfseClient({ baseUrl, getToken: async () => {
    // Generate local token using JWT_SECRET default for dev
    const jwt = await import('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'change_this_development_secret_please';
    return jwt.default.sign({ sub: 'dev', roles: ['tester'] }, secret, { expiresIn: '30m' });
  }});

  const payload = {
    rpsSeries: 'A',
    issueDate: new Date().toISOString(),
    serviceCode: '101',
    serviceDescription: 'Client demo',
    serviceAmount: 123.45,
    taxRate: 0.02,
    issRetained: false,
    provider: { cnpj: '11111111000191' },
    customer: { name: 'Cliente Demo', cpf: '12345678909' }
  };

  const emitted = await client.emit(payload, { idempotencyKey: 'client-demo-' + Date.now() });
  console.log('Emitted:', emitted);
  const got = await client.get(emitted.id);
  console.log('Get:', got);
  const list = await client.list({ page: 1, pageSize: 5 });
  console.log('List:', list.total);
  const xml = await client.xml(emitted.id);
  console.log('XML length:', xml.xmlBase64.length);
  const pdf = await client.pdf(emitted.id);
  console.log('PDF length:', pdf.pdfBase64.length);
  const cancelled = await client.cancel(emitted.id, 'Client demo cancel');
  console.log('Cancel:', cancelled.status, cancelled.canceledAt);
}

main().catch((e) => { console.error(e); process.exit(1); });

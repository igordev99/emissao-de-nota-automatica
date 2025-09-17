/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildApp } from '../src/app';

describe('Correlation headers', () => {
  it('propagates x-correlation-id from request to response', async () => {
    const app = await buildApp();
    await app.ready();
    const corr = 'corr-123';
    const r = await app.inject({ method: 'GET', url: '/live', headers: { 'x-correlation-id': corr } });
    expect(r.statusCode).toBe(200);
    expect(r.headers['x-correlation-id']).toBe(corr);
    expect(r.headers['x-trace-id']).toBe(corr);
    await app.close();
  });

  it('generates correlation id when header is absent', async () => {
    const app = await buildApp();
    await app.ready();
    const r = await app.inject({ method: 'GET', url: '/live' });
    expect(r.statusCode).toBe(200);
    expect(r.headers['x-correlation-id']).toBeTruthy();
    expect(r.headers['x-trace-id']).toBeTruthy();
    await app.close();
  });
});

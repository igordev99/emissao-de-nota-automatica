import { buildApp } from '../src/app';

jest.mock('../src/infra/db/prisma', () => ({ prisma: { $queryRaw: jest.fn().mockResolvedValue(1) } }));

describe('readiness', () => {
  it('returns ok when within thresholds and DB ok', async () => {
    process.env.HEALTH_MAX_EVENT_LOOP_LAG_MS = '10000';
    process.env.HEALTH_MAX_HEAP_USED_BYTES = String(10 * 1024 * 1024 * 1024);
    process.env.HEALTH_MAX_RSS_BYTES = String(10 * 1024 * 1024 * 1024);
    process.env.HEALTH_DB_TIMEOUT_MS = '5000';

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('ok');
    await app.close();
  });

  it('degrades when DB times out', async () => {
    // Override prisma mock to never resolve
    jest.resetModules();
    jest.doMock('../src/infra/db/prisma', () => ({ prisma: { $queryRaw: jest.fn(() => new Promise(() => {})) } }));
    process.env.HEALTH_DB_TIMEOUT_MS = '10';

    const { buildApp: buildApp2 } = await import('../src/app');
    const app = await buildApp2();
    const res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('degraded');
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues).toContain('db');
    await app.close();
  });
});

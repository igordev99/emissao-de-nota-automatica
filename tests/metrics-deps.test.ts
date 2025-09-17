import { buildApp } from '../src/app';

jest.mock('../src/infra/db/prisma', () => ({ prisma: { $queryRaw: jest.fn().mockResolvedValue(1) } }));

describe('dependency metrics from readiness', () => {
  it('emits app_ready, db_up and db_ping_seconds after /ready', async () => {
    const app = await buildApp();
    await app.inject({ method: 'GET', url: '/ready' });
    const metrics = await app.inject({ method: 'GET', url: '/metrics' });
    expect(metrics.statusCode).toBe(200);
    const body = metrics.payload as string;
    expect(body).toContain('app_ready');
    expect(body).toContain('db_up');
    expect(body).toContain('db_ping_seconds');
    await app.close();
  });
});

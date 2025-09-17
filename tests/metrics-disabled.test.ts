describe('metrics disabled via METRICS_ENABLED=0', () => {
  it('does not expose /metrics endpoint', async () => {
    const prev = process.env.METRICS_ENABLED;
    process.env.METRICS_ENABLED = '0';
    jest.resetModules();

    const { buildApp } = await import('../src/app');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.statusCode).toBe(404);

    await app.close();

    // restore env
    if (prev === undefined) delete process.env.METRICS_ENABLED; else process.env.METRICS_ENABLED = prev;
    jest.resetModules();
  });
});

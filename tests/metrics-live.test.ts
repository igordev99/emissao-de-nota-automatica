import Fastify from 'fastify';
import { buildLogger } from '../src/infra/logging/logger';
import { registerMetricsHooks, resetMetrics, setAppLive } from '../src/infra/observability/metrics';

function hasLine(text: string, startsWith: string) {
  return text.split(/\r?\n/).some(l => l.startsWith(startsWith));
}

describe('app_live metric', () => {
  it('exposes app_live gauge and route-only histogram', async () => {
    resetMetrics();

    const app = Fastify({ logger: buildLogger(), trustProxy: true });
    registerMetricsHooks(app as any);

    // mark live
    setAppLive(true);

    app.get('/test/:id', async () => ({ ok: true }));

    await app.inject({ method: 'GET', url: '/test/1' });

    const metrics = await app.inject({ method: 'GET', url: '/metrics' });
    expect(metrics.statusCode).toBe(200);
    const body = metrics.payload as string;
    expect(body).toContain('app_live');
    expect(hasLine(body, 'http_request_duration_seconds_by_route_bucket')).toBe(true);
    expect(hasLine(body, 'http_request_duration_seconds_by_route_sum')).toBe(true);
    expect(hasLine(body, 'http_request_duration_seconds_by_route_count')).toBe(true);

    await app.close();
  });
});

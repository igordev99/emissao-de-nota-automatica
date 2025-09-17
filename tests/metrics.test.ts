import Fastify from 'fastify';
import { buildLogger } from '../src/infra/logging/logger';
import { registerMetricsHooks, resetMetrics } from '../src/infra/observability/metrics';

function parseMetrics(text: string) {
  const lines = text.split(/\r?\n/).filter(l => l && !l.startsWith('#'));
  const map = new Map<string, number>();
  for (const l of lines) {
    const parts = l.trim().split(/\s+/);
    const key = parts[0];
    const val = Number(parts[1]);
    if (!Number.isNaN(val)) map.set(key, val);
  }
  return map;
}

describe('metrics', () => {
  it('collects http counters and histograms', async () => {
    resetMetrics();

    const app = Fastify({ logger: buildLogger(), trustProxy: true });
    registerMetricsHooks(app as any);

    app.get('/hello/:id', async () => {
      return { ok: true };
    });

    // hit endpoints
    const r1 = await app.inject({ method: 'GET', url: '/hello/123' });
    expect(r1.statusCode).toBe(200);
    const r2 = await app.inject({ method: 'GET', url: '/health' });
    expect([200, 404]).toContain(r2.statusCode);

    const metrics = await app.inject({ method: 'GET', url: '/metrics' });
    expect(metrics.statusCode).toBe(200);
    const body = metrics.payload;
    const parsed = parseMetrics(body);

    // counters present
    const anyRequests = [...parsed.keys()].some(k => k.startsWith('http_requests_total'));
    expect(anyRequests).toBe(true);

    // histogram present (bucket + sum + count)
    const anyBucket = [...parsed.keys()].some(k => k.startsWith('http_request_duration_seconds_bucket'));
    const anySum = [...parsed.keys()].some(k => k.startsWith('http_request_duration_seconds_sum'));
    const anyCount = [...parsed.keys()].some(k => k.startsWith('http_request_duration_seconds_count'));
    expect(anyBucket && anySum && anyCount).toBe(true);

  // process metric present
  expect([...parsed.keys()].some(k => k === 'process_start_time_seconds')).toBe(true);

    await app.close();
  });
});

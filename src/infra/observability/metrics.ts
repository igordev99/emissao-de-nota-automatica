interface Counter { name: string; help: string; labels?: string[]; values: Record<string, number>; }
interface Gauge { name: string; help: string; labels?: string[]; values: Record<string, number>; }
interface Histogram { name: string; help: string; buckets: number[]; counts: Record<string, number[]>; sum: Record<string, number>; }

const counters: Record<string, Counter> = {};
const histograms: Record<string, Histogram> = {};
const gauges: Record<string, Gauge> = {};

export function resetMetrics() {
  for (const k of Object.keys(counters)) delete counters[k];
  for (const k of Object.keys(histograms)) delete histograms[k];
  for (const k of Object.keys(gauges)) delete gauges[k];
}

// Event loop lag monitor (module-scoped)
let elMonitor: ReturnType<typeof import('perf_hooks').monitorEventLoopDelay> | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { monitorEventLoopDelay } = require('perf_hooks') as typeof import('perf_hooks');
  elMonitor = monitorEventLoopDelay({ resolution: 20 });
  elMonitor.enable();
} catch {
  // ignore if not supported
  /* noop */
}

export function getEventLoopLagSeconds(): { mean: number; max: number } | undefined {
  if (!elMonitor) return undefined;
  return { mean: Number(elMonitor.mean) / 1e9, max: Number(elMonitor.max) / 1e9 };
}

function labelString(labels: Record<string, string>): string {
  const entries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
  return entries.map(([k, v]) => `${k}="${v}"`).join(',');
}

export function incCounter(name: string, help = '', labels: Record<string, string> = {}) {
  const key = labelString(labels);
  if (!counters[name]) counters[name] = { name, help, labels: Object.keys(labels), values: {} };
  counters[name].values[key] = (counters[name].values[key] || 0) + 1;
}

export function setGauge(name: string, help = '', value: number, labels: Record<string, string> = {}) {
  const key = labelString(labels);
  if (!gauges[name]) gauges[name] = { name, help, labels: Object.keys(labels), values: {} };
  gauges[name].values[key] = value;
}

// Helpers for app_ready and db metrics
export function setAppReadiness(ready: boolean) {
  setGauge('app_ready', 'Application readiness (1 ready, 0 not ready)', ready ? 1 : 0);
}
export function setDbStatus(up: boolean) {
  setGauge('db_up', 'Database up (1) or down (0)', up ? 1 : 0);
}
export function observeDbPingSeconds(seconds: number) {
  observeHistogram('db_ping_seconds', 'Database ping latency in seconds', [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2], seconds, {});
}

export function setAppLive(live: boolean) {
  setGauge('app_live', 'Application liveness (1 live, 0 not live)', live ? 1 : 0);
}

export function observeHistogram(name: string, help: string, buckets: number[], value: number, labels: Record<string, string> = {}) {
  const key = labelString(labels);
  if (!histograms[name]) histograms[name] = { name, help, buckets: [...buckets].sort((a, b) => a - b), counts: {}, sum: {} };
  if (!histograms[name].counts[key]) histograms[name].counts[key] = new Array(histograms[name].buckets.length + 1).fill(0);
  if (!histograms[name].sum[key]) histograms[name].sum[key] = 0;
  const idx = histograms[name].buckets.findIndex(b => value <= b);
  const bucketIndex = idx === -1 ? histograms[name].buckets.length : idx;
  histograms[name].counts[key][bucketIndex] += 1;
  histograms[name].sum[key] += value;
}

export function renderPrometheus() {
  const lines: string[] = [];
  // process metrics
  lines.push(`# HELP process_start_time_seconds Start time of the process since unix epoch in seconds.`);
  lines.push(`# TYPE process_start_time_seconds gauge`);
  const startTimeSeconds = Math.floor((Date.now() - process.uptime() * 1000) / 1000);
  lines.push(`process_start_time_seconds ${startTimeSeconds}`);

  lines.push(`# HELP process_resident_memory_bytes Resident memory size in bytes.`);
  lines.push(`# TYPE process_resident_memory_bytes gauge`);
  const mem = process.memoryUsage?.() as NodeJS.MemoryUsage | undefined;
  if (mem && typeof mem.rss === 'number') {
    lines.push(`process_resident_memory_bytes ${mem.rss}`);
  }

  // CPU seconds total (user + system)
  try {
    const cpu = process.cpuUsage();
    const totalMicros = (cpu.user + cpu.system); // microseconds
    const totalSeconds = totalMicros / 1e6;
    lines.push(`# HELP process_cpu_seconds_total Total user and system CPU time spent in seconds.`);
    lines.push(`# TYPE process_cpu_seconds_total counter`);
    lines.push(`process_cpu_seconds_total ${totalSeconds.toFixed(6)}`);
  } catch {
    /* noop */
  }

  // Heap used bytes
  if (mem && typeof mem.heapUsed === 'number') {
    lines.push(`# HELP process_heap_used_bytes Process heap used bytes.`);
    lines.push(`# TYPE process_heap_used_bytes gauge`);
    lines.push(`process_heap_used_bytes ${mem.heapUsed}`);
  }

  // App info
  const appVersion = process.env.npm_package_version || '0.0.0';
  const nodeVersion = process.versions?.node || 'unknown';
  lines.push(`# HELP app_info Application info.`);
  lines.push(`# TYPE app_info gauge`);
  lines.push(`app_info{version="${appVersion}",node_version="${nodeVersion}"} 1`);
  for (const c of Object.values(counters)) {
    lines.push(`# HELP ${c.name} ${c.help}`);
    lines.push(`# TYPE ${c.name} counter`);
    for (const [labelKeyStr, val] of Object.entries(c.values)) {
      const labels = labelKeyStr ? `{${labelKeyStr}}` : '';
      lines.push(`${c.name}${labels} ${val}`);
    }
  }
  for (const g of Object.values(gauges)) {
    lines.push(`# HELP ${g.name} ${g.help}`);
    lines.push(`# TYPE ${g.name} gauge`);
    for (const [labelKeyStr, val] of Object.entries(g.values)) {
      const labels = labelKeyStr ? `{${labelKeyStr}}` : '';
      lines.push(`${g.name}${labels} ${val}`);
    }
  }

  // Event loop lag (seconds) - we expose mean and max when available
  if (elMonitor) {
    const mean = Number(elMonitor.mean) / 1e9;
    const max = Number(elMonitor.max) / 1e9;
    lines.push(`# HELP nodejs_eventloop_lag_seconds Event loop lag in seconds.`);
    lines.push(`# TYPE nodejs_eventloop_lag_seconds gauge`);
    lines.push(`nodejs_eventloop_lag_seconds{stat="mean"} ${mean.toFixed(6)}`);
    lines.push(`nodejs_eventloop_lag_seconds{stat="max"} ${max.toFixed(6)}`);
  }
  for (const h of Object.values(histograms)) {
    lines.push(`# HELP ${h.name} ${h.help}`);
    lines.push(`# TYPE ${h.name} histogram`);
    for (const [labelKeyStr, counts] of Object.entries(h.counts)) {
      const base = labelKeyStr || '';
      let cumulative = 0;
      for (let i = 0; i < h.buckets.length; i++) {
        cumulative += counts[i] || 0;
        const ls = base ? `{${base},le="${h.buckets[i]}"}` : `{le="${h.buckets[i]}"}`;
        lines.push(`${h.name}_bucket${ls} ${cumulative}`);
      }
      cumulative += counts[h.buckets.length] || 0;
      const lsInf = base ? `{${base},le="+Inf"}` : `{le="+Inf"}`;
      lines.push(`${h.name}_bucket${lsInf} ${cumulative}`);
      const labels = base ? `{${base}}` : '';
      const sum = h.sum[labelKeyStr] || 0;
      lines.push(`${h.name}_sum${labels} ${sum}`);
      lines.push(`${h.name}_count${labels} ${cumulative}`);
    }
  }
  return lines.join('\n');
}

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerMetricsHooks(app: FastifyInstance<any, any, any, any, any>) {
  const buckets = [0.05, 0.1, 0.25, 0.5, 1, 2, 5]; // seconds
  app.addHook('onRequest', async (req: FastifyRequest) => {
    (req as any).startTime = process.hrtime.bigint(); // eslint-disable-line @typescript-eslint/no-explicit-any
    const method = (req.method || 'GET').toUpperCase();
    const route = (req as any).routeOptions?.url || (req as any).routerPath || req.url; // eslint-disable-line @typescript-eslint/no-explicit-any
    const keyLabels = { method, route };
    const current = gauges['http_requests_in_flight']?.values[labelString(keyLabels)] || 0;
    setGauge('http_requests_in_flight', 'In-flight HTTP requests', current + 1, keyLabels);
  });
  app.addHook('onResponse', async (req: FastifyRequest, reply: FastifyReply) => {
    const method = (req.method || 'GET').toUpperCase();
    // Try to resolve a stable route pattern to avoid high-cardinality labels
    const route = (req as any).routeOptions?.url || (req as any).routerPath || (reply as any).context?.config?.url || req.url; // eslint-disable-line @typescript-eslint/no-explicit-any
    const status = String(reply.statusCode || 0);
    incCounter('http_requests_total', 'Total HTTP requests', { method, route, status });
    const start = (req as any).startTime as bigint | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (start) {
      const durNs = Number(process.hrtime.bigint() - start);
      const durSec = durNs / 1e9;
      observeHistogram('http_request_duration_seconds', 'HTTP request duration in seconds', buckets, durSec, { method, route, status });
      // Also expose a route-only latency histogram (useful for SLOs without status label)
      observeHistogram('http_request_duration_seconds_by_route', 'HTTP request duration in seconds (by route only)', buckets, durSec, { method, route });
    }
    // decrement in-flight
    const keyLabels = { method, route };
    const current = gauges['http_requests_in_flight']?.values[labelString(keyLabels)] || 1;
    setGauge('http_requests_in_flight', 'In-flight HTTP requests', Math.max(0, current - 1), keyLabels);
  });
  app.get('/metrics', async (_req, reply) => {
    reply.header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return renderPrometheus();
  });
}

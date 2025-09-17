import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';

import { env } from './config/env';
import { loadPfxMaterial } from './core/xml/signer';
import { prisma } from './infra/db/prisma';
import { registerAuth } from './infra/http/auth';
import { errorHandler } from './infra/http/error-handler';
import { buildLogger } from './infra/logging/logger';
import { getEventLoopLagSeconds, observeDbPingSeconds, registerMetricsHooks, setAppReadiness, setDbStatus } from './infra/observability/metrics';
import { registerNfseRoutes } from './modules/nfse/nfse.routes';

export async function buildApp() {
  const app = Fastify({ logger: buildLogger(), trustProxy: true });
  let hasSwagger = false;

  // Plugins base
  try { await app.register(helmet, { global: true }); } catch (e) { app.log.warn({ err: e }, 'Helmet não carregado (possível incompatibilidade de versão)'); }
  try {
    const allowList = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const corsOrigin = allowList.length === 0 ? true : allowList.map(a => a.startsWith('*.') ? new RegExp(`(^|\\.)${escapeRegExp(a.slice(2))}$`) : a);
    await app.register(cors, { origin: corsOrigin });
  } catch (e) { app.log.warn({ err: e }, 'CORS não carregado (possível incompatibilidade de versão)'); }
  try { await app.register(rateLimit, { max: 100, timeWindow: '1 minute' }); } catch (e) { app.log.warn({ err: e }, 'RateLimit não carregado (possível incompatibilidade de versão)'); }
  try { await app.register(jwt, { secret: env.JWT_SECRET }); } catch (e) { app.log.warn({ err: e }, 'JWT não carregado (possível incompatibilidade de versão)'); }

  // Swagger/OpenAPI opcional
  try {
    const swagger = (await import('@fastify/swagger')).default as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const swaggerUI = (await import('@fastify/swagger-ui')).default as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'NFSe SP Service',
          description: 'API para emissão e consulta de NFS-e (São Paulo) com endpoints de saúde e métricas.',
          version: process.env.npm_package_version || '0.0.0'
        },
        components: {
          securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
          schemas: {
            ErrorEnvelope: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' }, code: { type: 'string' }, details: {} }, required: ['message'] } }, required: ['error'], example: { error: { code: 'VALIDATION_ERROR', message: 'Campo obrigatório ausente', details: { path: ['serviceCode'] } } } },
            ErrorSimple: { type: 'object', properties: { error: { type: 'string' }, message: { type: 'string' } }, required: ['error','message'] },
            HealthResponse: { type: 'object', properties: { status: { type: 'string' }, uptime: { type: 'number' }, timestamp: { type: 'string' }, version: { type: 'string' } }, required: ['status','uptime','timestamp','version'] },
            LiveResponse: { type: 'object', properties: { status: { type: 'string' } }, required: ['status'] },
            ReadyResponse: { type: 'object', properties: { status: { type: 'string' }, issues: { type: 'array', items: { type: 'string' } }, timestamp: { type: 'string' } }, required: ['status','issues','timestamp'] },
            VersionResponse: { type: 'object', properties: { version: { type: 'string' } }, required: ['version'] },
            CertHealthResponse: { type: 'object', properties: { loaded: { type: 'boolean' }, error: { type: 'string' }, thumbprint: { type: 'string' }, hasPrivateKey: { type: 'boolean' }, notBefore: { type: 'string' }, notAfter: { type: 'string' }, daysToExpire: { type: 'number' } }, required: ['loaded'] },
            DepsHealthResponse: { type: 'object', properties: { db: { type: 'object', properties: { ok: { type: 'boolean' }, error: { type: 'string' } }, required: ['ok'] }, cert: { $ref: '#/components/schemas/CertHealthResponse' }, status: { type: 'string' }, timestamp: { type: 'string' } }, required: ['db','cert','status','timestamp'] },
            IdParam: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
            NfseEmitRequest: { type: 'object', properties: { rpsNumber: { type: 'string' }, rpsSeries: { type: 'string' }, issueDate: { type: 'string' }, serviceCode: { type: 'string' }, serviceDescription: { type: 'string' }, serviceAmount: { type: 'number' }, taxRate: { type: 'number' }, issRetained: { type: 'boolean' }, cnae: { type: 'string' }, deductionsAmount: { type: 'number' }, provider: { type: 'object', properties: { cnpj: { type: 'string' } }, required: ['cnpj'] }, customer: { type: 'object', properties: { cpf: { type: 'string' }, cnpj: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' } }, required: ['name'] }, additionalInfo: { type: 'string' } }, required: ['rpsSeries','issueDate','serviceCode','serviceDescription','serviceAmount','taxRate','issRetained','provider','customer'], example: { rpsSeries: 'A', issueDate: '2025-09-16T10:00:00.000Z', serviceCode: '101', serviceDescription: 'Serviço de informática', serviceAmount: 150.5, taxRate: 0.02, issRetained: false, provider: { cnpj: '12345678000199' }, customer: { cnpj: '99887766000155', name: 'Cliente Exemplo' } } },
            NfseEmitResponse: { type: 'object', properties: { status: { type: 'string' }, id: { type: 'string' }, nfseNumber: { type: 'string' } }, required: ['status','id'], example: { status: 'SUCCESS', id: 'inv_123', nfseNumber: '2025' } },
            NfseStatusResponse: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string' }, nfseNumber: { type: 'string' } }, required: ['id','status'], example: { id: 'inv_123', status: 'SUCCESS', nfseNumber: '2025' } },
            NfseCancelResponse: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string' } }, required: ['id','status'], example: { id: 'inv_123', status: 'CANCELLED' } },
            NfsePdfResponse: { type: 'object', properties: { id: { type: 'string' }, pdfBase64: { type: 'string' } }, required: ['id','pdfBase64'], example: { id: 'inv_123', pdfBase64: 'JVBERi0xLjQKJc...' } },
            NfseXmlResponse: { type: 'object', properties: { id: { type: 'string' }, xmlBase64: { type: 'string' } }, required: ['id','xmlBase64'], example: { id: 'inv_123', xmlBase64: 'PD94bWwgdmVyc2lvbj0iMS4wIj8+PFJwcz4uLi48L1Jwcz4=' } },
            NfseInvoiceBasic: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string' }, nfseNumber: { type: 'string' }, rpsNumber: { type: 'string' }, rpsSeries: { type: 'string' }, issueDate: { type: 'string' }, providerCnpj: { type: 'string' }, customerDoc: { type: 'string' }, serviceAmount: { type: 'number' } }, required: ['id','status','rpsNumber','rpsSeries','issueDate','providerCnpj','serviceAmount'], example: { id: 'inv_123', status: 'SUCCESS', rpsNumber: '10', rpsSeries: 'A', issueDate: '2025-09-16T10:00:00.000Z', providerCnpj: '12345678000199', customerDoc: '99887766000155', serviceAmount: 150.5 } },
            NfseListResponse: { type: 'object', properties: { page: { type: 'integer' }, pageSize: { type: 'integer' }, total: { type: 'integer' }, items: { type: 'array', items: { $ref: '#/components/schemas/NfseInvoiceBasic' } } }, required: ['page','pageSize','total','items'], example: { page: 1, pageSize: 20, total: 1, items: [{ id: 'inv_123', status: 'SUCCESS', rpsNumber: '10', rpsSeries: 'A', issueDate: '2025-09-16T10:00:00.000Z', providerCnpj: '12345678000199', customerDoc: '99887766000155', serviceAmount: 150.5 }] } },
            NfseListQuery: { type: 'object', properties: { status: { type: 'string', enum: ['PENDING','SUCCESS','REJECTED','CANCELLED'], description: 'Filtra por status' }, providerCnpj: { type: 'string', description: 'CNPJ do prestador' }, customerDoc: { type: 'string', description: 'Documento do tomador (CPF/CNPJ)' }, from: { type: 'string', description: 'Data inicial (ISO)' }, to: { type: 'string', description: 'Data final (ISO)' }, page: { type: 'integer', minimum: 1, default: 1, description: 'Página (1-based)' }, pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20, description: 'Itens por página' } }, example: { status: 'SUCCESS', providerCnpj: '12345678000199', page: 1, pageSize: 20 } },
            NfseIdempotencyHeaders: { type: 'object', properties: { 'idempotency-key': { type: 'string' } } }
          }
        }
      }
    });
    await app.register(swaggerUI, { routePrefix: '/docs', uiConfig: { docExpansion: 'list', deepLinking: true } });
    app.log.info('Swagger UI disponível em /docs');
    hasSwagger = true;
  } catch (e) {
    const isTest = process.env.NODE_ENV === 'test';
    const log = isTest ? app.log.debug.bind(app.log) : app.log.warn.bind(app.log);
    log({ err: e as any }, 'Swagger não carregado (dependência ausente ou incompatível)'); // eslint-disable-line @typescript-eslint/no-explicit-any
    hasSwagger = false;
  }

  app.setErrorHandler(errorHandler);
  app.addHook('onRequest', async (req: any) => { req.log.setBindings({ traceId: req.id }); }); // eslint-disable-line @typescript-eslint/no-explicit-any
  app.addHook('onSend', async (req: any, reply: any, payload: any) => { if (typeof reply.header === 'function') { reply.header('x-trace-id', req.id); } return payload; }); // eslint-disable-line @typescript-eslint/no-explicit-any

  // Exposição opcional do OpenAPI JSON
  try {
    if (typeof (app as any).swagger === 'function') {
      app.get('/openapi.json', { schema: { tags: ['Docs'], summary: 'OpenAPI JSON' } as any }, async () => { return (app as any).swagger(); });
    } else {
      app.get('/openapi.json', async (_req, reply) => reply.code(503).send({ error: 'unavailable', message: 'Swagger não instalado' }));
    }
  } catch {
    /* noop */
  }

  // Rotas de saúde com/sem schema
  if (hasSwagger) {
    app.get('/health', { schema: { tags: ['Health'], summary: 'Health check', response: { 200: { type: 'object', properties: { status: { type: 'string' }, uptime: { type: 'number' }, timestamp: { type: 'string' }, version: { type: 'string' } }, required: ['status','uptime','timestamp','version'] } } } as any }, async () => ({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString(), version: process.env.npm_package_version || '0.0.0' }));
  } else {
    app.get('/health', async () => ({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString(), version: process.env.npm_package_version || '0.0.0' }));
  }
  if (hasSwagger) {
    app.get('/live', { schema: { tags: ['Health'], summary: 'Liveness probe', response: { 200: { type: 'object', properties: { status: { type: 'string' } }, required: ['status'] } } } as any }, async () => ({ status: 'ok' }));
  } else {
    app.get('/live', async () => ({ status: 'ok' }));
  }
  const readinessHandler = async () => {
    const limits = { lagMs: Number(env.HEALTH_MAX_EVENT_LOOP_LAG_MS ?? 200), heapBytes: Number(env.HEALTH_MAX_HEAP_USED_BYTES ?? 1024 * 1024 * 1024), rssBytes: Number(env.HEALTH_MAX_RSS_BYTES ?? 2048 * 1024 * 1024), dbTimeoutMs: Number(env.HEALTH_DB_TIMEOUT_MS ?? 1500) };
    const mem = process.memoryUsage();
    const lag = getEventLoopLagSeconds();
    const lagMs = lag ? lag.mean * 1000 : 0;
    const issues: string[] = [];
    if (lagMs > limits.lagMs) issues.push(`eventloop_lag_ms>${limits.lagMs}`);
    if (mem.heapUsed > limits.heapBytes) issues.push(`heap>${limits.heapBytes}`);
    if (mem.rss > limits.rssBytes) issues.push(`rss>${limits.rssBytes}`);
    try {
      const started = process.hrtime.bigint();
      await Promise.race([ prisma.$queryRaw`SELECT 1` as unknown as Promise<unknown>, new Promise((_, reject) => setTimeout(() => reject(new Error('db_timeout')), limits.dbTimeoutMs)) ]);
      const durSec = Number(process.hrtime.bigint() - started) / 1e9;
      observeDbPingSeconds(durSec);
      setDbStatus(true);
    } catch {
      setDbStatus(false);
      issues.push('db');
    }
    const ok = issues.length === 0;
    setAppReadiness(ok);
    return { status: ok ? 'ok' : 'degraded', issues, timestamp: new Date().toISOString() };
  };
  if (hasSwagger) {
    app.get('/ready', { schema: { tags: ['Health'], summary: 'Readiness probe', response: { 200: { type: 'object', properties: { status: { type: 'string' }, issues: { type: 'array', items: { type: 'string' } }, timestamp: { type: 'string' } }, required: ['status','issues','timestamp'] } } } as any }, readinessHandler);
  } else {
    app.get('/ready', readinessHandler);
  }
  if (hasSwagger) {
    app.get('/version', { schema: { tags: ['Health'], summary: 'Version info', response: { 200: { type: 'object', properties: { version: { type: 'string' } }, required: ['version'] } } } as any }, async () => ({ version: process.env.npm_package_version || '0.0.0' }));
    app.get('/health/cert', { schema: { tags: ['Health'], summary: 'Certificate health info', response: { 200: { type: 'object', properties: { loaded: { type: 'boolean' }, error: { type: 'string' }, thumbprint: { type: 'string' }, hasPrivateKey: { type: 'boolean' }, notBefore: { type: 'string' }, notAfter: { type: 'string' }, daysToExpire: { type: 'number' } }, required: ['loaded'] } } } as any }, async () => {
      try {
        if (!env.CERT_PFX_PATH) throw new Error('CERT_PFX_PATH not set');
        const material = loadPfxMaterial(env.CERT_PFX_PATH!, env.CERT_PFX_PASSWORD);
        const now = new Date();
        const daysToExpire = Math.round((material.notAfter.getTime() - now.getTime()) / 86400000);
        return { thumbprint: material.thumbprint, hasPrivateKey: !!material.privateKeyPem, notBefore: material.notBefore.toISOString(), notAfter: material.notAfter.toISOString(), daysToExpire, loaded: true };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return { loaded: false, error: msg };
      }
    });
  app.get('/health/deps', { schema: { tags: ['Health'], summary: 'Dependencies health (DB and certificate)', response: { 200: { type: 'object', properties: { db: { type: 'object', properties: { ok: { type: 'boolean' }, error: { type: 'string' } }, required: ['ok'] }, cert: { type: 'object', properties: { ok: { type: 'boolean' }, error: { type: 'string' }, thumbprint: { type: 'string' }, notBefore: { type: 'string' }, notAfter: { type: 'string' }, daysToExpire: { type: 'number' } }, required: ['ok'] }, status: { type: 'string' }, timestamp: { type: 'string' } }, required: ['db','cert','status','timestamp'] } } } as any }, async () => {
      const result: { db: { ok: boolean; error?: string }, cert: { ok: boolean; error?: string; thumbprint?: string; notBefore?: string; notAfter?: string; daysToExpire?: number }, status?: string; timestamp?: string } = { db: { ok: false }, cert: { ok: false } };
      try { await prisma.$queryRaw`SELECT 1`; result.db.ok = true; } catch (e: unknown) { result.db.ok = false; result.db.error = e instanceof Error ? e.message : String(e); }
      try {
        if (!env.CERT_PFX_PATH) throw new Error('CERT_PFX_PATH not set');
        const material = loadPfxMaterial(env.CERT_PFX_PATH!, env.CERT_PFX_PASSWORD);
        const now = new Date();
        const daysToExpire = Math.round((material.notAfter.getTime() - now.getTime()) / 86400000);
        result.cert = { ok: true, thumbprint: material.thumbprint, notBefore: material.notBefore.toISOString(), notAfter: material.notAfter.toISOString(), daysToExpire };
      } catch (e: unknown) { result.cert.ok = false; result.cert.error = e instanceof Error ? e.message : String(e); }
      result.status = (result.db.ok && result.cert.ok) ? 'ok' : 'degraded';
      result.timestamp = new Date().toISOString();
      return result;
    });
  } else {
    app.get('/version', async () => ({ version: process.env.npm_package_version || '0.0.0' }));
    app.get('/health/cert', async () => {
      try {
        if (!env.CERT_PFX_PATH) throw new Error('CERT_PFX_PATH not set');
        const material = loadPfxMaterial(env.CERT_PFX_PATH!, env.CERT_PFX_PASSWORD);
        const now = new Date();
        const daysToExpire = Math.round((material.notAfter.getTime() - now.getTime()) / 86400000);
        return { thumbprint: material.thumbprint, hasPrivateKey: !!material.privateKeyPem, notBefore: material.notBefore.toISOString(), notAfter: material.notAfter.toISOString(), daysToExpire, loaded: true };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return { loaded: false, error: msg };
      }
    });
    app.get('/health/deps', async () => {
      const result: { db: { ok: boolean; error?: string }, cert: { ok: boolean; error?: string; thumbprint?: string; notBefore?: string; notAfter?: string; daysToExpire?: number }, status?: string; timestamp?: string } = { db: { ok: false }, cert: { ok: false } };
      try { await prisma.$queryRaw`SELECT 1`; result.db.ok = true; } catch (e: unknown) { result.db.ok = false; result.db.error = e instanceof Error ? e.message : String(e); }
      try {
        if (!env.CERT_PFX_PATH) throw new Error('CERT_PFX_PATH not set');
        const material = loadPfxMaterial(env.CERT_PFX_PATH!, env.CERT_PFX_PASSWORD);
        const now = new Date();
        const daysToExpire = Math.round((material.notAfter.getTime() - now.getTime()) / 86400000);
        result.cert = { ok: true, thumbprint: material.thumbprint, notBefore: material.notBefore.toISOString(), notAfter: material.notAfter.toISOString(), daysToExpire };
      } catch (e: unknown) { result.cert.ok = false; result.cert.error = e instanceof Error ? e.message : String(e); }
      result.status = (result.db.ok && result.cert.ok) ? 'ok' : 'degraded';
      result.timestamp = new Date().toISOString();
      return result;
    });
  }

  await registerAuth(app);
  // Endpoint auxiliar para obter um token de teste (desabilitado em produção)
  try {
    if (process.env.NODE_ENV !== 'production') {
      app.post('/auth/token', { schema: { tags: ['Auth'], summary: 'Obter token de teste (não disponível em produção)' } as any }, async (req: any, reply: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const sub = (req.body && req.body.sub) || 'tester';
        const payload = { sub, roles: ['tester'] };
        const token = (app as any).jwt.sign(payload, { expiresIn: '1h' }); // eslint-disable-line @typescript-eslint/no-explicit-any
        return reply.send({ token });
      });
    }
  } catch {/* noop */}
  if (env.METRICS_ENABLED !== '0') { registerMetricsHooks(app); } else { app.log.debug('Metrics disabled by METRICS_ENABLED=0'); }
  await registerNfseRoutes(app);

  return app;
}

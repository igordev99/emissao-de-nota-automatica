// Lightweight client for the NFSe API with minimal types
// Works in Node 18+ (global fetch). You can inject a custom fetch via options.

export type NfseStatus = 'PENDING' | 'SUCCESS' | 'REJECTED' | 'CANCELLED';

export interface NfseProvider { cnpj: string; municipalRegistration?: string }
export interface NfseCustomerAddress {
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  cityCode?: string;
  state?: string;
  zip?: string;
}
export interface NfseCustomer {
  name: string;
  cpf?: string;
  cnpj?: string;
  email?: string;
  address?: NfseCustomerAddress;
}

export interface NfseEmitRequest {
  rpsNumber?: string;
  rpsSeries: string;
  issueDate: string;
  serviceCode: string;
  serviceDescription: string;
  serviceAmount: number;
  taxRate: number;
  issRetained: boolean;
  cnae?: string;
  deductionsAmount?: number;
  provider: NfseProvider;
  customer: NfseCustomer;
  additionalInfo?: string;
}

export interface NfseEmitResponse { id: string; status: NfseStatus; nfseNumber?: string }
export interface NfseXmlResponse { id: string; xmlBase64: string }
export interface NfsePdfResponse { id: string; pdfBase64: string }
export interface NfseGetResponse { id: string; status: NfseStatus; nfseNumber?: string; canceledAt?: string; cancelReason?: string }

export interface NfseListItem {
  id: string;
  status: NfseStatus;
  nfseNumber?: string;
  rpsNumber: string;
  rpsSeries: string;
  issueDate: string;
  providerCnpj: string;
  customerDoc?: string;
  serviceAmount: number;
}
export interface NfseListResponse { page: number; pageSize: number; total: number; items: NfseListItem[] }

export interface NfseListQuery {
  status?: NfseStatus;
  providerCnpj?: string;
  nfseNumber?: string;
  verificationCode?: string;
  customerDoc?: string;
  from?: string;
  to?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  pageSize?: number;
  sortBy?: 'issueDate' | 'serviceAmount' | 'rpsNumber' | 'nfseNumber';
  sortDir?: 'asc' | 'desc';
}

export interface RetryOptions {
  retries: number; // total attempts = 1 + retries
  minDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number; // multiply delay each retry
  retryOn: (status: number) => boolean; // e.g., 429/5xx
}

export interface CreateClientOptions {
  baseUrl: string;
  token?: string;
  getToken?: () => Promise<string> | string;
  fetchFn?: (input: any, init?: any) => Promise<any>; // typed as any to avoid DOM lib dependency
  defaultTimeoutMs?: number;
  retry?: Partial<RetryOptions>;
  correlationId?: string | (() => string);
  onResponse?: (meta: ResponseMeta) => void | Promise<void>;
}

export interface RequestOverrides {
  timeoutMs?: number;
  retry?: Partial<RetryOptions>;
  correlationId?: string | (() => string);
  onResponse?: (meta: ResponseMeta) => void | Promise<void>;
}

export interface ResponseMeta {
  method: 'GET' | 'POST';
  url: string;
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  correlationId?: string;
}

function toQuery(params: Record<string, unknown>): string {
  const qp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') qp.set(k, String(v));
  const s = qp.toString();
  return s ? `?${s}` : '';
}

async function ensureToken(opts: CreateClientOptions): Promise<string> {
  if (opts.token) return opts.token;
  if (opts.getToken) {
    const t = await opts.getToken();
    if (typeof t !== 'string' || !t) throw new Error('getToken did not return a token');
    return t;
  }
  const envToken = (process as any)?.env?.JWT_TOKEN || (process as any)?.env?.TOKEN || (process as any)?.env?.JWT; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (envToken) return envToken;
  throw new Error('Missing token: pass options.token, options.getToken, or set env JWT_TOKEN');
}

function defaultRetry(): RetryOptions {
  return { retries: 2, minDelayMs: 300, maxDelayMs: 2000, backoffFactor: 2, retryOn: (s) => s === 429 || (s >= 500 && s < 600) };
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function makeCorrelationId(source?: string | (() => string)) {
  if (typeof source === 'string' && source) return source;
  if (typeof source === 'function') {
    try { const v = source(); if (v) return v; } catch { /* ignore */ }
  }
  // Fallback simple generator
  const rnd = Math.random().toString(16).slice(2, 10);
  return `cli-${Date.now().toString(16)}-${rnd}`;
}

async function requestJson<T>(opts: CreateClientOptions, method: 'GET' | 'POST', url: string, body?: unknown, extraHeaders: Record<string, string> = {}, overrides?: RequestOverrides): Promise<T> {
  const token = await ensureToken(opts);
  const fetcher = opts.fetchFn || (globalThis as any).fetch; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (typeof fetcher !== 'function') throw new Error('Global fetch not available. Provide options.fetchFn.');

  const retryCfg = { ...defaultRetry(), ...(opts.retry || {}), ...((overrides && overrides.retry) || {}) } as RetryOptions;
  let delay = retryCfg.minDelayMs;
  const attempts = 1 + Math.max(0, retryCfg.retries);

  let lastErr: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  for (let attempt = 0; attempt < attempts; attempt++) {
  const controller = new AbortController();
  const timeoutMs = overrides?.timeoutMs ?? opts.defaultTimeoutMs ?? 10000;
    const to = setTimeout(() => controller.abort(), timeoutMs);
  const corr = makeCorrelationId(overrides?.correlationId ?? opts.correlationId);
    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${token}`, 'x-correlation-id': corr, ...extraHeaders };
      if (method === 'POST') headers['content-type'] = 'application/json';
      const res = await fetcher(url, { method, headers, body: method === 'POST' ? JSON.stringify(body) : undefined, signal: controller.signal });
      clearTimeout(to);
      // Build response meta and notify callbacks
      const hdrsObj: Record<string, string> = {};
      try { res.headers?.forEach((v: string, k: string) => { hdrsObj[k.toLowerCase()] = v; }); } catch { /* ignore */ }
      const meta: ResponseMeta = { method, url, status: res.status, ok: res.ok, headers: hdrsObj, correlationId: hdrsObj['x-correlation-id'] };
      try { await overrides?.onResponse?.(meta); } catch { /* ignore */ }
      try { await opts.onResponse?.(meta); } catch { /* ignore */ }
      if (!res.ok) {
        let j: any = undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
        try { j = await res.json(); } catch { /* ignore */ }
        const status = res.status;
        if (retryCfg.retryOn(status) && attempt < attempts - 1) {
          await sleep(delay);
          delay = Math.min(retryCfg.maxDelayMs, Math.ceil(delay * retryCfg.backoffFactor));
          continue;
        }
        const msg = j?.error?.message || j?.message || `${status} ${res.statusText}`;
        const code = j?.error?.code || 'HTTP_ERROR';
        const err = new Error(msg) as Error & { code?: string; status?: number; body?: unknown };
        err.code = code; err.status = status; err.body = j; throw err;
      }
      return res.json();
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      clearTimeout(to);
      lastErr = e;
      // AbortError or network error: retry if attempts remain
      const isAbort = e && (e.name === 'AbortError' || e.code === 'ABORT_ERR');
      const isNet = e && (e.name === 'FetchError' || e.code === 'ECONNRESET' || e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT');
      if ((isAbort || isNet) && attempt < attempts - 1) {
        await sleep(delay);
        delay = Math.min(retryCfg.maxDelayMs, Math.ceil(delay * retryCfg.backoffFactor));
        continue;
      }
      throw e;
    }
  }
  throw lastErr || new Error('Unknown client error');
}

async function jsonGet<T>(opts: CreateClientOptions, url: string, overrides?: RequestOverrides): Promise<T> {
  return requestJson<T>(opts, 'GET', url, undefined, {}, overrides);
}

async function jsonPost<T>(opts: CreateClientOptions, url: string, body: unknown, headers: Record<string, string> = {}, overrides?: RequestOverrides): Promise<T> {
  return requestJson<T>(opts, 'POST', url, body, headers, overrides);
}

export function createNfseClient(options: CreateClientOptions) {
  const base = options.baseUrl?.replace(/\/$/, '') || 'http://127.0.0.1:3000';
  return {
    async emit(payload: NfseEmitRequest, opts?: { idempotencyKey?: string } & RequestOverrides): Promise<NfseEmitResponse> {
      const headers: Record<string, string> = {};
      if (opts?.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;
      return jsonPost<NfseEmitResponse>(options, `${base}/nfse/emitir`, payload, headers, opts);
    },
    async get(id: string, overrides?: RequestOverrides): Promise<NfseGetResponse> {
      return jsonGet<NfseGetResponse>(options, `${base}/nfse/${encodeURIComponent(id)}`, overrides);
    },
    async list(query?: NfseListQuery, overrides?: RequestOverrides): Promise<NfseListResponse> {
      const q = query ? toQuery(query as Record<string, unknown>) : '';
      return jsonGet<NfseListResponse>(options, `${base}/nfse${q}`, overrides);
    },
    async xml(id: string, overrides?: RequestOverrides): Promise<NfseXmlResponse> {
      return jsonGet<NfseXmlResponse>(options, `${base}/nfse/${encodeURIComponent(id)}/xml`, overrides);
    },
    async pdf(id: string, overrides?: RequestOverrides): Promise<NfsePdfResponse> {
      return jsonGet<NfsePdfResponse>(options, `${base}/nfse/${encodeURIComponent(id)}/pdf`, overrides);
    },
    async cancel(id: string, reason?: string, overrides?: RequestOverrides): Promise<NfseGetResponse> {
      return jsonPost<NfseGetResponse>(options, `${base}/nfse/${encodeURIComponent(id)}/cancel`, { reason }, {}, overrides);
    }
  };
}

export type NfseClient = ReturnType<typeof createNfseClient>;

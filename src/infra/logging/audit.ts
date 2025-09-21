import { maskDocument } from '../../core/errors';
import { getCorrelationId } from '../context/async-context';
import { prisma } from '../db/prisma';

type AuditContext = Record<string, unknown>;
type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export async function audit(level: 'INFO' | 'ERROR' | 'DEBUG', message: string, ctx?: AuditContext, invoiceId?: string, traceId?: string) {
  try {
  const safeCtx = sanitize(ctx);
    const corr = traceId || getCorrelationId();
    await prisma.logEntry.create({
      data: {
        level,
        message,
        context: safeCtx || undefined,
        invoiceId: invoiceId || undefined,
        traceId: corr
      }
    });
  } catch (err) {
    // fallback silencioso para não quebrar fluxo principal
    // eslint-disable-next-line no-console
    console.error('Audit log failure', err);
  }
}

function sanitize(obj?: AuditContext): Json | undefined {
  if (obj === undefined) return undefined;
  if (obj === null) return null; // preserve nulls if any
  if (Array.isArray(obj)) {
    return obj.map((item) => (typeof item === 'object' && item !== null ? sanitize(item as AuditContext) : item)) as Json[];
  }
  const clone: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') {
      clone[k] = sanitize(v as AuditContext);
    } else if (typeof v === 'string' && (k.toLowerCase().includes('cnpj') || k.toLowerCase().includes('cpf'))) {
      clone[k] = maskDocument(v);
    } else if (k.toLowerCase().includes('xmlbase64') || k.toLowerCase().includes('pdfbase64')) {
      clone[k] = '[omitted]';
    } else {
      clone[k] = v as Json;
    }
  }
  return clone as Json;
}

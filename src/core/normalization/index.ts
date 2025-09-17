// Placeholder for normalization logic
export interface NormalizedInvoiceInput {
  rpsNumber: string;
  rpsSeries: string;
  issueDate: string; // ISO
  serviceCode: string;
  serviceDescription: string;
  serviceAmount: number;
  taxRate: number;
  issRetained: boolean;
  cnae?: string;
  deductionsAmount?: number;
  provider: { cnpj: string; municipalRegistration?: string };
  customer: { cpf?: string; cnpj?: string; name: string; email?: string };
  additionalInfo?: string;
}

export class NormalizationError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = 'NormalizationError';
  }
}

type AnyObject = Record<string, unknown>;

function pickString(obj: AnyObject, keys: string[], fallback = ''): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.length > 0) return v;
    if (typeof v === 'number') return String(v);
  }
  return fallback;
}

function pickNumber(obj: AnyObject, keys: string[], fallback = 0): number {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  }
  return fallback;
}

function pickBoolean(obj: AnyObject, keys: string[], fallback = false): boolean {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') {
      const s = v.toLowerCase();
      if (s === 'true' || s === '1') return true;
      if (s === 'false' || s === '0') return false;
    }
  }
  return fallback;
}

export function detectAdapter(): 'generic' {
  return 'generic';
}

export function normalize(raw: unknown): NormalizedInvoiceInput {
  // TODO implement mapping rules & synonyms
  if (!raw || typeof raw !== 'object') throw new NormalizationError('Empty payload');
  const r = raw as AnyObject;
  return {
    rpsNumber: pickString(r, ['rpsNumber', 'rps'], 'RPS-UNKNOWN'),
    rpsSeries: pickString(r, ['rpsSeries', 'serie'], 'UNICA'),
    issueDate: new Date().toISOString(),
    serviceCode: pickString(r, ['serviceCode'], '0000'),
    serviceDescription: pickString(r, ['description', 'serviceDescription'], ''),
    serviceAmount: pickNumber(r, ['amount', 'total'], 0),
    taxRate: pickNumber(r, ['taxRate', 'aliquota'], 0),
    issRetained: pickBoolean(r, ['issRetained', 'iss_retido'], false),
    provider: { cnpj: pickString(r, ['providerCnpj', 'cnpjPrestador'], '') },
    customer: { name: pickString(r, ['customerName'], 'SEM NOME') }
  };
}

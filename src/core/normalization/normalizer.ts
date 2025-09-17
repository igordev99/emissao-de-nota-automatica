import { NormalizationError } from '../errors';
import { nfseNormalizedSchema, NfseNormalized } from '../validation/nfse.schema';

// Dicionário de sinônimos para campos básicos
const synonyms: Record<string, string> = {
  rps: 'rpsNumber',
  rps_num: 'rpsNumber',
  rpsNumber: 'rpsNumber',
  numeroRps: 'rpsNumber',
  serie: 'rpsSeries',
  serieRps: 'rpsSeries',
  rpsSeries: 'rpsSeries',
  service_code: 'serviceCode',
  codigoServico: 'serviceCode',
  codigo_servico: 'serviceCode',
  serviceCode: 'serviceCode',
  descricao: 'serviceDescription',
  discriminacao: 'serviceDescription',
  serviceDescription: 'serviceDescription',
  valor: 'serviceAmount',
  valorTotal: 'serviceAmount',
  totalValue: 'serviceAmount',
  amount: 'serviceAmount',
  serviceAmount: 'serviceAmount',
  aliquota: 'taxRate',
  taxRate: 'taxRate',
  issRetido: 'issRetained',
  iss_retido: 'issRetained',
  issRetained: 'issRetained',
  cnae: 'cnae',
  deductions: 'deductionsAmount',
  deductionsAmount: 'deductionsAmount'
};

const serviceCodeMap: Record<string, { description: string; minRate?: number; maxRate?: number }> = {
  '101': { description: 'Serviços de informática', minRate: 2, maxRate: 5 },
  '201': { description: 'Consultoria empresarial', minRate: 2, maxRate: 5 },
  '301': { description: 'Treinamentos e cursos', minRate: 2, maxRate: 5 }
};

interface RawInput {
  [k: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function normalizeInvoice(raw: RawInput): NfseNormalized {
  if (!raw || typeof raw !== 'object') {
    throw new NormalizationError('Payload inválido');
  }

  // Detectar se dados estão aninhados (ex: raw.invoice)
  const base = raw.invoice || raw.nfse || raw;

  const interim: any = { provider: {}, customer: {} }; // eslint-disable-line @typescript-eslint/no-explicit-any

  for (const [key, value] of Object.entries(base)) {
    const canonical = synonyms[key] || key;
    switch (canonical) {
      case 'rpsNumber':
      case 'rpsSeries':
      case 'serviceCode':
      case 'serviceDescription':
        interim[canonical] = String(value);
        break;
      case 'serviceAmount':
      case 'taxRate':
      case 'deductionsAmount':
        interim[canonical] = Number(value);
        break;
      case 'issRetained':
        interim[canonical] = value === true || value === 'S' || value === 'Y' || String(value).toLowerCase() === 'true';
        break;
      case 'issueDate':
        interim.issueDate = value;
        break;
      case 'cnae':
        interim.cnae = String(value);
        break;
      case 'provider':
        interim.provider = mapParticipant(value, 'provider');
        break;
      case 'customer':
      case 'tomador':
      case 'client':
        interim.customer = mapParticipant(value, 'customer');
        break;
      default:
        // ignorar outros campos por enquanto
        break;
    }
  }

  // Regras derivadas / defaults
  if (!interim.issueDate) {
    interim.issueDate = new Date().toISOString();
  }

  const parsed = nfseNormalizedSchema.safeParse(interim);
  if (!parsed.success) {
    throw new NormalizationError('Falha na normalização', parsed.error.flatten());
  }
  const data = parsed.data;
  if (data.serviceCode && !serviceCodeMap[data.serviceCode]) {
    throw new NormalizationError(`Unknown serviceCode ${data.serviceCode}`);
  }
  return data;
}

function mapParticipant(obj: any, type: 'provider' | 'customer') { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!obj || typeof obj !== 'object') return {};
  const out: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (obj.cnpj) out.cnpj = sanitizeDigits(obj.cnpj);
  if (obj.cpf) out.cpf = sanitizeDigits(obj.cpf);
  if (obj.documento) {
    const d = sanitizeDigits(obj.documento);
    if (d.length === 14) out.cnpj = d; else if (d.length === 11) out.cpf = d;
  }
  if (obj.name || obj.nome || obj.razaoSocial) out.name = obj.name || obj.nome || obj.razaoSocial;
  if (obj.email) out.email = obj.email;
  if (type === 'provider' && obj.municipalRegistration) out.municipalRegistration = obj.municipalRegistration;
  return out;
}

function sanitizeDigits(val: string) {
  return String(val).replace(/\D/g, '');
}

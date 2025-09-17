import { NormalizationError } from '../src/core/errors';
import { normalizeInvoice } from '../src/core/normalization/normalizer';
import { nfseNormalizedSchema } from '../src/core/validation/nfse.schema';

describe('normalizeInvoice', () => {
  it('normalizes basic payload with synonyms', () => {
    const out = normalizeInvoice({
      rps: '10',
      serie: 'A',
      codigoServico: '101',
      discriminacao: 'Teste',
      valorTotal: 500,
      aliquota: 0.03,
      issRetido: false,
      provider: { cnpj: '12345678000199' },
      tomador: { cnpj: '99887766000155', name: 'Cliente X' }
    });
    expect(out.rpsNumber).toBe('10');
    expect(out.serviceAmount).toBe(500);
  });

  it('throws error when missing customer document', () => {
    expect(() => normalizeInvoice({ rpsNumber: '1', rpsSeries: 'A', serviceCode: '101', serviceDescription: 'X', serviceAmount: 10, taxRate: 0.02, issRetained: false, provider: { cnpj: '12345678000199' }, customer: { name: 'Sem Doc' } })).toThrow(NormalizationError);
  });
});

describe('nfseNormalizedSchema validation extras', () => {
  const base: any = {
    rpsNumber: '1',
    rpsSeries: 'A',
    issueDate: new Date().toISOString(),
    serviceCode: '101',
    serviceDescription: 'Teste',
    serviceAmount: 100,
    taxRate: 0.02,
    issRetained: false,
    provider: { cnpj: '12345678000199' },
    customer: { cnpj: '98765432000188', name: 'Cliente' }
  };

  it('rejects taxRate outside allowed range', () => {
    const resLow = nfseNormalizedSchema.safeParse({ ...base, taxRate: 0.0001 });
    expect(resLow.success).toBe(false);
    const resHigh = nfseNormalizedSchema.safeParse({ ...base, taxRate: 0.2 });
    expect(resHigh.success).toBe(false);
  });

  it('requires customer doc when issRetained=true', () => {
    const res = nfseNormalizedSchema.safeParse({
      ...base,
      issRetained: true,
      customer: { name: 'Sem Doc' }
    });
    expect(res.success).toBe(false);
  });
});

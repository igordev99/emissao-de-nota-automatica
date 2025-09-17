import { z } from 'zod';

// Faixas de alíquota por código de serviço (placeholder configurável)
const TAX_RATES: Record<string, { min: number; max: number }> = {
  default: { min: 0.01, max: 0.05 }, // 1% a 5%
};

export const nfseNormalizedSchema = z.object({
  rpsNumber: z.string().min(1).optional(),
  rpsSeries: z.string().min(1),
  issueDate: z.string().refine((v: string) => !Number.isNaN(Date.parse(v)), 'Invalid date'),
  serviceCode: z.string().min(1),
  municipalTaxCode: z.string().min(1).optional(), // CodigoTributacaoMunicipio (opcional)
  serviceDescription: z.string().min(1),
  serviceAmount: z.number().positive(),
  taxRate: z.number().positive(),
  issRetained: z.boolean(),
  cnae: z.string().optional(),
  deductionsAmount: z.number().nonnegative().optional(),
  provider: z.object({
    cnpj: z.string().regex(/^[0-9]{14}$/),
    municipalRegistration: z.string().optional()
  }),
  customer: z.object({
    cpf: z.string().regex(/^[0-9]{11}$/).optional(),
    cnpj: z.string().regex(/^[0-9]{14}$/).optional(),
    name: z.string().min(1),
    email: z.string().email().optional(),
    address: z.object({
      street: z.string().min(1).optional(),
      number: z.string().min(1).optional(),
      complement: z.string().min(1).optional(),
      district: z.string().min(1).optional(),
      cityCode: z.string().regex(/^\d+$/).optional(),
      state: z.string().regex(/^[A-Z]{2}$/).optional(),
      zipCode: z.string().regex(/^\d{8}$/).optional(),
    }).optional()
  }),
  additionalInfo: z.string().optional()
}).refine((data) => data.customer.cpf || data.customer.cnpj, { message: 'Customer document required (cpf or cnpj)', path: ['customer'] })
  .superRefine((data, ctx) => {
    // Regra retroatividade: até 10 dias ou mês anterior até dia 05
    const issue = new Date(data.issueDate);
    const now = new Date();
    const diffDays = (now.getTime() - issue.getTime()) / 86400000;
    if (diffDays > 10) {
      const isPreviousMonth = issue.getMonth() === (now.getMonth() + 11) % 12 && issue.getFullYear() === (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
      if (!(isPreviousMonth && now.getDate() <= 5)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Data de emissão retroativa inválida', path: ['issueDate'] });
      }
    }
    // Faixa de alíquota
    const range = TAX_RATES[data.serviceCode] || TAX_RATES.default;
    if (data.taxRate < range.min || data.taxRate > range.max) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Alíquota fora da faixa (${range.min * 100}% - ${range.max * 100}%)`, path: ['taxRate'] });
    }
    // ISS retido exige tomador identificado por doc
    if (data.issRetained && !(data.customer.cnpj || data.customer.cpf)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'ISS retido requer documento do tomador', path: ['issRetained'] });
    }
  });

export type NfseNormalized = z.infer<typeof nfseNormalizedSchema>;

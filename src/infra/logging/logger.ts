export function buildLogger(): {
  level?: string;
  redact?: { paths: string[]; censor?: string | ((value: any, path: string[]) => any) } | string[];
  transport?: { target: string; options?: Record<string, unknown> };
} {
  const pretty = process.env.LOG_PRETTY === '1';
  const isTest = process.env.NODE_ENV === 'test';
  return {
    // Em testes, reduza ruído padrão para 'error' (pode ser sobrescrito via LOG_LEVEL)
    level: process.env.LOG_LEVEL || (isTest ? 'error' : 'info'),
    redact: {
      paths: ['req.headers.authorization', 'authorization', '*.jwt', '*.token', 'customer.cpf', 'customer.cnpj'],
      censor: '**redacted**'
    },
    transport: process.env.NODE_ENV !== 'production' && pretty ? {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard' }
    } : undefined
  };
}

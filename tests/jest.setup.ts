// Silencia logs de audit nos testes para evitar ruído no output
const origError = console.error;

beforeAll(() => {
  // Filtra apenas mensagens específicas de audit (mantém outros erros visíveis)
  jest.spyOn(console, 'error').mockImplementation((...args: any[]) => {
    const first = args[0];
    if (typeof first === 'string' && first.startsWith('Audit log failure')) {
      return;
    }
    // fallback ao console original nos demais casos
    return (origError as any)(...args);
  });
});

afterAll(() => {
  (console.error as any).mockRestore?.();
});

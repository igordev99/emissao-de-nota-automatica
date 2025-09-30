// Debug do frontend para identificar problema de login
import api from './api';

export const debugLogin = async () => {
  console.log('=== DEBUG LOGIN ===');
  
  // 1. Verificar configuração da API
  console.log('API Base URL:', api.defaults.baseURL);
  
  // 2. Testar health da API
  try {
    const healthResponse = await api.get('/health');
    console.log('Health check:', healthResponse.status, healthResponse.data);
  } catch (error) {
    console.error('Health check failed:', error);
  }
  
  // 3. Testar login direto
  try {
    console.log('Tentando login com tester...');
    const loginResponse = await api.post('/auth/token', { sub: 'tester' });
    console.log('Login response:', loginResponse.status, loginResponse.data);
    return loginResponse.data;
  } catch (error: any) {
    console.error('Login failed:', error.response?.status, error.response?.data || error.message);
    console.error('Full error:', error);
    throw error;
  }
};

// Executar debug automaticamente no console
if (typeof window !== 'undefined') {
  (window as any).debugLogin = debugLogin;
  console.log('Debug function available: window.debugLogin()');
}
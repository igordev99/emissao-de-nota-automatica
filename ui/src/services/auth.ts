import api from './api';

export interface LoginRequest {
  sub?: string;
}

export interface LoginResponse {
  token: string;
}

export interface User {
  sub: string;
  roles: string[];
}

export const authService = {
  // Login - apenas para desenvolvimento
  async login(data: LoginRequest = {}): Promise<LoginResponse> {
    const response = await api.post('/auth/token', data);
    return response.data;
  },

  // Logout
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Verificar se está autenticado
  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      // Decodificar token JWT para verificar expiração
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  },

  // Obter usuário atual
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  // Salvar token e dados do usuário
  setAuthData(token: string): void {
    localStorage.setItem('token', token);

    try {
      // Decodificar token para obter dados do usuário
      const payload = JSON.parse(atob(token.split('.')[1]));
      localStorage.setItem('user', JSON.stringify({
        sub: payload.sub,
        roles: payload.roles || []
      }));
    } catch (error) {
      console.error('Erro ao decodificar token:', error);
    }
  }
};
import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';

import supabaseAuthService, { type LoginCredentials, type RegisterData } from '../services/supabaseAuth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar sessão ao inicializar
    const initializeAuth = async () => {
      try {
        const currentSession = await supabaseAuthService.getSession();
        setSession(currentSession);
        setUser(currentSession?.user || null);
      } catch (error) {
        console.error('Erro ao inicializar auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabaseAuthService.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        setSession(session);
        setUser(session?.user || null);
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      const { user: authUser, session: authSession } = await supabaseAuthService.login(credentials);
      setSession(authSession);
      setUser(authUser);
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setIsLoading(true);
      const { user: authUser, session: authSession } = await supabaseAuthService.register(data);
      setSession(authSession);
      setUser(authUser);
    } catch (error) {
      console.error('Erro no registro:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await supabaseAuthService.logout();
      setSession(null);
      setUser(null);
    } catch (error) {
      console.error('Erro no logout:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await supabaseAuthService.resetPassword({ email });
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
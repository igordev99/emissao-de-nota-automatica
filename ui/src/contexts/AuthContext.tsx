import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';

import supabaseAuthService, { type LoginCredentials, type RegisterData } from '../services/supabaseAuth';
import { UserProfileService, type UserProfile } from '../services/userProfileService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Função para carregar perfil do usuário
  const loadUserProfile = async (userId: string) => {
    try {
      const userProfile = await UserProfileService.getCurrentUserProfile();
      
      // Se não existe perfil, criar um com role 'user'
      if (!userProfile && user) {
        console.log('Perfil não encontrado, criando perfil padrão...');
        const newProfile = await UserProfileService.createProfile({
          user_id: user.id,
          email: user.email || '',
          role: 'user',
          company_name: 'Empresa'
        });
        setProfile(newProfile);
      } else {
        setProfile(userProfile);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil do usuário:', error);
      
      // Se erro na criação, definir perfil padrão para não travar
      setProfile({
        id: 'temp',
        user_id: userId,
        email: user?.email || '',
        role: 'user',
        is_active: true,
        company_name: 'Empresa',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user.id);
    }
  };

  useEffect(() => {
    // Verificar sessão ao inicializar
    const initializeAuth = async () => {
      try {
        const currentSession = await supabaseAuthService.getSession();
        setSession(currentSession);
        setUser(currentSession?.user || null);
        
        // Carregar perfil se há usuário
        if (currentSession?.user) {
          await loadUserProfile(currentSession.user.id);
        }
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
        
        // Carregar perfil quando usuário faz login
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setProfile(null);
        }
        
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
      
      // Carregar perfil após login
      if (authUser) {
        await loadUserProfile(authUser.id);
      }
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
      
      // Carregar perfil após registro (pode não existir ainda devido ao trigger)
      if (authUser) {
        // Aguardar um pouco para o trigger criar o perfil
        setTimeout(() => loadUserProfile(authUser.id), 1000);
      }
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
      setProfile(null);
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

  // Computed values baseados no perfil
  const isAdmin = profile ? ['admin', 'super_admin'].includes(profile.role) : false;
  const isSuperAdmin = profile ? profile.role === 'super_admin' : false;

  const value: AuthContextType = {
    user,
    session,
    profile,
    isAuthenticated: !!user,
    isAdmin,
    isSuperAdmin,
    isLoading,
    login,
    register,
    logout,
    resetPassword,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
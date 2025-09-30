import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';

import supabaseAuthService, { type LoginCredentials, type RegisterData } from '../services/supabaseAuth';
import { type UserProfile } from '../services/userProfileService';
import { supabase } from '../lib/supabase';

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

  // Função para criar perfil básico sempre
  const createBasicProfile = (currentUser: User): UserProfile => {
    return {
      id: `profile-${currentUser.id}`,
      user_id: currentUser.id,
      email: currentUser.email || '',
      role: 'user' as const,
      is_active: true,
      company_name: 'Empresa',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  };

  const refreshProfile = async () => {
    if (user) {
      const basicProfile = createBasicProfile(user);
      setProfile(basicProfile);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        console.log('🚀 AuthContext: Inicializando...');
        
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        setSession(currentSession);
        setUser(currentSession?.user || null);
        
        if (currentSession?.user) {
          const basicProfile = createBasicProfile(currentSession.user);
          setProfile(basicProfile);
          console.log('✅ AuthContext: Perfil básico criado');
        }
        
      } catch (error) {
        console.error('❌ AuthContext: Erro na inicialização:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
          console.log('✅ AuthContext: Inicialização completa');
        }
      }
    };

    initialize();

    // Listener simplificado - só processa mudanças reais
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log('🔔 AuthContext: Event:', event);
        
        // Só processar eventos importantes
        if (event === 'SIGNED_IN') {
          setSession(session);
          setUser(session?.user || null);
          
          if (session?.user) {
            const basicProfile = createBasicProfile(session.user);
            setProfile(basicProfile);
            console.log('✅ AuthContext: Login processado');
          }
          
          setIsLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsLoading(false);
          console.log('👋 AuthContext: Logout processado');
        }
      }
    );

    // Timeout de emergência
    const emergencyTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('⚠️ AuthContext: Timeout de emergência');
        setIsLoading(false);
      }
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(emergencyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      await supabaseAuthService.login(credentials);
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    try {
      await supabaseAuthService.register(data);
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await supabaseAuthService.logout();
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    await supabaseAuthService.resetPassword({ email });
  };

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
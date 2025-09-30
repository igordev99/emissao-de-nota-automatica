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
  const [processedUserId, setProcessedUserId] = useState<string | null>(null);

  // Função simplificada para carregar perfil
  const loadUserProfile = async (currentUser: User) => {
    try {
      console.log('🔄 Carregando perfil para usuário:', currentUser.id);
      
      // Tentar buscar perfil na base, mas criar fallback se der erro
      try {
        const { data: userProfile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', currentUser.id)
          .single();
          
        if (userProfile && !error) {
          setProfile(userProfile);
          console.log('✅ Perfil carregado da base de dados');
          return;
        }
      } catch (dbError) {
        console.log('ℹ️ Tabela user_profiles não disponível, usando perfil básico');
      }
      
      // Criar perfil básico na base de dados se não existir
      console.log('📝 Criando perfil na base de dados...');
      const { data: newProfile, error: insertError } = await supabase
        .from('user_profiles')
        .insert([{
          user_id: currentUser.id,
          email: currentUser.email || '',
          role: 'user',
          company_name: 'Empresa',
          is_active: true
        }])
        .select()
        .single();
        
      if (newProfile && !insertError) {
        setProfile(newProfile);
        console.log('✅ Perfil criado na base de dados');
        return;
      }
      
      // Se falhar criar na base, usar perfil básico temporário
      const basicProfile = {
        id: `basic-${currentUser.id}`,
        user_id: currentUser.id,
        email: currentUser.email || '',
        role: 'user' as const,
        is_active: true,
        company_name: 'Empresa',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setProfile(basicProfile);
      console.log('✅ Perfil básico criado');
      
    } catch (error) {
      console.error('❌ Erro ao carregar perfil:', error);
      // Sempre garantir que um perfil seja criado
      const emergencyProfile = {
        id: `emergency-${currentUser.id}`,
        user_id: currentUser.id,
        email: currentUser.email || 'user@example.com',
        role: 'user' as const,
        is_active: true,
        company_name: 'Empresa',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setProfile(emergencyProfile);
      console.log('🆘 Perfil de emergência criado');
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        console.log('🚀 Inicializando AuthContext...');
        
        // Verificar sessão inicial
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        console.log('📋 Sessão inicial:', currentSession ? 'Encontrada' : 'Não encontrada');
        
        setSession(currentSession);
        setUser(currentSession?.user || null);
        
        // Carregar perfil se há usuário
        if (currentSession?.user) {
          await loadUserProfile(currentSession.user);
        }
        
      } catch (error) {
        console.error('❌ Erro na inicialização:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
          console.log('✅ AuthContext inicializado');
        }
      }
    };

    // Timeout de segurança absoluto
    const safetyTimeout = setTimeout(() => {
      console.warn('⚠️ TIMEOUT DE SEGURANÇA: Forçando fim do loading');
      if (mounted) {
        setIsLoading(false);
      }
    }, 5000); // 5 segundos

    initialize();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('🔔 Auth event:', event);
        
        // Ignorar INITIAL_SESSION para evitar execução dupla
        if (event === 'INITIAL_SESSION') {
          return;
        }
        
        setSession(session);
        setUser(session?.user || null);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Evitar processar o mesmo usuário múltiplas vezes
          if (processedUserId !== session.user.id) {
            console.log('✅ Login detectado, carregando perfil...');
            setProcessedUserId(session.user.id);
            await loadUserProfile(session.user);
          } else {
            console.log('⏭️ SIGNED_IN já processado para usuário:', session.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 Logout detectado, limpando dados...');
          setProfile(null);
          setProcessedUserId(null);
        }
        
        // Sempre garantir que loading seja false após processar eventos
        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []); // Dependências vazias - só executa uma vez

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      await supabaseAuthService.login(credentials);
      // O listener onAuthStateChange vai processar o resto
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setIsLoading(true);
      await supabaseAuthService.register(data);
      // O listener onAuthStateChange vai processar o resto
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await supabaseAuthService.logout();
      // O listener onAuthStateChange vai processar o resto
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    await supabaseAuthService.resetPassword({ email });
  };

  // Computed values
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
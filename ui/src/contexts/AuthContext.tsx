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
  const [initialized, setInitialized] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState<string | null>(null); // Cache do userId do perfil carregado
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);

  // Função para carregar perfil do usuário
  const loadUserProfile = async (currentUser: User) => {
    console.log('🚀 [loadUserProfile] INICIADO para:', currentUser.id);
    console.log('🔍 [loadUserProfile] Estado atual:', {
      profileLoaded,
      hasProfile: !!profile,
      isLoading
    });
    
    // Se já carregamos o perfil para este usuário, não carregar novamente
    if (profileLoaded === currentUser.id && profile) {
      console.log('✅ [loadUserProfile] Perfil já carregado para usuário:', currentUser.id);
      return;
    }
    
    // Evitar chamadas múltiplas simultâneas
    if (profileLoaded === `loading-${currentUser.id}`) {
      console.log('⏳ [loadUserProfile] Perfil já sendo carregado para usuário:', currentUser.id);
      return;
    }
    
    // Marcar como carregando para evitar chamadas simultâneas
    setProfileLoaded(`loading-${currentUser.id}`);
    console.log('🔄 [loadUserProfile] Iniciando carregamento do perfil para usuário:', currentUser.id);
    
    try {
      console.log('📡 Fazendo query direto para user_profiles...');
      
      // Fazer query direta para evitar conflito com getUser()
      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();
        
      console.log('📋 Resposta da query:', { userProfile, error });
      
      // Verificar se houve erro na query
      if (error) {
        if (error.code === 'PGRST116') {
          console.log('🆕 Perfil não encontrado, criando perfil padrão...');
          // Criar perfil diretamente no banco
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert([{
              user_id: currentUser.id,
              email: currentUser.email || '',
              role: 'user',
              company_name: 'Empresa',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])
            .select()
            .single();
            
          if (createError) {
            console.error('❌ Erro ao criar perfil:', createError);
            throw createError;
          }
          
          setProfile(newProfile);
          console.log('✅ Perfil criado com sucesso:', newProfile);
        } else {
          console.error('❌ Erro na query do perfil:', error);
          throw error;
        }
      } else if (userProfile) {
        setProfile(userProfile);
        console.log('✅ Perfil encontrado:', userProfile);
      } else {
        console.log('⚠️ Perfil é null, criando temporário...');
        // Criar perfil temporário
        const tempProfile = {
          id: `temp-${currentUser.id}`,
          user_id: currentUser.id,
          email: currentUser.email || '',
          role: 'user' as const,
          is_active: true,
          company_name: 'Empresa',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setProfile(tempProfile);
        console.log('🔧 Perfil temporário criado:', tempProfile);
      }
      
      // Marcar perfil como carregado para este usuário
      setProfileLoaded(currentUser.id);
      console.log('✅ [loadUserProfile] CONCLUÍDO com sucesso para:', currentUser.id);
      
    } catch (error) {
      console.error('❌ [loadUserProfile] Erro ao carregar perfil do usuário:', error);
      
      // Se erro na criação, definir perfil padrão para não travar
      const fallbackProfile = {
        id: `temp-${currentUser.id}`,
        user_id: currentUser.id,
        email: currentUser.email || '',
        role: 'user' as const,
        is_active: true,
        company_name: 'Empresa',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setProfile(fallbackProfile);
      console.log('🔧 [loadUserProfile] Perfil de fallback criado:', fallbackProfile);
      
      // Marcar perfil como carregado mesmo em caso de erro
      setProfileLoaded(currentUser.id);
      console.log('✅ [loadUserProfile] CONCLUÍDO com fallback para:', currentUser.id);
    }
    
    console.log('🏁 [loadUserProfile] FINALIZANDO função para:', currentUser.id);
  };

  const refreshProfile = async () => {
    if (user) {
      // Forçar recarregamento do perfil (limpar cache)
      setProfileLoaded(null);
      await loadUserProfile(user);
    }
  };

  // Timeout de segurança para garantir que loading nunca trave para sempre
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.warn('⚠️ TIMEOUT DE SEGURANÇA: Forçando fim do loading após 15 segundos');
      setIsLoading(false);
    }, 15000);
    
    setLoadingTimeout(timeout);
    
    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, [loadingTimeout]);

  useEffect(() => {
    if (initialized) return; // Evitar re-inicialização

    let isInitializing = true;

    // Verificar sessão ao inicializar
    const initializeAuth = async () => {
      try {
        const currentSession = await supabaseAuthService.getSession();
        
        if (!isInitializing) return; // Cancelar se componente foi desmontado
        
        setSession(currentSession);
        setUser(currentSession?.user || null);
        
        // Carregar perfil se há usuário (apenas na inicialização)
        if (currentSession?.user) {
          try {
            await loadUserProfile(currentSession.user);
          } catch (error) {
            console.error('Erro ao carregar perfil na inicialização:', error);
          }
        }
        
        setInitialized(true);
      } catch (error) {
        console.error('Erro ao inicializar auth:', error);
      } finally {
        if (isInitializing) {
          if (loadingTimeout) {
            clearTimeout(loadingTimeout);
            setLoadingTimeout(null);
          }
          setIsLoading(false);
          console.log('🏁 [initializeAuth] Loading finalizado na inicialização');
        }
      }
    };

    initializeAuth();

    // Escutar mudanças na autenticação (apenas eventos importantes)
    const { data: { subscription } } = supabaseAuthService.onAuthStateChange(
      async (event, session) => {
        // Ignorar evento INITIAL_SESSION para evitar execução dupla
        if (event === 'INITIAL_SESSION') {
          return;
        }
        
        console.log('Auth state changed:', event, session?.user?.id || 'null');
        
        // Apenas processar mudanças reais de estado
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          console.log(`🔄 [onAuthStateChange] Processando evento: ${event}, User ID: ${session?.user?.id || 'null'}`);
          console.log(`📊 [onAuthStateChange] Estado antes:`, { isLoading, initialized, profileLoaded });
          
          setSession(session);
          setUser(session?.user || null);
          
          // Carregar perfil apenas no login, não em refresh
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('📝 Iniciando carregamento do perfil...');
            
            // FORÇA O LOADING PARA FALSE IMEDIATAMENTE
            console.log('🚨 FORÇA: Definindo isLoading = false ANTES de carregar perfil');
            setIsLoading(false);
            
            try {
              await loadUserProfile(session.user);
              console.log('✅ Perfil carregado com sucesso após loading false');
            } catch (error) {
              console.error('❌ Erro ao carregar perfil após login:', error);
            }
            
            // Limpar timeout se existir
            if (loadingTimeout) {
              clearTimeout(loadingTimeout);
              setLoadingTimeout(null);
            }
          } else if (event === 'SIGNED_OUT') {
            console.log('👋 Usuário saiu, limpando dados...');
            setProfile(null);
            setProfileLoaded(null); // Limpar cache do perfil
            setIsLoading(false);
          } else if (event === 'TOKEN_REFRESHED') {
            console.log('🔄 Token renovado, finalizando loading...');
            // No refresh, não recarregar perfil, apenas finalizar loading
            setIsLoading(false);
          }
          
          if (!initialized) {
            console.log('🚀 Marcando como inicializado...');
            setInitialized(true);
          }
        } else {
          console.log(`⏭️ Ignorando evento: ${event}`);
        }
      }
    );

    return () => {
      isInitializing = false;
      subscription.unsubscribe();
    };
  }, [initialized]);

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      await supabaseAuthService.login(credentials);
      
      // O evento SIGNED_IN do listener já vai processar a sessão e usuário
      // Mas garantimos que o loading seja finalizado após o login
      
    } catch (error) {
      console.error('Erro no login:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setIsLoading(true);
      await supabaseAuthService.register(data);
      
      // O evento SIGNED_IN do listener já vai processar a sessão
      // O perfil será criado automaticamente pelo trigger ou pela função loadUserProfile
      
    } catch (error) {
      console.error('Erro no registro:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await supabaseAuthService.logout();
      
      // O evento SIGNED_OUT do listener já vai limpar os estados
      // Não precisamos duplicar a lógica aqui
      
    } catch (error) {
      console.error('Erro no logout:', error);
      setIsLoading(false);
      throw error;
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
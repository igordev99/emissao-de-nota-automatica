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
  const [initialized, setInitialized] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState<string | null>(null); // Cache do userId do perfil carregado

  // Função para carregar perfil do usuário
  const loadUserProfile = async (currentUser: User) => {
    // Se já carregamos o perfil para este usuário, não carregar novamente
    if (profileLoaded === currentUser.id && profile) {
      return;
    }
    try {
      const userProfile = await UserProfileService.getCurrentUserProfile();
      
      // Se não existe perfil, criar um com role 'user'
      if (!userProfile) {
        console.log('Perfil não encontrado, criando perfil padrão...');
        try {
          const newProfile = await UserProfileService.createProfile({
            user_id: currentUser.id,
            email: currentUser.email || '',
            role: 'user',
            company_name: 'Empresa'
          });
          setProfile(newProfile);
        } catch (createError) {
          console.error('Erro ao criar perfil:', createError);
          // Definir perfil temporário para não travar o sistema
          setProfile({
            id: `temp-${currentUser.id}`,
            user_id: currentUser.id,
            email: currentUser.email || '',
            role: 'user',
            is_active: true,
            company_name: 'Empresa',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      } else {
        setProfile(userProfile);
      }
      
      // Marcar perfil como carregado para este usuário
      setProfileLoaded(currentUser.id);
      
    } catch (error) {
      console.error('Erro ao carregar perfil do usuário:', error);
      
      // Se erro na criação, definir perfil padrão para não travar
      setProfile({
        id: `temp-${currentUser.id}`,
        user_id: currentUser.id,
        email: currentUser.email || '',
        role: 'user',
        is_active: true,
        company_name: 'Empresa',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      // Marcar perfil como carregado mesmo em caso de erro
      setProfileLoaded(currentUser.id);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      // Forçar recarregamento do perfil (limpar cache)
      setProfileLoaded(null);
      await loadUserProfile(user);
    }
  };

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
          await loadUserProfile(currentSession.user);
        }
        
        setInitialized(true);
      } catch (error) {
        console.error('Erro ao inicializar auth:', error);
      } finally {
        if (isInitializing) {
          setIsLoading(false);
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
          setSession(session);
          setUser(session?.user || null);
          
          // Carregar perfil apenas no login, não em refresh
          if (event === 'SIGNED_IN' && session?.user) {
            await loadUserProfile(session.user);
          } else if (event === 'SIGNED_OUT') {
            setProfile(null);
            setProfileLoaded(null); // Limpar cache do perfil
          }
          
          if (!initialized) {
            setIsLoading(false);
            setInitialized(true);
          }
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
      // Não precisamos duplicar a lógica aqui
      
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
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'

// Tipos para o sistema de perfis e roles
export type UserRole = 'user' | 'admin' | 'super_admin'

export interface UserProfile {
  id: string
  user_id: string
  email: string
  role: UserRole
  is_active: boolean
  company_name: string | null
  created_at: string
  updated_at: string
}

export interface CreateUserProfileData {
  user_id: string
  email: string
  role?: UserRole
  company_name?: string
  is_active?: boolean
}

export interface UpdateUserProfileData {
  email?: string
  role?: UserRole
  company_name?: string
  is_active?: boolean
}

export class UserProfileService {
  /**
   * Obtém o perfil do usuário logado
   */
  static async getCurrentUserProfile(): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Perfil não encontrado
      }
      console.error('Erro ao buscar perfil do usuário:', error)
      throw new Error(`Erro ao buscar perfil: ${error.message}`)
    }

    return data as UserProfile
  }

  /**
   * Verifica se o usuário atual é admin
   */
  static async isCurrentUserAdmin(): Promise<boolean> {
    try {
      const profile = await this.getCurrentUserProfile()
      return profile ? ['admin', 'super_admin'].includes(profile.role) : false
    } catch (error) {
      console.error('Erro ao verificar se usuário é admin:', error)
      return false
    }
  }

  /**
   * Obtém o role do usuário atual
   */
  static async getCurrentUserRole(): Promise<UserRole> {
    try {
      const profile = await this.getCurrentUserProfile()
      return profile?.role || 'user'
    } catch (error) {
      console.error('Erro ao obter role do usuário:', error)
      return 'user'
    }
  }

  /**
   * Busca todos os perfis (apenas para admins)
   */
  static async getAllProfiles(): Promise<UserProfile[]> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar perfis:', error)
      throw new Error(`Erro ao buscar perfis: ${error.message}`)
    }

    return data as UserProfile[]
  }

  /**
   * Busca perfil por ID (apenas para admins ou próprio usuário)
   */
  static async getProfileById(userId: string): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Erro ao buscar perfil:', error)
      throw new Error(`Erro ao buscar perfil: ${error.message}`)
    }

    return data as UserProfile
  }

  /**
   * Cria um perfil de usuário
   */
  static async createProfile(profileData: CreateUserProfileData): Promise<UserProfile> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const insertData = {
      ...profileData,
      role: profileData.role || 'user',
      is_active: profileData.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar perfil:', error)
      throw new Error(`Erro ao criar perfil: ${error.message}`)
    }

    return data as UserProfile
  }

  /**
   * Atualiza um perfil de usuário
   */
  static async updateProfile(userId: string, profileData: UpdateUserProfileData): Promise<UserProfile> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const updateData = {
      ...profileData,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar perfil:', error)
      throw new Error(`Erro ao atualizar perfil: ${error.message}`)
    }

    return data as UserProfile
  }

  /**
   * Promove usuário para admin (apenas super_admin pode fazer)
   */
  static async promoteToAdmin(userId: string): Promise<UserProfile> {
    return this.updateProfile(userId, { role: 'admin' })
  }

  /**
   * Promove usuário para super_admin (apenas super_admin pode fazer)
   */
  static async promoteToSuperAdmin(userId: string): Promise<UserProfile> {
    return this.updateProfile(userId, { role: 'super_admin' })
  }

  /**
   * Remove privilégios admin (volta para user)
   */
  static async demoteToUser(userId: string): Promise<UserProfile> {
    return this.updateProfile(userId, { role: 'user' })
  }

  /**
   * Ativa/desativa usuário
   */
  static async toggleUserActive(userId: string, isActive: boolean): Promise<UserProfile> {
    return this.updateProfile(userId, { is_active: isActive })
  }

  /**
   * Busca usuários por role
   */
  static async getUsersByRole(role: UserRole): Promise<UserProfile[]> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', role)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar usuários por role:', error)
      throw new Error(`Erro ao buscar usuários: ${error.message}`)
    }

    return data as UserProfile[]
  }

  /**
   * Verifica se pode executar ação admin
   */
  static async canPerformAdminAction(): Promise<boolean> {
    return await this.isCurrentUserAdmin()
  }

  /**
   * Obtém estatísticas dos usuários (apenas para admins)
   */
  static async getUserStats() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('role, is_active')

    if (error) {
      console.error('Erro ao buscar estatísticas:', error)
      throw new Error(`Erro ao buscar estatísticas: ${error.message}`)
    }

    const stats = {
      total: data.length,
      active: data.filter(p => p.is_active).length,
      inactive: data.filter(p => !p.is_active).length,
      users: data.filter(p => p.role === 'user').length,
      admins: data.filter(p => p.role === 'admin').length,
      super_admins: data.filter(p => p.role === 'super_admin').length
    }

    return stats
  }
}

export default UserProfileService
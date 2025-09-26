import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  firstName?: string
  lastName?: string
}

export interface ResetPasswordData {
  email: string
}

export const supabaseAuthService = {
  // Login com email/senha
  async login({ email, password }: LoginCredentials) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error
    return data
  },

  // Registro de novo usuário
  async register({ email, password, firstName, lastName }: RegisterData) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName || ''} ${lastName || ''}`.trim()
        }
      }
    })

    if (error) throw error
    return data
  },

  // Logout
  async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Recuperação de senha
  async resetPassword({ email }: ResetPasswordData) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })

    if (error) throw error
  },

  // Atualizar senha
  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) throw error
  },

  // Obter sessão atual
  async getSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  },

  // Obter usuário atual (async)
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // Verificar se está autenticado (async)
  async isAuthenticated(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    return !!user
  },

  // Versão usando getSession (síncrona se sessão estiver em cache)
  getSessionSync(): Session | null {
    // Nota: getSession pode ser assíncrona, mas geralmente é rápida se em cache
    let session: Session | null = null
    supabase.auth.getSession().then(({ data }) => {
      session = data.session
    })
    return session
  },

  // Escutar mudanças de autenticação
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

export default supabaseAuthService
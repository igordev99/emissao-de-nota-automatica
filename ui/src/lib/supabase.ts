import { createClient } from '@supabase/supabase-js'

// Configuração do Supabase
const supabaseUrl = (import.meta.env as any).VITE_SUPABASE_URL || 'https://ctrkdpeqiwxkvvwymipi.supabase.co'
const supabaseAnonKey = (import.meta.env as any).VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0cmtkcGVxaXd4a3Z2d3ltaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjgzNjQsImV4cCI6MjA3NDE0NDM2NH0.TC8ZqqF9EIR7oHg26qDOSSvZKj5IDCma8Ti8d6tqFMQ'

// Cliente Supabase com configuração de auth
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Tipos para TypeScript
export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          name: string
          document: string
          email: string | null
          phone: string | null
          address: any | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          document: string
          email?: string | null
          phone?: string | null
          address?: any | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          document?: string
          email?: string | null
          phone?: string | null
          address?: any | null
          user_id?: string
          updated_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          name: string
          document: string
          email: string | null
          phone: string | null
          address: any | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          document: string
          email?: string | null
          phone?: string | null
          address?: any | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          document?: string
          email?: string | null
          phone?: string | null
          address?: any | null
          user_id?: string
          updated_at?: string
        }
      }
      service_types: {
        Row: {
          id: string
          code: string
          name: string
          iss_retained: boolean
          active: boolean
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          iss_retained?: boolean
          active?: boolean
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          iss_retained?: boolean
          active?: boolean
          user_id?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          email: string
          role: 'user' | 'admin' | 'super_admin'
          is_active: boolean
          company_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          role?: 'user' | 'admin' | 'super_admin'
          is_active?: boolean
          company_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          role?: 'user' | 'admin' | 'super_admin'
          is_active?: boolean
          company_name?: string | null
          updated_at?: string
        }
      }
      formula_groups: {
        Row: {
          id: string
          name: string
          description: string | null
          is_active: boolean
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_active?: boolean
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_active?: boolean
          user_id?: string
          updated_at?: string
        }
      }
      formula_rows: {
        Row: {
          id: string
          group_id: string
          val_min: number
          val_max: number
          indice: number
          fator_redutor: number
          iss_retido_das: boolean
          order_position: number
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          val_min: number
          val_max: number
          indice: number
          fator_redutor?: number
          iss_retido_das?: boolean
          order_position?: number
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          val_min?: number
          val_max?: number
          indice?: number
          fator_redutor?: number
          iss_retido_das?: boolean
          order_position?: number
          user_id?: string
          updated_at?: string
        }
      }
    }
  }
}

export default supabase
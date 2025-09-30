import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'

// Tipos derivados do database schema
type Supplier = Database['public']['Tables']['Supplier']['Row']
type SupplierInsert = Database['public']['Tables']['Supplier']['Insert']
type SupplierUpdate = Database['public']['Tables']['Supplier']['Update']

export interface SupplierData {
  id?: string
  name: string
  document: string
  email?: string
  phone?: string
  address?: {
    street?: string
    number?: string
    complement?: string
    neighborhood?: string
    city?: string
    state?: string
    zipCode?: string
  }
}

export class SuppliersService {
  /**
   * Busca todos os fornecedores do usuário logado
   */
  static async getAll(): Promise<Supplier[]> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { data, error } = await supabase
      .from('Supplier')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true })

    if (error) {
      console.error('Erro ao buscar fornecedores:', error)
      throw new Error(`Erro ao buscar fornecedores: ${error.message}`)
    }

    return data || []
  }

  /**
   * Busca um fornecedor específico pelo ID
   */
  static async getById(id: string): Promise<Supplier | null> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { data, error } = await supabase
      .from('Supplier')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Não encontrado
      }
      console.error('Erro ao buscar fornecedor:', error)
      throw new Error(`Erro ao buscar fornecedor: ${error.message}`)
    }

    return data
  }

  /**
   * Cria um novo fornecedor
   */
  static async create(supplierData: SupplierData): Promise<Supplier> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const insertData: SupplierInsert = {
      ...supplierData,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('Supplier')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar fornecedor:', error)
      
      // Tratamento de erro de documento duplicado
      if (error.code === '23505' && error.message.includes('suppliers_user_document_unique')) {
        throw new Error('Já existe um fornecedor com este documento')
      }
      
      throw new Error(`Erro ao criar fornecedor: ${error.message}`)
    }

    return data
  }

  /**
   * Atualiza um fornecedor existente
   */
  static async update(id: string, supplierData: Partial<SupplierData>): Promise<Supplier> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const updateData: SupplierUpdate = {
      ...supplierData,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('Supplier')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar fornecedor:', error)
      
      // Tratamento de erro de documento duplicado
      if (error.code === '23505' && error.message.includes('suppliers_user_document_unique')) {
        throw new Error('Já existe um fornecedor com este documento')
      }
      
      throw new Error(`Erro ao atualizar fornecedor: ${error.message}`)
    }

    return data
  }

  /**
   * Remove um fornecedor
   */
  static async delete(id: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { error } = await supabase
      .from('Supplier')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Erro ao deletar fornecedor:', error)
      throw new Error(`Erro ao deletar fornecedor: ${error.message}`)
    }

    return true
  }

  /**
   * Busca fornecedores por documento (CNPJ)
   */
  static async findByDocument(document: string): Promise<Supplier | null> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { data, error } = await supabase
      .from('Supplier')
      .select('*')
      .eq('document', document)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Não encontrado
      }
      console.error('Erro ao buscar fornecedor por documento:', error)
      throw new Error(`Erro ao buscar fornecedor: ${error.message}`)
    }

    return data
  }

  /**
   * Busca fornecedores por nome (pesquisa parcial)
   */
  static async searchByName(name: string): Promise<Supplier[]> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { data, error } = await supabase
      .from('Supplier')
      .select('*')
      .eq('user_id', user.id)
      .ilike('name', `%${name}%`)
      .order('name', { ascending: true })

    if (error) {
      console.error('Erro ao pesquisar fornecedores:', error)
      throw new Error(`Erro ao pesquisar fornecedores: ${error.message}`)
    }

    return data || []
  }
}

export default SuppliersService
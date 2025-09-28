import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'

// Tipos derivados do database schema
type Client = Database['public']['Tables']['clients']['Row']
type ClientInsert = Database['public']['Tables']['clients']['Insert']
type ClientUpdate = Database['public']['Tables']['clients']['Update']

export interface ClientData {
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

export class ClientsService {
  /**
   * Busca todos os clientes do usuário logado
   */
  static async getAll(): Promise<Client[]> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true })

    if (error) {
      console.error('Erro ao buscar clientes:', error)
      throw new Error(`Erro ao buscar clientes: ${error.message}`)
    }

    return data || []
  }

  /**
   * Busca um cliente específico pelo ID
   */
  static async getById(id: string): Promise<Client | null> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Não encontrado
      }
      console.error('Erro ao buscar cliente:', error)
      throw new Error(`Erro ao buscar cliente: ${error.message}`)
    }

    return data
  }

  /**
   * Cria um novo cliente
   */
  static async create(clientData: ClientData): Promise<Client> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const insertData: ClientInsert = {
      ...clientData,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('clients')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar cliente:', error)
      
      // Tratamento de erro de documento duplicado
      if (error.code === '23505' && error.message.includes('clients_user_document_unique')) {
        throw new Error('Já existe um cliente com este documento')
      }
      
      throw new Error(`Erro ao criar cliente: ${error.message}`)
    }

    return data
  }

  /**
   * Atualiza um cliente existente
   */
  static async update(id: string, clientData: Partial<ClientData>): Promise<Client> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const updateData: ClientUpdate = {
      ...clientData,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar cliente:', error)
      
      // Tratamento de erro de documento duplicado
      if (error.code === '23505' && error.message.includes('clients_user_document_unique')) {
        throw new Error('Já existe um cliente com este documento')
      }
      
      throw new Error(`Erro ao atualizar cliente: ${error.message}`)
    }

    return data
  }

  /**
   * Remove um cliente
   */
  static async delete(id: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Erro ao deletar cliente:', error)
      throw new Error(`Erro ao deletar cliente: ${error.message}`)
    }

    return true
  }

  /**
   * Busca clientes por documento (CPF/CNPJ)
   */
  static async findByDocument(document: string): Promise<Client | null> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('document', document)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Não encontrado
      }
      console.error('Erro ao buscar cliente por documento:', error)
      throw new Error(`Erro ao buscar cliente: ${error.message}`)
    }

    return data
  }

  /**
   * Busca clientes por nome (pesquisa parcial)
   */
  static async searchByName(name: string): Promise<Client[]> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .ilike('name', `%${name}%`)
      .order('name', { ascending: true })

    if (error) {
      console.error('Erro ao pesquisar clientes:', error)
      throw new Error(`Erro ao pesquisar clientes: ${error.message}`)
    }

    return data || []
  }
}

export default ClientsService
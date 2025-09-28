import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'

// Tipos derivados do database schema
type ServiceType = Database['public']['Tables']['service_types']['Row']
type ServiceTypeInsert = Database['public']['Tables']['service_types']['Insert']
type ServiceTypeUpdate = Database['public']['Tables']['service_types']['Update']

export interface ServiceTypeData {
  id?: string
  code: string
  name: string
  iss_retained?: boolean
  active?: boolean
}

export class ServiceTypesService {
  /**
   * Busca todos os tipos de serviços do usuário logado
   */
  static async getAll(activeOnly: boolean = true): Promise<ServiceType[]> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    let query = supabase
      .from('service_types')
      .select('*')
      .eq('user_id', user.id)

    if (activeOnly) {
      query = query.eq('active', true)
    }

    const { data, error } = await query.order('code', { ascending: true })

    if (error) {
      console.error('Erro ao buscar tipos de serviços:', error)
      throw new Error(`Erro ao buscar tipos de serviços: ${error.message}`)
    }

    return data || []
  }

  /**
   * Busca um tipo de serviço específico pelo ID
   */
  static async getById(id: string): Promise<ServiceType | null> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { data, error } = await supabase
      .from('service_types')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Não encontrado
      }
      console.error('Erro ao buscar tipo de serviço:', error)
      throw new Error(`Erro ao buscar tipo de serviço: ${error.message}`)
    }

    return data
  }

  /**
   * Busca um tipo de serviço pelo código
   */
  static async getByCode(code: string): Promise<ServiceType | null> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { data, error } = await supabase
      .from('service_types')
      .select('*')
      .eq('code', code)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Não encontrado
      }
      console.error('Erro ao buscar tipo de serviço por código:', error)
      throw new Error(`Erro ao buscar tipo de serviço: ${error.message}`)
    }

    return data
  }

  /**
   * Cria um novo tipo de serviço
   */
  static async create(serviceTypeData: ServiceTypeData): Promise<ServiceType> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const insertData: ServiceTypeInsert = {
      ...serviceTypeData,
      user_id: user.id,
      iss_retained: serviceTypeData.iss_retained ?? false,
      active: serviceTypeData.active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('service_types')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar tipo de serviço:', error)
      
      // Tratamento de erro de código duplicado
      if (error.code === '23505' && error.message.includes('service_types_user_code_unique')) {
        throw new Error('Já existe um tipo de serviço com este código')
      }
      
      throw new Error(`Erro ao criar tipo de serviço: ${error.message}`)
    }

    return data
  }

  /**
   * Atualiza um tipo de serviço existente
   */
  static async update(id: string, serviceTypeData: Partial<ServiceTypeData>): Promise<ServiceType> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const updateData: ServiceTypeUpdate = {
      ...serviceTypeData,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('service_types')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar tipo de serviço:', error)
      
      // Tratamento de erro de código duplicado
      if (error.code === '23505' && error.message.includes('service_types_user_code_unique')) {
        throw new Error('Já existe um tipo de serviço com este código')
      }
      
      throw new Error(`Erro ao atualizar tipo de serviço: ${error.message}`)
    }

    return data
  }

  /**
   * Remove um tipo de serviço
   */
  static async delete(id: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { error } = await supabase
      .from('service_types')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Erro ao deletar tipo de serviço:', error)
      throw new Error(`Erro ao deletar tipo de serviço: ${error.message}`)
    }

    return true
  }

  /**
   * Ativa/desativa um tipo de serviço
   */
  static async toggleActive(id: string, active: boolean): Promise<ServiceType> {
    return this.update(id, { active })
  }

  /**
   * Busca tipos de serviço por nome (pesquisa parcial)
   */
  static async searchByName(name: string, activeOnly: boolean = true): Promise<ServiceType[]> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    let query = supabase
      .from('service_types')
      .select('*')
      .eq('user_id', user.id)
      .ilike('name', `%${name}%`)

    if (activeOnly) {
      query = query.eq('active', true)
    }

    const { data, error } = await query.order('name', { ascending: true })

    if (error) {
      console.error('Erro ao pesquisar tipos de serviços:', error)
      throw new Error(`Erro ao pesquisar tipos de serviços: ${error.message}`)
    }

    return data || []
  }

  /**
   * Importa tipos de serviços em lote
   */
  static async importMany(serviceTypes: ServiceTypeData[]): Promise<ServiceType[]> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const insertData: ServiceTypeInsert[] = serviceTypes.map(serviceType => ({
      ...serviceType,
      user_id: user.id,
      iss_retained: serviceType.iss_retained ?? false,
      active: serviceType.active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    const { data, error } = await supabase
      .from('service_types')
      .insert(insertData)
      .select()

    if (error) {
      console.error('Erro ao importar tipos de serviços:', error)
      throw new Error(`Erro ao importar tipos de serviços: ${error.message}`)
    }

    return data || []
  }
}

export default ServiceTypesService
import { supabase } from '../lib/supabase'

// Tipos para service type
interface ServiceType {
  id: string
  code: string
  name: string
  issRetained: boolean
  active: boolean
  createdAt: string
  updatedAt: string
}

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
      .from('ServiceType')
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
      .from('ServiceType')
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
      .from('ServiceType')
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
    console.log('🚀 [ServiceTypesService] Iniciando criação...');
    console.log('📋 [ServiceTypesService] Dados recebidos:', serviceTypeData);
    
    console.log('🔍 [ServiceTypesService] Buscando usuário autenticado...');
    
    let user;
    
    try {
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()
      
      console.log('📡 [ServiceTypesService] Resposta getUser:', { user: authUser?.id, error: userError });
      
      if (userError) {
        console.error('❌ [ServiceTypesService] Erro ao buscar usuário:', userError);
        throw new Error(`Erro de autenticação: ${userError.message}`);
      }
      
      if (!authUser) {
        console.error('❌ [ServiceTypesService] Usuário não encontrado');
        throw new Error('Usuário não autenticado')
      }
      
      user = authUser;
      console.log('👤 [ServiceTypesService] Usuário autenticado:', user.id);
    } catch (authError) {
      console.error('💥 [ServiceTypesService] Erro na autenticação:', authError);
      throw authError;
    }

    const insertData = {
      code: serviceTypeData.code,
      name: serviceTypeData.name,
      issRetained: serviceTypeData.iss_retained ?? false,
      active: serviceTypeData.active ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    console.log('📤 [ServiceTypesService] Dados para inserção:', insertData);

    const { data, error } = await supabase
      .from('ServiceType')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('❌ [ServiceTypesService] Erro ao criar tipo de serviço:', error)
      
      // Tratamento de erro de código duplicado
      if (error.code === '23505' && error.message.includes('ServiceType.*unique')) {
        throw new Error('Já existe um tipo de serviço com este código')
      }
      
      throw new Error(`Erro ao criar tipo de serviço: ${error.message}`)
    }
    
    console.log('✅ [ServiceTypesService] Tipo de serviço criado com sucesso:', data);
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

    const updateData = {
      code: serviceTypeData.code,
      name: serviceTypeData.name,
      issRetained: serviceTypeData.iss_retained ?? false,
      active: serviceTypeData.active ?? true,
      updatedAt: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('ServiceType')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar tipo de serviço:', error)
      
      // Tratamento de erro de código duplicado
      if (error.code === '23505' && error.message.includes('ServiceType.*unique')) {
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
      .from('ServiceType')
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
      .from('ServiceType')
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

    const insertData = serviceTypes.map(serviceType => ({
      code: serviceType.code,
      name: serviceType.name,
      issRetained: serviceType.iss_retained ?? false,
      active: serviceType.active ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }))

    const { data, error } = await supabase
      .from('ServiceType')
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
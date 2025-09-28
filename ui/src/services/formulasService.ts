import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'

// Tipos derivados do database schema
type FormulaGroup = Database['public']['Tables']['formula_groups']['Row']
type FormulaGroupInsert = Database['public']['Tables']['formula_groups']['Insert']
type FormulaGroupUpdate = Database['public']['Tables']['formula_groups']['Update']

type Formula = Database['public']['Tables']['formulas']['Row']
type FormulaInsert = Database['public']['Tables']['formulas']['Insert']
type FormulaUpdate = Database['public']['Tables']['formulas']['Update']

type FormulaRow = Database['public']['Tables']['formula_rows']['Row']
type FormulaRowInsert = Database['public']['Tables']['formula_rows']['Insert']
type FormulaRowUpdate = Database['public']['Tables']['formula_rows']['Update']

export interface FormulaGroupData {
  id?: string
  name: string
  description?: string
  is_active?: boolean
}

export interface FormulaData {
  id?: string
  group_id: string
  name: string
  description?: string
  is_active?: boolean
}

export interface FormulaRowData {
  id?: string
  formula_id: string
  val_min: number
  val_max: number
  indice: number
  fator_redutor?: number
  iss_retido_das?: boolean
  order_position?: number
}

// Tipo completo com relacionamentos
export interface FormulaGroupWithFormulas extends FormulaGroup {
  formulas?: FormulaWithRows[]
}

export interface FormulaWithRows extends Formula {
  rows?: FormulaRow[]
  group?: FormulaGroup
}

export class FormulasService {
  // ================================================
  // CRUD - GRUPOS DE FÓRMULAS
  // ================================================

  /**
   * Busca todos os grupos de fórmulas do usuário
   */
  static async getAllGroups(activeOnly: boolean = true): Promise<FormulaGroup[]> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    let query = supabase
      .from('formula_groups')
      .select('*')
      .eq('user_id', user.id)

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query.order('name', { ascending: true })

    if (error) {
      console.error('Erro ao buscar grupos de fórmulas:', error)
      throw new Error(`Erro ao buscar grupos de fórmulas: ${error.message}`)
    }

    return data || []
  }

  /**
   * Busca grupo de fórmulas por ID com suas fórmulas
   */
  static async getGroupWithFormulas(groupId: string): Promise<FormulaGroupWithFormulas | null> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { data: group, error: groupError } = await supabase
      .from('formula_groups')
      .select('*')
      .eq('id', groupId)
      .eq('user_id', user.id)
      .single()

    if (groupError) {
      if (groupError.code === 'PGRST116') {
        return null
      }
      console.error('Erro ao buscar grupo:', groupError)
      throw new Error(`Erro ao buscar grupo: ${groupError.message}`)
    }

    // Buscar fórmulas do grupo
    const formulas = await this.getFormulasByGroup(groupId)

    return {
      ...group,
      formulas
    }
  }

  /**
   * Cria um novo grupo de fórmulas
   */
  static async createGroup(groupData: FormulaGroupData): Promise<FormulaGroup> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const insertData: FormulaGroupInsert = {
      ...groupData,
      user_id: user.id,
      is_active: groupData.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('formula_groups')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar grupo de fórmulas:', error)
      throw new Error(`Erro ao criar grupo: ${error.message}`)
    }

    return data
  }

  /**
   * Atualiza um grupo de fórmulas
   */
  static async updateGroup(groupId: string, groupData: Partial<FormulaGroupData>): Promise<FormulaGroup> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const updateData: FormulaGroupUpdate = {
      ...groupData,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('formula_groups')
      .update(updateData)
      .eq('id', groupId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar grupo:', error)
      throw new Error(`Erro ao atualizar grupo: ${error.message}`)
    }

    return data
  }

  /**
   * Deleta um grupo de fórmulas (e suas fórmulas em cascata)
   */
  static async deleteGroup(groupId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { error } = await supabase
      .from('formula_groups')
      .delete()
      .eq('id', groupId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Erro ao deletar grupo:', error)
      throw new Error(`Erro ao deletar grupo: ${error.message}`)
    }

    return true
  }

  // ================================================
  // CRUD - FÓRMULAS
  // ================================================

  /**
   * Busca fórmulas de um grupo
   */
  static async getFormulasByGroup(groupId: string): Promise<FormulaWithRows[]> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { data: formulas, error } = await supabase
      .from('formulas')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('Erro ao buscar fórmulas:', error)
      throw new Error(`Erro ao buscar fórmulas: ${error.message}`)
    }

    // Buscar linhas de cada fórmula
    const formulasWithRows: FormulaWithRows[] = []
    
    for (const formula of formulas || []) {
      const rows = await this.getFormulaRows(formula.id)
      formulasWithRows.push({
        ...formula,
        rows
      })
    }

    return formulasWithRows
  }

  /**
   * Cria uma nova fórmula
   */
  static async createFormula(formulaData: FormulaData): Promise<Formula> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const insertData: FormulaInsert = {
      ...formulaData,
      user_id: user.id,
      is_active: formulaData.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('formulas')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar fórmula:', error)
      throw new Error(`Erro ao criar fórmula: ${error.message}`)
    }

    return data
  }

  /**
   * Atualiza uma fórmula
   */
  static async updateFormula(formulaId: string, formulaData: Partial<FormulaData>): Promise<Formula> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const updateData: FormulaUpdate = {
      ...formulaData,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('formulas')
      .update(updateData)
      .eq('id', formulaId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar fórmula:', error)
      throw new Error(`Erro ao atualizar fórmula: ${error.message}`)
    }

    return data
  }

  /**
   * Deleta uma fórmula (e suas linhas em cascata)
   */
  static async deleteFormula(formulaId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { error } = await supabase
      .from('formulas')
      .delete()
      .eq('id', formulaId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Erro ao deletar fórmula:', error)
      throw new Error(`Erro ao deletar fórmula: ${error.message}`)
    }

    return true
  }

  // ================================================
  // CRUD - LINHAS DE FÓRMULAS
  // ================================================

  /**
   * Busca linhas de uma fórmula
   */
  static async getFormulaRows(formulaId: string): Promise<FormulaRow[]> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { data, error } = await supabase
      .from('formula_rows')
      .select('*')
      .eq('formula_id', formulaId)
      .eq('user_id', user.id)
      .order('order_position', { ascending: true })

    if (error) {
      console.error('Erro ao buscar linhas da fórmula:', error)
      throw new Error(`Erro ao buscar linhas: ${error.message}`)
    }

    return data || []
  }

  /**
   * Cria uma nova linha de fórmula
   */
  static async createFormulaRow(rowData: FormulaRowData): Promise<FormulaRow> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    // Se não foi especificada ordem, usar a próxima disponível
    let order_position = rowData.order_position
    if (order_position === undefined) {
      const existingRows = await this.getFormulaRows(rowData.formula_id)
      order_position = Math.max(0, ...existingRows.map(r => r.order_position)) + 1
    }

    const insertData: FormulaRowInsert = {
      ...rowData,
      user_id: user.id,
      fator_redutor: rowData.fator_redutor ?? 0,
      iss_retido_das: rowData.iss_retido_das ?? false,
      order_position,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('formula_rows')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar linha da fórmula:', error)
      throw new Error(`Erro ao criar linha: ${error.message}`)
    }

    return data
  }

  /**
   * Atualiza uma linha de fórmula
   */
  static async updateFormulaRow(rowId: string, rowData: Partial<FormulaRowData>): Promise<FormulaRow> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const updateData: FormulaRowUpdate = {
      ...rowData,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('formula_rows')
      .update(updateData)
      .eq('id', rowId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar linha:', error)
      throw new Error(`Erro ao atualizar linha: ${error.message}`)
    }

    return data
  }

  /**
   * Deleta uma linha de fórmula
   */
  static async deleteFormulaRow(rowId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    const { error } = await supabase
      .from('formula_rows')
      .delete()
      .eq('id', rowId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Erro ao deletar linha:', error)
      throw new Error(`Erro ao deletar linha: ${error.message}`)
    }

    return true
  }

  // ================================================
  // FUNÇÕES AUXILIARES
  // ================================================

  /**
   * Reordena linhas de uma fórmula
   */
  static async reorderFormulaRows(formulaId: string, rowIds: string[]): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    try {
      // Atualizar posição de cada linha
      const updatePromises = rowIds.map((rowId, index) => 
        supabase
          .from('formula_rows')
          .update({ order_position: index + 1 })
          .eq('id', rowId)
          .eq('user_id', user.id)
      )

      await Promise.all(updatePromises)
      return true
    } catch (error) {
      console.error('Erro ao reordenar linhas:', error)
      throw new Error('Erro ao reordenar linhas')
    }
  }

  /**
   * Valida se uma nova linha não conflita com existentes
   */
  static async validateRowRange(formulaId: string, valMin: number, valMax: number, excludeRowId?: string): Promise<boolean> {
    const rows = await this.getFormulaRows(formulaId)
    
    return !rows.some(row => {
      if (excludeRowId && row.id === excludeRowId) return false
      
      return (
        (valMin >= row.val_min && valMin <= row.val_max) ||
        (valMax >= row.val_min && valMax <= row.val_max) ||
        (row.val_min >= valMin && row.val_min <= valMax) ||
        (row.val_max >= valMin && row.val_max <= valMax)
      )
    })
  }
}

export default FormulasService
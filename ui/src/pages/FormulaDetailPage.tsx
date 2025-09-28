import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import FormulasService, { 
  type FormulaWithRows, 
  type FormulaRowData 
} from '../services/formulasService'
import type { Database } from '../lib/supabase'
import { 
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChevronRightIcon,
  TableCellsIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

type FormulaRow = Database['public']['Tables']['formula_rows']['Row']

const FormulaDetailPage: React.FC = () => {
  const { formulaId } = useParams<{ formulaId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [formula, setFormula] = useState<FormulaWithRows | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingRow, setEditingRow] = useState<FormulaRow | null>(null)
  
  // Form state
  const [formData, setFormData] = useState<FormulaRowData>({
    formula_id: formulaId || '',
    val_min: 0,
    val_max: 0,
    indice: 0,
    fator_redutor: 0,
    iss_retido_das: false
  })

  const [validationError, setValidationError] = useState<string | null>(null)

  const loadFormulaData = async () => {
    if (!formulaId) return
    
    try {
      setLoading(true)
      // Buscar a fórmula com suas linhas
      const formulas = await FormulasService.getFormulasByGroup('')
      const foundFormula = formulas.find(f => f.id === formulaId)
      
      if (!foundFormula) {
        navigate('/admin/formulas')
        return
      }
      
      setFormula(foundFormula)
    } catch (error) {
      console.error('Erro ao carregar fórmula:', error)
      navigate('/admin/formulas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && formulaId) {
      loadFormulaData()
    }
  }, [user, formulaId])

  const validateRowData = async (rowData: FormulaRowData): Promise<string | null> => {
    // Validar valores mínimo e máximo
    if (rowData.val_min >= rowData.val_max) {
      return 'O valor mínimo deve ser menor que o valor máximo'
    }

    // Validar se não há conflito com outras linhas
    if (formulaId) {
      const isValid = await FormulasService.validateRowRange(
        formulaId, 
        rowData.val_min, 
        rowData.val_max,
        editingRow?.id
      )
      
      if (!isValid) {
        return 'Esta faixa de valores conflita com uma linha existente'
      }
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setValidationError(null)
      
      // Validar dados
      const error = await validateRowData(formData)
      if (error) {
        setValidationError(error)
        return
      }
      
      if (editingRow) {
        await FormulasService.updateFormulaRow(editingRow.id, formData)
      } else {
        await FormulasService.createFormulaRow(formData)
      }
      
      await loadFormulaData()
      resetForm()
    } catch (error) {
      console.error('Erro ao salvar linha:', error)
      alert('Erro ao salvar linha. Tente novamente.')
    }
  }

  const handleDelete = async (rowId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta linha?')) {
      return
    }

    try {
      await FormulasService.deleteFormulaRow(rowId)
      await loadFormulaData()
    } catch (error) {
      console.error('Erro ao excluir linha:', error)
      alert('Erro ao excluir linha. Tente novamente.')
    }
  }

  const resetForm = () => {
    setFormData({
      formula_id: formulaId || '',
      val_min: 0,
      val_max: 0,
      indice: 0,
      fator_redutor: 0,
      iss_retido_das: false
    })
    setShowCreateModal(false)
    setEditingRow(null)
    setValidationError(null)
  }

  const openEditModal = (row: FormulaRow) => {
    setFormData({
      formula_id: row.formula_id,
      val_min: row.val_min,
      val_max: row.val_max,
      indice: row.indice,
      fator_redutor: row.fator_redutor || 0,
      iss_retido_das: row.iss_retido_das || false
    })
    setEditingRow(row)
    setShowCreateModal(true)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(4)}%`
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!formula) {
    return (
      <div className="text-center py-12">
        <TableCellsIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Fórmula não encontrada</h3>
        <p className="mt-1 text-sm text-gray-500">A fórmula solicitada não existe ou foi excluída.</p>
        <div className="mt-6">
          <Link
            to="/admin/formulas"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Voltar aos Grupos
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm">
        <Link 
          to="/admin/formulas" 
          className="text-gray-500 hover:text-gray-700"
        >
          Grupos de Fórmulas
        </Link>
        <ChevronRightIcon className="h-4 w-4 text-gray-400" />
        <Link 
          to={`/admin/formulas/groups/${formula.group_id}`} 
          className="text-gray-500 hover:text-gray-700"
        >
          {formula.group?.name || 'Grupo'}
        </Link>
        <ChevronRightIcon className="h-4 w-4 text-gray-400" />
        <span className="text-gray-900 font-medium">{formula.name}</span>
      </nav>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-start space-x-3">
          <button
            onClick={() => navigate(`/admin/formulas/groups/${formula.group_id}`)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{formula.name}</h1>
              {!formula.is_active && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  Inativo
                </span>
              )}
            </div>
            {formula.description && (
              <p className="text-gray-600 mt-1">{formula.description}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              {formula.rows?.length || 0} linha(s) de cálculo
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Nova Linha
        </button>
      </div>

      {/* Tabela de Linhas */}
      {!formula.rows || formula.rows.length === 0 ? (
        <div className="text-center py-12">
          <TableCellsIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma linha encontrada</h3>
          <p className="mt-1 text-sm text-gray-500">Comece criando a primeira linha de cálculo desta fórmula.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Criar Linha
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Faixa de Valores
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Índice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fator Redutor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ISS Retido DAS
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {formula.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(row.val_min)} - {formatCurrency(row.val_max)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatPercentage(row.indice)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {row.fator_redutor ? formatPercentage(row.fator_redutor) : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {row.iss_retido_das ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircleIcon className="h-5 w-5 text-gray-300" />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(row)}
                          className="p-1 text-gray-400 hover:text-yellow-600 rounded hover:bg-yellow-50"
                          title="Editar linha"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                          title="Excluir linha"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Criação/Edição */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">
                {editingRow ? 'Editar Linha' : 'Nova Linha'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Fechar</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {validationError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {validationError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="val_min" className="block text-sm font-medium text-gray-700">
                    Valor Mínimo (R$) *
                  </label>
                  <input
                    type="number"
                    id="val_min"
                    required
                    step="0.01"
                    min="0"
                    value={formData.val_min}
                    onChange={(e) => setFormData({ ...formData, val_min: parseFloat(e.target.value) || 0 })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="val_max" className="block text-sm font-medium text-gray-700">
                    Valor Máximo (R$) *
                  </label>
                  <input
                    type="number"
                    id="val_max"
                    required
                    step="0.01"
                    min="0"
                    value={formData.val_max}
                    onChange={(e) => setFormData({ ...formData, val_max: parseFloat(e.target.value) || 0 })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="indice" className="block text-sm font-medium text-gray-700">
                  Índice (%) *
                </label>
                <input
                  type="number"
                  id="indice"
                  required
                  step="0.0001"
                  min="0"
                  max="100"
                  value={formData.indice}
                  onChange={(e) => setFormData({ ...formData, indice: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="fator_redutor" className="block text-sm font-medium text-gray-700">
                  Fator Redutor (%)
                </label>
                <input
                  type="number"
                  id="fator_redutor"
                  step="0.0001"
                  min="0"
                  max="100"
                  value={formData.fator_redutor}
                  onChange={(e) => setFormData({ ...formData, fator_redutor: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  id="iss_retido_das"
                  type="checkbox"
                  checked={formData.iss_retido_das}
                  onChange={(e) => setFormData({ ...formData, iss_retido_das: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="iss_retido_das" className="ml-2 block text-sm text-gray-900">
                  ISS Retido DAS
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingRow ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default FormulaDetailPage
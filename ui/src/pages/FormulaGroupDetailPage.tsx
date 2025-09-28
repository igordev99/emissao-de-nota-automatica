import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import FormulasService, { 
  type FormulaGroupWithFormulas, 
  type FormulaWithRows, 
  type FormulaData 
} from '../services/formulasService'
import { 
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CalculatorIcon,
  ChevronRightIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'

const FormulaGroupDetailPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [group, setGroup] = useState<FormulaGroupWithFormulas | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingFormula, setEditingFormula] = useState<FormulaWithRows | null>(null)
  
  // Form state
  const [formData, setFormData] = useState<FormulaData>({
    group_id: groupId || '',
    name: '',
    description: '',
    is_active: true
  })

  const loadGroupData = async () => {
    if (!groupId) return
    
    try {
      setLoading(true)
      const data = await FormulasService.getGroupWithFormulas(groupId)
      if (!data) {
        navigate('/admin/formulas')
        return
      }
      setGroup(data)
    } catch (error) {
      console.error('Erro ao carregar grupo:', error)
      navigate('/admin/formulas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && groupId) {
      loadGroupData()
    }
  }, [user, groupId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingFormula) {
        await FormulasService.updateFormula(editingFormula.id, formData)
      } else {
        await FormulasService.createFormula(formData)
      }
      
      await loadGroupData()
      resetForm()
    } catch (error) {
      console.error('Erro ao salvar fórmula:', error)
      alert('Erro ao salvar fórmula. Tente novamente.')
    }
  }

  const handleDelete = async (formulaId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta fórmula? Esta ação também excluirá todas as linhas da fórmula.')) {
      return
    }

    try {
      await FormulasService.deleteFormula(formulaId)
      await loadGroupData()
    } catch (error) {
      console.error('Erro ao excluir fórmula:', error)
      alert('Erro ao excluir fórmula. Tente novamente.')
    }
  }

  const resetForm = () => {
    setFormData({
      group_id: groupId || '',
      name: '',
      description: '',
      is_active: true
    })
    setShowCreateModal(false)
    setEditingFormula(null)
  }

  const openEditModal = (formula: FormulaWithRows) => {
    setFormData({
      group_id: formula.group_id,
      name: formula.name,
      description: formula.description || '',
      is_active: formula.is_active
    })
    setEditingFormula(formula)
    setShowCreateModal(true)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="text-center py-12">
        <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Grupo não encontrado</h3>
        <p className="mt-1 text-sm text-gray-500">O grupo solicitado não existe ou foi excluído.</p>
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
        <span className="text-gray-900 font-medium">{group.name}</span>
      </nav>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-start space-x-3">
          <button
            onClick={() => navigate('/admin/formulas')}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
              {!group.is_active && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  Inativo
                </span>
              )}
            </div>
            {group.description && (
              <p className="text-gray-600 mt-1">{group.description}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              {group.formulas?.length || 0} fórmula(s) neste grupo
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Nova Fórmula
        </button>
      </div>

      {/* Lista de Fórmulas */}
      {!group.formulas || group.formulas.length === 0 ? (
        <div className="text-center py-12">
          <CalculatorIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma fórmula encontrada</h3>
          <p className="mt-1 text-sm text-gray-500">Comece criando sua primeira fórmula neste grupo.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Criar Fórmula
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg">
          <ul className="divide-y divide-gray-200">
            {group.formulas.map((formula) => (
              <li key={formula.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${formula.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <CalculatorIcon className={`h-5 w-5 ${formula.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-gray-900">{formula.name}</h3>
                        {!formula.is_active && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            Inativo
                          </span>
                        )}
                      </div>
                      {formula.description && (
                        <p className="text-sm text-gray-500 mt-1">{formula.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                        <span>{formula.rows?.length || 0} linha(s)</span>
                        <span>Criado em {new Date(formula.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/admin/formulas/formulas/${formula.id}`}
                      className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                      title="Gerenciar linhas"
                    >
                      <DocumentTextIcon className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => openEditModal(formula)}
                      className="p-2 text-gray-400 hover:text-yellow-600 rounded-lg hover:bg-yellow-50"
                      title="Editar fórmula"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(formula.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      title="Excluir fórmula"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                    <Link
                      to={`/admin/formulas/formulas/${formula.id}`}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <ChevronRightIcon className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Modal de Criação/Edição */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">
                {editingFormula ? 'Editar Fórmula' : 'Nova Fórmula'}
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nome da Fórmula *
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Anexo III"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Descrição
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Descrição opcional da fórmula..."
                />
              </div>

              <div className="flex items-center">
                <input
                  id="is_active"
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Fórmula ativa
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
                  {editingFormula ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default FormulaGroupDetailPage
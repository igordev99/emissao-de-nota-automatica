import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import FormulasService, { type FormulaGroup } from '../services/formulasService'
import { 
  FolderIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

const FormulaGroupsPage: React.FC = () => {
  const { user } = useAuth()
  const [groups, setGroups] = useState<FormulaGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<FormulaGroup | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  })

  const loadGroups = async () => {
    try {
      setLoading(true)
      const data = await FormulasService.getAllGroups(false) // Incluir inativos
      setGroups(data)
    } catch (error) {
      console.error('Erro ao carregar grupos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadGroups()
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingGroup) {
        await FormulasService.updateGroup(editingGroup.id, formData)
      } else {
        await FormulasService.createGroup(formData)
      }
      
      await loadGroups()
      resetForm()
    } catch (error) {
      console.error('Erro ao salvar grupo:', error)
      alert('Erro ao salvar grupo. Tente novamente.')
    }
  }

  const handleDelete = async (groupId: string) => {
    if (!confirm('Tem certeza que deseja excluir este grupo? Esta ação também excluirá todas as fórmulas do grupo.')) {
      return
    }

    try {
      await FormulasService.deleteGroup(groupId)
      await loadGroups()
    } catch (error) {
      console.error('Erro ao excluir grupo:', error)
      alert('Erro ao excluir grupo. Tente novamente.')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      is_active: true
    })
    setShowCreateModal(false)
    setEditingGroup(null)
  }

  const openEditModal = (group: FormulaGroup) => {
    setFormData({
      name: group.name,
      description: group.description || '',
      is_active: group.is_active
    })
    setEditingGroup(group)
    setShowCreateModal(true)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grupos de Fórmulas</h1>
          <p className="text-gray-600">Gerencie os grupos que organizam suas fórmulas de cálculo</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Novo Grupo
        </button>
      </div>

      {/* Lista de Grupos */}
      {groups.length === 0 ? (
        <div className="text-center py-12">
          <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum grupo encontrado</h3>
          <p className="mt-1 text-sm text-gray-500">Comece criando seu primeiro grupo de fórmulas.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Criar Grupo
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg">
          <ul className="divide-y divide-gray-200">
            {groups.map((group) => (
              <li key={group.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${group.is_active ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <FolderIcon className={`h-5 w-5 ${group.is_active ? 'text-blue-600' : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-gray-900">{group.name}</h3>
                        {!group.is_active && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            Inativo
                          </span>
                        )}
                      </div>
                      {group.description && (
                        <p className="text-sm text-gray-500 mt-1">{group.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Criado em {new Date(group.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/admin/formulas/groups/${group.id}`}
                      className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                      title="Ver fórmulas"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => openEditModal(group)}
                      className="p-2 text-gray-400 hover:text-yellow-600 rounded-lg hover:bg-yellow-50"
                      title="Editar grupo"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(group.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      title="Excluir grupo"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                    <Link
                      to={`/admin/formulas/groups/${group.id}`}
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
                {editingGroup ? 'Editar Grupo' : 'Novo Grupo'}
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
                  Nome do Grupo *
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Emissão de NF Paulista"
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
                  placeholder="Descrição opcional do grupo..."
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
                  Grupo ativo
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
                  {editingGroup ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default FormulaGroupsPage
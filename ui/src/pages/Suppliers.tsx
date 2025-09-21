import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supplierService } from '../services/suppliers';
import type { Supplier, PaginatedResponse } from '../types';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<PaginatedResponse<Supplier> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const loadSuppliers = async (page = 1, searchTerm = '') => {
    try {
      setLoading(true);
      const data = await supplierService.getSuppliers({
        page,
        pageSize: 10,
        search: searchTerm || undefined
      });
      setSuppliers(data);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers(currentPage, search);
  }, [currentPage]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadSuppliers(1, search);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este fornecedor?')) return;

    try {
      setDeleteLoading(id);
      await supplierService.deleteSupplier(id);
      loadSuppliers(currentPage, search);
    } catch (error) {
      console.error('Erro ao excluir fornecedor:', error);
      alert('Erro ao excluir fornecedor');
    } finally {
      setDeleteLoading(null);
    }
  };

  const formatCNPJ = (cnpj: string) => {
    // CNPJ: 00.000.000/0000-00
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
            <p className="mt-2 text-sm text-gray-600">
              Gerencie os fornecedores do sistema
            </p>
          </div>
          <Link
            to="/suppliers/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Novo Fornecedor
          </Link>
        </div>
      </div>

      {/* Barra de pesquisa */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, CNPJ ou email..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Buscar
          </button>
        </form>
      </div>

      {/* Tabela */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : suppliers?.items.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <p className="text-lg">Nenhum fornecedor encontrado</p>
              <p className="text-sm mt-2">
                {search ? 'Tente ajustar os filtros de busca.' : 'Comece cadastrando seu primeiro fornecedor.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-gray-200">
              {suppliers?.items.map((supplier) => (
                <li key={supplier.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {supplier.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <h3 className="text-sm font-medium text-gray-900">
                              {supplier.name}
                            </h3>
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              CNPJ
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-gray-600">
                            <p>{formatCNPJ(supplier.cnpj)}</p>
                            {supplier.email && <p>{supplier.email}</p>}
                            {supplier.phone && <p>{supplier.phone}</p>}
                          </div>
                          {supplier.address && (
                            <div className="mt-1 text-xs text-gray-500">
                              {supplier.address.street}, {supplier.address.number}
                              {supplier.address.complement && ` - ${supplier.address.complement}`}
                              <br />
                              {supplier.address.neighborhood}, {supplier.address.city} - {supplier.address.state}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/suppliers/${supplier.id}/edit`}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Editar"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(supplier.id)}
                          disabled={deleteLoading === supplier.id}
                          className="text-red-600 hover:text-red-900 p-1 disabled:opacity-50"
                          title="Excluir"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Paginação */}
            {suppliers && suppliers.total > suppliers.items.length && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage * 10 >= suppliers.total}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Próximo
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Mostrando{' '}
                      <span className="font-medium">
                        {(currentPage - 1) * 10 + 1}
                      </span>{' '}
                      a{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * 10, suppliers.total)}
                      </span>{' '}
                      de{' '}
                      <span className="font-medium">{suppliers.total}</span>{' '}
                      resultados
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <span className="sr-only">Anterior</span>
                        ‹
                      </button>
                      <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage * 10 >= suppliers.total}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <span className="sr-only">Próximo</span>
                        ›
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
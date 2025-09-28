import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { ClientsService } from '../services/clientsService';
import type { Database } from '../lib/supabase';

type Client = Database['public']['Tables']['clients']['Row'];

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await ClientsService.getAll();
      setClients(data);
      setFilteredClients(data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      alert('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(client => 
        client.name.toLowerCase().includes(search.toLowerCase()) ||
        client.document.includes(search) ||
        (client.email && client.email.toLowerCase().includes(search.toLowerCase()))
      );
      setFilteredClients(filtered);
    }
  }, [search, clients]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // A filtragem já é feita no useEffect acima
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    try {
      setDeleteLoading(id);
      await ClientsService.delete(id);
      await loadClients(); // Recarrega a lista
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      alert('Erro ao excluir cliente');
    } finally {
      setDeleteLoading(null);
    }
  };

  const formatDocument = (document: string) => {
    if (document.length === 11) {
      // CPF: 000.000.000-00
      return document.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (document.length === 14) {
      // CNPJ: 00.000.000/0000-00
      return document.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return document;
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="mt-2 text-sm text-gray-600">
              Gerencie os clientes do sistema
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/clients/import"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowUpTrayIcon className="-ml-1 mr-2 h-5 w-5" />
              Importar Clientes
            </Link>
            <Link
              to="/clients/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Novo Cliente
            </Link>
          </div>
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
                placeholder="Buscar por nome, documento ou email..."
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
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <p className="text-lg">Nenhum cliente encontrado</p>
              <p className="text-sm mt-2">
                {search ? 'Tente ajustar os filtros de busca.' : 'Comece cadastrando seu primeiro cliente.'}
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredClients.map((client: Client) => (
                <li key={client.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {client.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <h3 className="text-sm font-medium text-gray-900">
                              {client.name}
                            </h3>
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {client.document.length === 11 ? 'CPF' : 'CNPJ'}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-gray-600">
                            <p>{formatDocument(client.document)}</p>
                            {client.email && <p>{client.email}</p>}
                            {client.phone && <p>{client.phone}</p>}
                          </div>
                          {client.address && (
                            <div className="mt-1 text-xs text-gray-500">
                              {client.address.street}, {client.address.number}
                              {client.address.complement && ` - ${client.address.complement}`}
                              <br />
                              {client.address.neighborhood}, {client.address.city} - {client.address.state}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/clients/${client.id}/edit`}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Editar"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(client.id)}
                          disabled={deleteLoading === client.id}
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
        )}
      </div>
    </div>
  );
}
import api from './api';
import type { Client, PaginatedResponse } from '../types';

export interface CreateClientData {
  name: string;
  document: string;
  email?: string;
  phone?: string;
  address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export const clientService = {
  // Listar clientes
  async getClients(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<PaginatedResponse<Client>> {
    const response = await api.get('/api/clients', { params });
    return response.data;
  },

  // Obter cliente por ID
  async getClientById(id: string): Promise<Client> {
    const response = await api.get(`/api/clients/${id}`);
    return response.data;
  },

  // Criar cliente
  async createClient(data: CreateClientData): Promise<Client> {
    const response = await api.post('/api/clients', data);
    return response.data;
  },

  // Atualizar cliente
  async updateClient(id: string, data: Partial<CreateClientData>): Promise<Client> {
    const response = await api.put(`/api/clients/${id}`, data);
    return response.data;
  },

  // Deletar cliente
  async deleteClient(id: string): Promise<void> {
    await api.delete(`/api/clients/${id}`);
  }
};
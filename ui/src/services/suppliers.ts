import type { Supplier, PaginatedResponse } from '../types';

import api from './api';

export interface CreateSupplierData {
  name: string;
  cnpj: string;
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

export const supplierService = {
  // Listar fornecedores
  async getSuppliers(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<PaginatedResponse<Supplier>> {
    const response = await api.get('/api/suppliers', { params });
    return response.data;
  },

  // Obter fornecedor por ID
  async getSupplierById(id: string): Promise<Supplier> {
    const response = await api.get(`/api/suppliers/${id}`);
    return response.data;
  },

  // Criar fornecedor
  async createSupplier(data: CreateSupplierData): Promise<Supplier> {
    // Converter cnpj para document para o backend
    const backendData = {
      name: data.name,
      document: data.cnpj, // cnpj -> document
      email: data.email,
      phone: data.phone,
      address: data.address
    };
    const response = await api.post('/api/suppliers', backendData);
    return response.data;
  },

  // Atualizar fornecedor
  async updateSupplier(id: string, data: Partial<CreateSupplierData>): Promise<Supplier> {
    // Converter cnpj para document se presente
    const backendData: any = { ...data };
    if (data.cnpj) {
      backendData.document = data.cnpj; // cnpj -> document
      delete backendData.cnpj;
    }
    const response = await api.put(`/api/suppliers/${id}`, backendData);
    return response.data;
  },

  // Deletar fornecedor
  async deleteSupplier(id: string): Promise<void> {
    await api.delete(`/api/suppliers/${id}`);
  }
};
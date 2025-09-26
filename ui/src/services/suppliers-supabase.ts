import type { Supplier, PaginatedResponse } from '../types';
import { supabase } from '../lib/supabase';

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

export const supplierSupabaseService = {
  // Listar fornecedores
  async getSuppliers(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<PaginatedResponse<Supplier>> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const offset = (page - 1) * pageSize;

    // Construir query base
    let query = supabase
      .from('Supplier')
      .select('*', { count: 'exact' })
      .order('createdAt', { ascending: false })
      .range(offset, offset + pageSize - 1);

    // Adicionar busca se especificada
    if (params?.search) {
      query = query.or(`name.ilike.%${params.search}%,document.ilike.%${params.search}%,email.ilike.%${params.search}%`);
    }

    const { data, count, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // Converter document para cnpj para compatibilidade com o frontend
    const mappedData = (data || []).map(supplier => ({
      ...supplier,
      cnpj: supplier.document // document -> cnpj
    }));

    return {
      items: mappedData,
      total: count || 0,
      page,
      pageSize
    };
  },

  // Obter fornecedor por ID
  async getSupplierById(id: string): Promise<Supplier> {
    const { data, error } = await supabase
      .from('Supplier')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('Supplier not found');
    }

    // Converter document para cnpj para compatibilidade com o frontend
    return {
      ...data,
      cnpj: data.document // document -> cnpj
    };
  },

  // Criar fornecedor
  async createSupplier(data: CreateSupplierData): Promise<Supplier> {
    // Converter cnpj para document para o banco
    const { data: supplier, error } = await supabase
      .from('Supplier')
      .insert([{
        name: data.name,
        document: data.cnpj, // cnpj -> document
        email: data.email,
        phone: data.phone,
        address: data.address,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Converter document para cnpj para compatibilidade com o frontend
    return {
      ...supplier,
      cnpj: supplier.document // document -> cnpj
    };
  },

  // Atualizar fornecedor
  async updateSupplier(id: string, data: Partial<CreateSupplierData>): Promise<Supplier> {
    // Preparar dados para o banco convertendo cnpj para document
    const updateData: any = { ...data };
    if (data.cnpj) {
      updateData.document = data.cnpj; // cnpj -> document
      delete updateData.cnpj;
    }
    updateData.updatedAt = new Date().toISOString();

    const { data: supplier, error } = await supabase
      .from('Supplier')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (!supplier) {
      throw new Error('Supplier not found');
    }

    // Converter document para cnpj para compatibilidade com o frontend
    return {
      ...supplier,
      cnpj: supplier.document // document -> cnpj
    };
  },

  // Deletar fornecedor
  async deleteSupplier(id: string): Promise<void> {
    const { error } = await supabase
      .from('Supplier')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }
};
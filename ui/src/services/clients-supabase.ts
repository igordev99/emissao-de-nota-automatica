import type { Client, PaginatedResponse } from '../types';
import { supabase } from '../lib/supabase';

export interface CreateClientData {
  name: string;
  document: string;
  email?: string;
  phone?: string;
  municipalRegistration?: string;
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

export const clientSupabaseService = {
  // Listar clientes
  async getClients(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<PaginatedResponse<Client>> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const offset = (page - 1) * pageSize;

    // Construir query base
    let query = supabase
      .from('Client')
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

    return {
      items: data || [],
      total: count || 0,
      page,
      pageSize
    };
  },

  // Obter cliente por ID
  async getClientById(id: string): Promise<Client> {
    const { data, error } = await supabase
      .from('Client')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('Client not found');
    }

    return data;
  },

  // Criar cliente
  async createClient(data: CreateClientData): Promise<Client> {
    console.log('🔄 [ClientSupabaseService] Criando cliente:', { 
      name: data.name, 
      document: data.document 
    });

    const { data: client, error } = await supabase
      .from('Client')
      .insert([data]) // Não incluir timestamps - deixar o banco gerar
      .select()
      .single();

    if (error) {
      console.error('❌ [ClientSupabaseService] Erro ao criar cliente:', error);
      throw new Error(`Erro ao criar cliente: ${error.message}`);
    }

    console.log('✅ [ClientSupabaseService] Cliente criado com sucesso:', client.id);

    return client;
  },

  // Atualizar cliente
  async updateClient(id: string, data: Partial<CreateClientData>): Promise<Client> {
    console.log('🔄 [ClientSupabaseService] Atualizando cliente:', id, data);

    const { data: client, error } = await supabase
      .from('Client')
      .update(data) // Remover updatedAt manual
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (!client) {
      throw new Error('Client not found');
    }

    return client;
  },

  // Deletar cliente
  async deleteClient(id: string): Promise<void> {
    const { error } = await supabase
      .from('Client')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }
};
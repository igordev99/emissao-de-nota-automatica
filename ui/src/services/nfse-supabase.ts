import type { NfseInvoice, NfseEmitRequest, NfseStats, PaginatedResponse } from '../types';
import { supabase } from '../lib/supabase';
import api from './api'; // Manter algumas funcionalidades que ainda precisam da API

export const nfseSupabaseService = {
  // Emitir NFS-e (continuar usando API pois envolve processamento complexo)
  async emitNfse(data: NfseEmitRequest) {
    const response = await api.post('/nfse/emitir', data);
    return response.data;
  },

  // Listar NFS-e usando Supabase diretamente
  async getNfseList(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    providerCnpj?: string;
    customerDoc?: string;
    from?: string;
    to?: string;
  }): Promise<PaginatedResponse<NfseInvoice>> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    // Construir query base
    let query = supabase
      .from('Invoice')
      .select(`
        id,
        status,
        rpsNumber,
        rpsSeries,
        issueDate,
        providerCnpj,
        customerDoc,
        serviceAmount,
        nfseNumber,
        verificationCode,
        cancelReason,
        canceledAt,
        createdAt,
        updatedAt
      `, { count: 'exact' })
      .order('createdAt', { ascending: false })
      .range(offset, offset + pageSize - 1);

    // Aplicar filtros
    if (params?.status) {
      query = query.eq('status', params.status);
    }
    if (params?.providerCnpj) {
      query = query.eq('providerCnpj', params.providerCnpj);
    }
    if (params?.customerDoc) {
      query = query.eq('customerDoc', params.customerDoc);
    }
    if (params?.from) {
      query = query.gte('issueDate', params.from);
    }
    if (params?.to) {
      query = query.lte('issueDate', params.to);
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

  // Obter NFS-e por ID usando Supabase diretamente
  async getNfseById(id: string): Promise<NfseInvoice> {
    const { data, error } = await supabase
      .from('Invoice')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('Invoice not found');
    }

    return data;
  },

  // Obter PDF da NFS-e (continuar usando API)
  async getNfsePdf(id: string): Promise<Blob> {
    const response = await api.get(`/nfse/${id}/pdf`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Obter XML da NFS-e (continuar usando API)
  async getNfseXml(id: string): Promise<string> {
    const response = await api.get(`/nfse/${id}/xml`);
    return response.data.xmlBase64;
  },

  // Cancelar NFS-e (continuar usando API pois envolve processamento)
  async cancelNfse(id: string, reason: string) {
    const response = await api.post(`/nfse/${id}/cancel`, { reason });
    return response.data;
  },

  // Obter estatísticas usando Supabase diretamente
  async getStats(): Promise<NfseStats> {
    try {
      const [
        { count: total },
        { count: pending },
        { count: success },
        { count: rejected },
        { count: cancelled }
      ] = await Promise.all([
        supabase.from('Invoice').select('*', { count: 'exact', head: true }),
        supabase.from('Invoice').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
        supabase.from('Invoice').select('*', { count: 'exact', head: true }).eq('status', 'SUCCESS'),
        supabase.from('Invoice').select('*', { count: 'exact', head: true }).eq('status', 'REJECTED'),
        supabase.from('Invoice').select('*', { count: 'exact', head: true }).eq('status', 'CANCELLED')
      ]);

      // Obter dados dos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentInvoices } = await supabase
        .from('Invoice')
        .select('serviceAmount, issueDate')
        .gte('issueDate', thirtyDaysAgo.toISOString())
        .eq('status', 'SUCCESS');

      const totalAmount = recentInvoices?.reduce((sum, invoice) => 
        sum + (parseFloat(invoice.serviceAmount) || 0), 0) || 0;

      return {
        total: total || 0,
        pending: pending || 0,
        success: success || 0,
        rejected: rejected || 0,
        cancelled: cancelled || 0,
        totalAmount
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get stats');
    }
  }
};
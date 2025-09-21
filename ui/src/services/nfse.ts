import type { NfseInvoice, NfseEmitRequest, NfseStats, PaginatedResponse } from '../types';

import api from './api';

export const nfseService = {
  // Emitir NFS-e
  async emitNfse(data: NfseEmitRequest) {
    const response = await api.post('/nfse/emitir', data);
    return response.data;
  },

  // Listar NFS-e
  async getNfseList(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    providerCnpj?: string;
    customerDoc?: string;
    from?: string;
    to?: string;
  }): Promise<PaginatedResponse<NfseInvoice>> {
    const response = await api.get('/nfse', { params });
    return response.data;
  },

  // Obter NFS-e por ID
  async getNfseById(id: string): Promise<NfseInvoice> {
    const response = await api.get(`/nfse/${id}`);
    return response.data;
  },

  // Obter PDF da NFS-e
  async getNfsePdf(id: string): Promise<Blob> {
    const response = await api.get(`/nfse/${id}/pdf`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Obter XML da NFS-e
  async getNfseXml(id: string): Promise<string> {
    const response = await api.get(`/nfse/${id}/xml`);
    return response.data.xmlBase64;
  },

  // Cancelar NFS-e
  async cancelNfse(id: string, reason: string) {
    const response = await api.post(`/nfse/${id}/cancel`, { reason });
    return response.data;
  },

  // Obter estatísticas
  async getStats(): Promise<NfseStats> {
    const response = await api.get('/nfse/stats');
    return response.data;
  }
};
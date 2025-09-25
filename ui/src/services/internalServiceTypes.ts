import type { ServiceType, PaginatedResponse } from '../types';
import api from './api';

interface GetServiceTypesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  active?: boolean | 'all';
}

interface CreateServiceTypeData {
  code: string;
  name: string;
  description?: string;
  issRetained?: boolean;
  active?: boolean;
}

interface UpdateServiceTypeData extends Partial<CreateServiceTypeData> {}

export const internalServiceTypeService = {
  // Listar tipos de serviço próprios
  async getServiceTypes(params: GetServiceTypesParams = {}): Promise<PaginatedResponse<ServiceType>> {
    const response = await api.get('/service-types', { params });
    return response.data;
  },

  // Obter tipo de serviço por ID
  async getServiceTypeById(id: string): Promise<ServiceType> {
    const response = await api.get(`/service-types/${id}`);
    return response.data;
  },

  // Criar novo tipo de serviço
  async createServiceType(data: CreateServiceTypeData): Promise<ServiceType> {
    const response = await api.post('/service-types', data);
    return response.data;
  },

  // Atualizar tipo de serviço
  async updateServiceType(id: string, data: UpdateServiceTypeData): Promise<ServiceType> {
    const response = await api.put(`/service-types/${id}`, data);
    return response.data;
  },

  // Excluir tipo de serviço
  async deleteServiceType(id: string): Promise<void> {
    await api.delete(`/service-types/${id}`);
  },

  // Importar tipos de serviço em lote
  async importServiceTypes(serviceTypes: CreateServiceTypeData[]): Promise<{ 
    success: number; 
    errors: string[]; 
    imported: ServiceType[] 
  }> {
    const results = {
      success: 0,
      errors: [] as string[],
      imported: [] as ServiceType[]
    };

    for (let i = 0; i < serviceTypes.length; i++) {
      try {
        const serviceType = await this.createServiceType(serviceTypes[i]);
        results.imported.push(serviceType);
        results.success++;
      } catch (error: any) {
        const errorMessage = `Linha ${i + 1}: ${error.response?.data?.error?.message || error.message}`;
        results.errors.push(errorMessage);
      }
    }

    return results;
  }
};
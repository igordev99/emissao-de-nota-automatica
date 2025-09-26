import type { ServiceTypesResponse } from '../types';

import api from './api';

export const serviceTypeService = {
  // Listar tipos de serviço do Uphold
  async getServiceTypes(): Promise<ServiceTypesResponse> {
    const response = await api.get('/tipos-servico');
    return response.data;
  }
};
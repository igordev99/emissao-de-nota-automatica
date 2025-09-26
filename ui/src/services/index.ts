// Configuração para migração gradual de API para Supabase
// Permite alternar entre services sem quebrar a aplicação

import { clientService } from './clients';
import { clientSupabaseService } from './clients-supabase';
import { supplierService } from './suppliers';
import { supplierSupabaseService } from './suppliers-supabase';
import { nfseService } from './nfse';
import { nfseSupabaseService } from './nfse-supabase';

// Feature flags para controlar a migração
const USE_SUPABASE_FOR_CLIENTS = true;
const USE_SUPABASE_FOR_SUPPLIERS = true;
const USE_SUPABASE_FOR_NFSE = true;

// Exportar services híbridos baseados nas flags
export const hybridClientService = USE_SUPABASE_FOR_CLIENTS ? clientSupabaseService : clientService;
export const hybridSupplierService = USE_SUPABASE_FOR_SUPPLIERS ? supplierSupabaseService : supplierService;
export const hybridNfseService = USE_SUPABASE_FOR_NFSE ? nfseSupabaseService : nfseService;

// Exportar também individualmente para flexibilidade
export { clientService, clientSupabaseService };
export { supplierService, supplierSupabaseService };
export { nfseService, nfseSupabaseService };

// Service unificado que pode ser usado em toda a aplicação
export const services = {
  clients: hybridClientService,
  suppliers: hybridSupplierService,
  nfse: hybridNfseService
};

// Exportar services de tipos de serviço
export { serviceTypeService as upholdServiceTypeService } from './serviceTypes';
export { internalServiceTypeService } from './internalServiceTypes';
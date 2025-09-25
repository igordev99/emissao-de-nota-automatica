// Tipos baseados na API do backend

export interface NfseInvoice {
  id: string;
  status: 'PENDING' | 'SUCCESS' | 'REJECTED' | 'CANCELLED';
  nfseNumber?: string;
  rpsNumber: string;
  rpsSeries: string;
  issueDate: string;
  providerCnpj: string;
  customerDoc: string;
  serviceAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface NfseEmitRequest {
  rpsSeries: string;
  issueDate: string;
  serviceCode: string;
  serviceDescription: string;
  serviceAmount: number;
  taxRate: number;
  issRetained: boolean;
  provider: {
    cnpj: string;
  };
  customer: {
    name: string;
    cpf?: string;
    cnpj?: string;
    email?: string;
  };
  additionalInfo?: string;
  cnae?: string;
  deductionsAmount?: number;
}

export interface Client {
  id: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  name: string;
  code: string;
  type: string;
  parentId?: string;
  children?: Account[];
  createdAt: string;
  updatedAt: string;
}

export interface NfseStats {
  total: number;
  pending: number;
  success: number;
  rejected: number;
  cancelled: number;
  totalAmount: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ServiceType {
  id: number;
  code: string;
  name: string;
  issRetido: boolean;
}

export interface ServiceTypesResponse {
  success: boolean;
  serviceTypes: ServiceType[];
  total: number;
  extractedAt?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
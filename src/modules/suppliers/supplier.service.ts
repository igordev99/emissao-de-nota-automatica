import { prisma } from '../../infra/db/prisma';
import { audit } from '../../infra/logging/audit';

export interface SupplierData {
  name: string;
  document: string; // CNPJ only
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

export interface Supplier extends SupplierData {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export class SupplierService {
  async createSupplier(data: SupplierData): Promise<Supplier> {
    // Validate CNPJ format
    if (!this.isValidCNPJ(data.document)) {
      throw new Error('CNPJ inválido. Deve conter 14 dígitos');
    }

    // Check if document already exists
    const existing = await prisma.supplier.findUnique({
      where: { document: data.document }
    });

    if (existing) {
      throw new Error('Fornecedor com este CNPJ já existe');
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: data.name,
        document: data.document,
        email: data.email,
        phone: data.phone,
        address: data.address ? JSON.stringify(data.address) : null
      }
    });

    await audit('INFO', 'Fornecedor criado', { supplierId: supplier.id, document: supplier.document });

    return {
      id: supplier.id,
      name: supplier.name,
      document: supplier.document,
      email: supplier.email || undefined,
      phone: supplier.phone || undefined,
      address: supplier.address ? JSON.parse(supplier.address) : undefined,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt
    };
  }

  async getSupplier(id: string): Promise<Supplier | null> {
    const supplier = await prisma.supplier.findUnique({
      where: { id }
    });

    if (!supplier) return null;

    return {
      id: supplier.id,
      name: supplier.name,
      document: supplier.document,
      email: supplier.email || undefined,
      phone: supplier.phone || undefined,
      address: supplier.address ? JSON.parse(supplier.address) : undefined,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt
    };
  }

  async getSupplierByDocument(document: string): Promise<Supplier | null> {
    const supplier = await prisma.supplier.findUnique({
      where: { document }
    });

    if (!supplier) return null;

    return {
      id: supplier.id,
      name: supplier.name,
      document: supplier.document,
      email: supplier.email || undefined,
      phone: supplier.phone || undefined,
      address: supplier.address ? JSON.parse(supplier.address) : undefined,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt
    };
  }

  async listSuppliers(page: number = 1, pageSize: number = 20, search?: string): Promise<{
    items: Supplier[];
    page: number;
    pageSize: number;
    total: number;
  }> {
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { document: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.supplier.count({ where })
    ]);

    const items = suppliers.map((supplier: any) => ({
      id: supplier.id,
      name: supplier.name,
      document: supplier.document,
      email: supplier.email || undefined,
      phone: supplier.phone || undefined,
      address: supplier.address ? JSON.parse(supplier.address) : undefined,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt
    }));

    return {
      items,
      page,
      pageSize,
      total
    };
  }

  async updateSupplier(id: string, data: Partial<SupplierData>): Promise<Supplier | null> {
    // Check if supplier exists
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) return null;

    // Validate CNPJ if being updated
    if (data.document && data.document !== existing.document) {
      if (!this.isValidCNPJ(data.document)) {
        throw new Error('CNPJ inválido. Deve conter 14 dígitos');
      }

      // Check if new document already exists
      const documentExists = await prisma.supplier.findUnique({
        where: { document: data.document }
      });

      if (documentExists) {
        throw new Error('Fornecedor com este CNPJ já existe');
      }
    }

    const updateData: any = { ...data };
    if (data.address) {
      updateData.address = JSON.parse(JSON.stringify(data.address));
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: updateData
    });

    await audit('INFO', 'Fornecedor atualizado', { supplierId: supplier.id, document: supplier.document });

    return {
      id: supplier.id,
      name: supplier.name,
      document: supplier.document,
      email: supplier.email || undefined,
      phone: supplier.phone || undefined,
      address: supplier.address ? JSON.parse(supplier.address) : undefined,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt
    };
  }

  async deleteSupplier(id: string): Promise<boolean> {
    try {
      await prisma.supplier.delete({ where: { id } });
      await audit('INFO', 'Fornecedor removido', { supplierId: id });
      return true;
    } catch (error) {
      return false;
    }
  }

  private isValidCNPJ(document: string): boolean {
    // Remove non-numeric characters
    const cleanDoc = document.replace(/\D/g, '');

    // Check if it's CNPJ (14 digits)
    return cleanDoc.length === 14;
  }
}

export const supplierService = new SupplierService();
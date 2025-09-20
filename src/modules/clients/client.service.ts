import { prisma } from '../../infra/db/prisma';
import { audit } from '../../infra/logging/audit';

export interface ClientData {
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
}

export interface Client extends ClientData {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ClientService {
  async createClient(data: ClientData): Promise<Client> {
    // Validate document format (basic validation)
    if (!this.isValidDocument(data.document)) {
      throw new Error('Documento inválido. Deve ser CPF (11 dígitos) ou CNPJ (14 dígitos)');
    }

    // Check if document already exists
    const existing = await prisma.client.findUnique({
      where: { document: data.document }
    });

    if (existing) {
      throw new Error('Cliente com este documento já existe');
    }

    const client = await prisma.client.create({
      data: {
        name: data.name,
        document: data.document,
        email: data.email,
        phone: data.phone,
        address: data.address ? JSON.stringify(data.address) : null
      }
    });

    await audit('INFO', 'Cliente criado', { clientId: client.id, document: client.document });

    return {
      id: client.id,
      name: client.name,
      document: client.document,
      email: client.email || undefined,
      phone: client.phone || undefined,
      address: client.address ? JSON.parse(client.address) : undefined,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt
    };
  }

  async getClient(id: string): Promise<Client | null> {
    const client = await prisma.client.findUnique({
      where: { id }
    });

    if (!client) return null;

    return {
      id: client.id,
      name: client.name,
      document: client.document,
      email: client.email || undefined,
      phone: client.phone || undefined,
      address: client.address ? JSON.parse(client.address) : undefined,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt
    };
  }

  async getClientByDocument(document: string): Promise<Client | null> {
    const client = await prisma.client.findUnique({
      where: { document }
    });

    if (!client) return null;

    return {
      id: client.id,
      name: client.name,
      document: client.document,
      email: client.email || undefined,
      phone: client.phone || undefined,
      address: client.address ? JSON.parse(client.address) : undefined,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt
    };
  }

  async listClients(page: number = 1, pageSize: number = 20, search?: string): Promise<{
    items: Client[];
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

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.client.count({ where })
    ]);

    const items = clients.map((client: any) => ({
      id: client.id,
      name: client.name,
      document: client.document,
      email: client.email || undefined,
      phone: client.phone || undefined,
      address: client.address ? JSON.parse(client.address) : undefined,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt
    }));

    return {
      items,
      page,
      pageSize,
      total
    };
  }

  async updateClient(id: string, data: Partial<ClientData>): Promise<Client | null> {
    // Check if client exists
    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing) return null;

    // Validate document if being updated
    if (data.document && data.document !== existing.document) {
      if (!this.isValidDocument(data.document)) {
        throw new Error('Documento inválido. Deve ser CPF (11 dígitos) ou CNPJ (14 dígitos)');
      }

      // Check if new document already exists
      const documentExists = await prisma.client.findUnique({
        where: { document: data.document }
      });

      if (documentExists) {
        throw new Error('Cliente com este documento já existe');
      }
    }

    const updateData: any = { ...data };
    if (data.address) {
      updateData.address = JSON.stringify(data.address);
    }

    const client = await prisma.client.update({
      where: { id },
      data: updateData
    });

    await audit('INFO', 'Cliente atualizado', { clientId: client.id, document: client.document });

    return {
      id: client.id,
      name: client.name,
      document: client.document,
      email: client.email || undefined,
      phone: client.phone || undefined,
      address: client.address ? JSON.parse(client.address) : undefined,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt
    };
  }

  async deleteClient(id: string): Promise<boolean> {
    try {
      await prisma.client.delete({ where: { id } });
      await audit('INFO', 'Cliente removido', { clientId: id });
      return true;
    } catch (error) {
      return false;
    }
  }

  private isValidDocument(document: string): boolean {
    // Remove non-numeric characters
    const cleanDoc = document.replace(/\D/g, '');

    // Check if it's CPF (11 digits) or CNPJ (14 digits)
    return cleanDoc.length === 11 || cleanDoc.length === 14;
  }
}

export const clientService = new ClientService();
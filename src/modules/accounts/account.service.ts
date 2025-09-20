import { prisma } from '../../infra/db/prisma';
import { audit } from '../../infra/logging/audit';

export interface AccountData {
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  parentId?: string;
  description?: string;
  active?: boolean;
}

export interface Account extends AccountData {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  children?: Account[];
}

export class AccountService {
  async createAccount(data: AccountData): Promise<Account> {
    // Validate account code format (basic validation)
    if (!this.isValidAccountCode(data.code)) {
      throw new Error('Código da conta inválido. Deve seguir o formato contábil (ex: 1.01.001)');
    }

    // Check if code already exists
    const existing = await prisma.account.findUnique({
      where: { code: data.code }
    });

    if (existing) {
      throw new Error('Conta com este código já existe');
    }

    // Validate parent exists if provided
    if (data.parentId) {
      const parent = await prisma.account.findUnique({
        where: { id: data.parentId }
      });
      if (!parent) {
        throw new Error('Conta pai não encontrada');
      }
    }

    const account = await prisma.account.create({
      data: {
        code: data.code,
        name: data.name,
        type: data.type,
        parentId: data.parentId,
        description: data.description,
        active: data.active ?? true
      },
      include: {
        children: true
      }
    });

    await audit('INFO', 'Conta criada', { accountId: account.id, code: account.code, type: account.type });

    return {
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      parentId: account.parentId || undefined,
      description: account.description || undefined,
      active: account.active,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      children: account.children.map((child: any) => ({
        id: child.id,
        code: child.code,
        name: child.name,
        type: child.type,
        parentId: child.parentId || undefined,
        description: child.description || undefined,
        active: child.active,
        createdAt: child.createdAt,
        updatedAt: child.updatedAt
      }))
    };
  }

  async getAccount(id: string, includeChildren: boolean = false): Promise<Account | null> {
    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        children: includeChildren
      }
    });

    if (!account) return null;

    return {
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      parentId: account.parentId || undefined,
      description: account.description || undefined,
      active: account.active,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      children: includeChildren ? account.children.map((child: any) => ({
        id: child.id,
        code: child.code,
        name: child.name,
        type: child.type,
        parentId: child.parentId || undefined,
        description: child.description || undefined,
        active: child.active,
        createdAt: child.createdAt,
        updatedAt: child.updatedAt
      })) : undefined
    };
  }

  async getAccountByCode(code: string, includeChildren: boolean = false): Promise<Account | null> {
    const account = await prisma.account.findUnique({
      where: { code },
      include: {
        children: includeChildren
      }
    });

    if (!account) return null;

    return {
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      parentId: account.parentId || undefined,
      description: account.description || undefined,
      active: account.active,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      children: includeChildren ? account.children.map((child: any) => ({
        id: child.id,
        code: child.code,
        name: child.name,
        type: child.type,
        parentId: child.parentId || undefined,
        description: child.description || undefined,
        active: child.active,
        createdAt: child.createdAt,
        updatedAt: child.updatedAt
      })) : undefined
    };
  }

  async listAccounts(type?: string, parentId?: string, activeOnly: boolean = true, page: number = 1, pageSize: number = 20): Promise<{
    items: Account[];
    page: number;
    pageSize: number;
    total: number;
  }> {
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (type) where.type = type;
    if (parentId !== undefined) where.parentId = parentId;
    if (activeOnly) where.active = true;

    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { code: 'asc' },
        include: {
          children: {
            where: activeOnly ? { active: true } : {},
            orderBy: { code: 'asc' }
          }
        }
      }),
      prisma.account.count({ where })
    ]);

    const items = accounts.map((account: any) => ({
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      parentId: account.parentId || undefined,
      description: account.description || undefined,
      active: account.active,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      children: account.children.map((child: any) => ({
        id: child.id,
        code: child.code,
        name: child.name,
        type: child.type,
        parentId: child.parentId || undefined,
        description: child.description || undefined,
        active: child.active,
        createdAt: child.createdAt,
        updatedAt: child.updatedAt
      }))
    }));

    return {
      items,
      page,
      pageSize,
      total
    };
  }

  async updateAccount(id: string, data: Partial<AccountData>): Promise<Account | null> {
    // Check if account exists
    const existing = await prisma.account.findUnique({ where: { id } });
    if (!existing) return null;

    // Validate code if being updated
    if (data.code && data.code !== existing.code) {
      if (!this.isValidAccountCode(data.code)) {
        throw new Error('Código da conta inválido. Deve seguir o formato contábil (ex: 1.01.001)');
      }

      // Check if new code already exists
      const codeExists = await prisma.account.findUnique({
        where: { code: data.code }
      });

      if (codeExists) {
        throw new Error('Conta com este código já existe');
      }
    }

    // Validate parent exists if being updated
    if (data.parentId !== undefined && data.parentId !== existing.parentId) {
      if (data.parentId) {
        const parent = await prisma.account.findUnique({
          where: { id: data.parentId }
        });
        if (!parent) {
          throw new Error('Conta pai não encontrada');
        }
      }
    }

    const account = await prisma.account.update({
      where: { id },
      data,
      include: {
        children: true
      }
    });

    await audit('INFO', 'Conta atualizada', { accountId: account.id, code: account.code });

    return {
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      parentId: account.parentId || undefined,
      description: account.description || undefined,
      active: account.active,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      children: account.children.map((child: any) => ({
        id: child.id,
        code: child.code,
        name: child.name,
        type: child.type,
        parentId: child.parentId || undefined,
        description: child.description || undefined,
        active: child.active,
        createdAt: child.createdAt,
        updatedAt: child.updatedAt
      }))
    };
  }

  async deleteAccount(id: string): Promise<boolean> {
    try {
      // Check if account has children
      const childrenCount = await prisma.account.count({
        where: { parentId: id }
      });

      if (childrenCount > 0) {
        throw new Error('Não é possível excluir uma conta que possui subcontas');
      }

      await prisma.account.delete({ where: { id } });
      await audit('INFO', 'Conta removida', { accountId: id });
      return true;
    } catch (error) {
      await audit('ERROR', 'Falha ao remover conta', { accountId: id, error: (error as Error).message });
      return false;
    }
  }

  async getAccountHierarchy(): Promise<Account[]> {
    // Get all root accounts (no parent)
    const rootAccounts = await prisma.account.findMany({
      where: {
        parentId: null,
        active: true
      },
      include: {
        children: {
          where: { active: true },
          include: {
            children: {
              where: { active: true },
              include: {
                children: {
                  where: { active: true },
                  orderBy: { code: 'asc' }
                }
              },
              orderBy: { code: 'asc' }
            }
          },
          orderBy: { code: 'asc' }
        }
      },
      orderBy: { code: 'asc' }
    });

    // Recursively build the hierarchy
    const buildHierarchy = (accounts: any[]): Account[] => {
      return accounts.map(account => ({
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        parentId: account.parentId || undefined,
        description: account.description || undefined,
        active: account.active,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
        children: account.children ? buildHierarchy(account.children) : []
      }));
    };

    return buildHierarchy(rootAccounts);
  }

  private isValidAccountCode(code: string): boolean {
    // Basic validation: should contain numbers and dots, like "1.01.001"
    const codeRegex = /^\d+(\.\d+)*$/;
    return codeRegex.test(code);
  }
}

export const accountService = new AccountService();
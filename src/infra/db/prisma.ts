import { PrismaClient } from '@prisma/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

const genId = () => `inv_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

class InMemoryPrisma {
  private invoices: AnyObj[] = [];
  private idempotency: Map<string, AnyObj> = new Map();
  private logs: AnyObj[] = [];
  private webhookConfigs: AnyObj[] = [];
  private clients: AnyObj[] = [];
  private suppliers: AnyObj[] = [];
  private accounts: AnyObj[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public invoice: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public idempotencyKey: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public logEntry: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public webhookConfig: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public client: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public supplier: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public account: any;

  constructor() {
    this.invoice = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findFirst: async (args: any) => {
        const { where, orderBy } = args || {};
        let list = this.invoices.slice();
        if (where) {
          list = list.filter((it: AnyObj) => (
            (where.providerCnpj ? it.providerCnpj === where.providerCnpj : true) &&
            (where.rpsSeries ? it.rpsSeries === where.rpsSeries : true)
          ));
        }
        if (orderBy?.createdAt === 'desc') {
          list.sort((a: AnyObj, b: AnyObj) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
        }
        return list[0] || null;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: async (args: any) => {
        const data = args?.data || {};
        const id = data.id || genId();
        const now = new Date();
        const rec: AnyObj = {
          id,
          status: data.status || 'PENDING',
          createdAt: now,
          updatedAt: now,
          ...data
        };
        this.invoices.push(rec);
        return { ...rec };
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update: async (args: any) => {
        const { where, data } = args || {};
        const id = where?.id;
        const idx = this.invoices.findIndex(i => i.id === id);
        if (idx < 0) throw new Error('Invoice not found');
        const merged = { ...this.invoices[idx], ...data, updatedAt: new Date() };
        this.invoices[idx] = merged;
        return { ...merged };
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findUnique: async (args: any) => {
        const id = args?.where?.id;
        return this.invoices.find(i => i.id === id) || null;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      count: async (args: any) => {
        const { where } = args || {};
        return this.filterInvoices(where).length;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findMany: async (args: any) => {
        const { where, orderBy, skip = 0, take = 100, select } = args || {};
        let list = this.filterInvoices(where);
        if (orderBy?.createdAt === 'desc') {
          list.sort((a: AnyObj, b: AnyObj) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
        } else if (orderBy?.createdAt === 'asc') {
          list.sort((a: AnyObj, b: AnyObj) => (a.createdAt?.getTime?.() || 0) - (b.createdAt?.getTime?.() || 0));
        }
        const sliced = list.slice(skip, skip + take);
        if (!select) return sliced.map((it: AnyObj) => ({ ...it }));
        return sliced.map((it: AnyObj) => {
          const res: AnyObj = {};
          for (const key of Object.keys(select)) {
            if ((select as AnyObj)[key]) res[key] = it[key];
          }
          return res;
        });
      }
    };

    this.idempotencyKey = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findUnique: async (args: any) => {
        const key = args?.where?.key;
        const include = args?.include;
        const row = this.idempotency.get(key);
        if (!row) return null;
        const result: AnyObj = { ...row };
        if (include?.invoice) {
          result.invoice = this.invoices.find(i => i.id === row.invoiceId) || null;
        }
        return result;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: async (args: any) => {
        const data = args?.data || {};
        const row = { ...data };
        this.idempotency.set(data.key, row);
        return { ...row };
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update: async (args: any) => {
        const key = args?.where?.key;
        const data = args?.data || {};
        const curr = this.idempotency.get(key);
        if (!curr) throw new Error('Idempotency not found');
        const updated = { ...curr, ...data };
        this.idempotency.set(key, updated);
        return { ...updated };
      }
    };

    // Minimal audit log store compatible com prisma.logEntry.create
    this.logEntry = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: async (args: any) => {
        const data = args?.data || {};
        const now = new Date();
        const entry = { id: `log_${this.logs.length + 1}`, createdAt: now, ...data };
        this.logs.push(entry);
        return { ...entry };
      }
    };

    // WebhookConfig store
    this.webhookConfig = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findMany: async (args: any) => {
        const { where } = args || {};
        let list = this.webhookConfigs.slice();
        if (where?.active !== undefined) {
          list = list.filter((it: AnyObj) => it.active === where.active);
        }
        return list;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findUnique: async (args: any) => {
        const id = args?.where?.id;
        return this.webhookConfigs.find(w => w.id === id) || null;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: async (args: any) => {
        const data = args?.data || {};
        const now = new Date();
        const webhook = { id: `webhook_${this.webhookConfigs.length + 1}`, createdAt: now, updatedAt: now, ...data };
        this.webhookConfigs.push(webhook);
        return { ...webhook };
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update: async (args: any) => {
        const { where, data } = args || {};
        const id = where?.id;
        const idx = this.webhookConfigs.findIndex(w => w.id === id);
        if (idx < 0) throw new Error('WebhookConfig not found');
        const merged = { ...this.webhookConfigs[idx], ...data, updatedAt: new Date() };
        this.webhookConfigs[idx] = merged;
        return { ...merged };
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete: async (args: any) => {
        const id = args?.where?.id;
        const idx = this.webhookConfigs.findIndex(w => w.id === id);
        if (idx < 0) throw new Error('WebhookConfig not found');
        const deleted = this.webhookConfigs.splice(idx, 1)[0];
        return { ...deleted };
      }
    };

    // Client store
    this.client = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findMany: async (args: any) => {
        const { where, orderBy, skip = 0, take = 20, select } = args || {};
        let list = this.clients.slice();
        if (where?.document) {
          list = list.filter((it: AnyObj) => it.document === where.document);
        }
        if (where?.name?.$contains) {
          list = list.filter((it: AnyObj) => it.name.toLowerCase().includes(where.name.$contains.toLowerCase()));
        }
        if (orderBy?.createdAt === 'desc') {
          list.sort((a: AnyObj, b: AnyObj) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
        }
        const sliced = list.slice(skip, skip + take);
        if (!select) return sliced.map((it: AnyObj) => ({ ...it }));
        return sliced.map((it: AnyObj) => {
          const res: AnyObj = {};
          for (const key of Object.keys(select)) {
            if ((select as AnyObj)[key]) res[key] = it[key];
          }
          return res;
        });
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findUnique: async (args: any) => {
        const id = args?.where?.id;
        const document = args?.where?.document;
        if (id) return this.clients.find(c => c.id === id) || null;
        if (document) return this.clients.find(c => c.document === document) || null;
        return null;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: async (args: any) => {
        const data = args?.data || {};
        const now = new Date();
        const client = { id: `client_${this.clients.length + 1}`, createdAt: now, updatedAt: now, ...data };
        this.clients.push(client);
        return { ...client };
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update: async (args: any) => {
        const { where, data } = args || {};
        const id = where?.id;
        const idx = this.clients.findIndex(c => c.id === id);
        if (idx < 0) throw new Error('Client not found');
        const merged = { ...this.clients[idx], ...data, updatedAt: new Date() };
        this.clients[idx] = merged;
        return { ...merged };
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete: async (args: any) => {
        const id = args?.where?.id;
        const idx = this.clients.findIndex(c => c.id === id);
        if (idx < 0) throw new Error('Client not found');
        const deleted = this.clients.splice(idx, 1)[0];
        return { ...deleted };
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      count: async (args: any) => {
        const { where } = args || {};
        let list = this.clients.slice();
        if (where?.name?.$contains) {
          list = list.filter((it: AnyObj) => it.name.toLowerCase().includes(where.name.$contains.toLowerCase()));
        }
        return list.length;
      }
    };

    // Supplier store
    this.supplier = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findMany: async (args: any) => {
        const { where, orderBy, skip = 0, take = 20 } = args || {};
        let list = this.suppliers.slice();
        if (where?.document) {
          list = list.filter((it: AnyObj) => it.document === where.document);
        }
        if (where?.name?.$contains) {
          list = list.filter((it: AnyObj) => it.name.toLowerCase().includes(where.name.$contains.toLowerCase()));
        }
        if (orderBy?.createdAt === 'desc') {
          list.sort((a: AnyObj, b: AnyObj) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
        }
        return list.slice(skip, skip + take).map((it: AnyObj) => ({ ...it }));
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findUnique: async (args: any) => {
        const id = args?.where?.id;
        const document = args?.where?.document;
        if (id) return this.suppliers.find(s => s.id === id) || null;
        if (document) return this.suppliers.find(s => s.document === document) || null;
        return null;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: async (args: any) => {
        const data = args?.data || {};
        const now = new Date();
        const supplier = { id: `supplier_${this.suppliers.length + 1}`, createdAt: now, updatedAt: now, ...data };
        this.suppliers.push(supplier);
        return { ...supplier };
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update: async (args: any) => {
        const { where, data } = args || {};
        const id = where?.id;
        const idx = this.suppliers.findIndex(s => s.id === id);
        if (idx < 0) throw new Error('Supplier not found');
        const merged = { ...this.suppliers[idx], ...data, updatedAt: new Date() };
        this.suppliers[idx] = merged;
        return { ...merged };
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete: async (args: any) => {
        const id = args?.where?.id;
        const idx = this.suppliers.findIndex(s => s.id === id);
        if (idx < 0) throw new Error('Supplier not found');
        const deleted = this.suppliers.splice(idx, 1)[0];
        return { ...deleted };
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      count: async (args: any) => {
        const { where } = args || {};
        let list = this.suppliers.slice();
        if (where?.name?.$contains) {
          list = list.filter((it: AnyObj) => it.name.toLowerCase().includes(where.name.$contains.toLowerCase()));
        }
        return list.length;
      }
    };

    // Account store
    this.account = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findMany: async (args: any) => {
        const { where, orderBy, skip = 0, take = 20, include } = args || {};
        let list = this.accounts.slice();
        if (where?.type) {
          list = list.filter((it: AnyObj) => it.type === where.type);
        }
        if (where?.active !== undefined) {
          list = list.filter((it: AnyObj) => it.active === where.active);
        }
        if (where?.parentId) {
          list = list.filter((it: AnyObj) => it.parentId === where.parentId);
        }
        if (orderBy?.code === 'asc') {
          list.sort((a: AnyObj, b: AnyObj) => a.code.localeCompare(b.code));
        }
        const sliced = list.slice(skip, skip + take);
        if (include?.children) {
          return sliced.map((it: AnyObj) => ({
            ...it,
            children: this.accounts.filter((child: AnyObj) => child.parentId === it.id)
          }));
        }
        return sliced.map((it: AnyObj) => ({ ...it }));
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findUnique: async (args: any) => {
        const { where, include } = args || {};
        const id = where?.id;
        const code = where?.code;
        let account = null;
        if (id) account = this.accounts.find(a => a.id === id) || null;
        if (code) account = this.accounts.find(a => a.code === code) || null;
        if (!account) return null;
        const result = { ...account };
        if (include?.children) {
          result.children = this.accounts.filter((child: AnyObj) => child.parentId === account.id);
        }
        return result;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: async (args: any) => {
        const { data, include } = args || {};
        const now = new Date();
        const account = { id: `account_${this.accounts.length + 1}`, createdAt: now, updatedAt: now, ...data };
        this.accounts.push(account);
        const result = { ...account };
        if (include?.children) {
          result.children = this.accounts.filter((child: AnyObj) => child.parentId === account.id);
        }
        return result;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update: async (args: any) => {
        const { where, data, include } = args || {};
        const id = where?.id;
        const idx = this.accounts.findIndex(a => a.id === id);
        if (idx < 0) throw new Error('Account not found');
        const merged = { ...this.accounts[idx], ...data, updatedAt: new Date() };
        this.accounts[idx] = merged;
        const result = { ...merged };
        if (include?.children) {
          result.children = this.accounts.filter((child: AnyObj) => child.parentId === merged.id);
        }
        return result;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete: async (args: any) => {
        const id = args?.where?.id;
        const idx = this.accounts.findIndex(a => a.id === id);
        if (idx < 0) throw new Error('Account not found');
        const deleted = this.accounts.splice(idx, 1)[0];
        return { ...deleted };
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      count: async (args: any) => {
        const { where } = args || {};
        let list = this.accounts.slice();
        if (where?.type) {
          list = list.filter((it: AnyObj) => it.type === where.type);
        }
        return list.length;
      }
    };
  }

  // Accept tagged template: prisma.$queryRaw`SELECT 1`
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  public async $queryRaw(_strings?: TemplateStringsArray, ..._exprs: any[]): Promise<number> {
    return 1;
  }
  public async $disconnect(): Promise<void> { /* noop */ }
  // Minimal $transaction support to keep parity with Prisma API in tests/dev
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async $transaction<T>(fn: (tx: any) => Promise<T> | T): Promise<T> {
    // Execute callback with this instance acting as the transactional client
    return await Promise.resolve(fn(this as unknown as any));
  }

  private filterInvoices(where?: AnyObj): AnyObj[] {
    if (!where) return this.invoices.slice();
    return this.invoices.filter((it: AnyObj) => {
      for (const [k, v] of Object.entries(where)) {
        const vv: AnyObj = v as AnyObj;
        if (vv && typeof vv === 'object' && (vv.gte !== undefined || vv.lte !== undefined)) {
          const val = (it as AnyObj)[k];
          if (vv.gte !== undefined && !(val >= vv.gte)) return false;
          if (vv.lte !== undefined && !(val <= vv.lte)) return false;
        } else if (v !== undefined) {
          if ((it as AnyObj)[k] !== v) return false;
        }
      }
      return true;
    });
  }
}

const useMemory = process.env.IN_MEMORY_DB === '1' || !process.env.DATABASE_URL;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prisma: any = useMemory
  ? new InMemoryPrisma()
  : new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'] });

process.on('beforeExit', async () => {
  try { await prisma.$disconnect(); } catch { /* noop */ }
});
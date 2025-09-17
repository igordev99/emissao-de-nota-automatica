import { PrismaClient } from '@prisma/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

const genId = () => `inv_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

class InMemoryPrisma {
  private invoices: AnyObj[] = [];
  private idempotency: Map<string, AnyObj> = new Map();
  private logs: AnyObj[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public invoice: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public idempotencyKey: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public logEntry: any;

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
import { prisma } from '../../infra/db/prisma';
import { audit } from '../../infra/logging/audit';
import { webhookService } from '../webhooks';

export interface RetryConfig {
  maxRetries: number;
  retryDelayMs: number;
  maxAgeHours: number;
}

export class RetryService {
  private config: RetryConfig;
  private intervalId?: NodeJS.Timeout;
  private isRunning = false;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 30000, // 30 seconds
      maxAgeHours: config.maxAgeHours ?? 24 // 24 hours
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    await audit('INFO', 'Retry service started', { config: this.config });

    // Process immediately on start
    await this.processPendingInvoices();

    // Then process every retryDelayMs
    this.intervalId = setInterval(async () => {
      try {
        await this.processPendingInvoices();
      } catch (error: any) {
        await audit('ERROR', 'Retry service error', { error: error.message });
      }
    }, this.config.retryDelayMs);
  }

  async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
    await audit('INFO', 'Retry service stopped');
  }

  private async processPendingInvoices(): Promise<void> {
    const cutoffDate = new Date(Date.now() - this.config.maxAgeHours * 60 * 60 * 1000);

    // Find invoices that are PENDING and older than maxAgeHours
    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          lt: cutoffDate
        }
      },
      include: {
        logs: {
          where: {
            level: 'ERROR'
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5 // Last 5 error logs
        }
      }
    });

    if (pendingInvoices.length === 0) return;

    await audit('INFO', 'Found pending invoices for retry', {
      count: pendingInvoices.length,
      cutoffDate: cutoffDate.toISOString()
    });

    for (const invoice of pendingInvoices) {
      try {
        await this.retryInvoice(invoice);
      } catch (error: any) {
        await audit('ERROR', 'Failed to retry invoice', {
          invoiceId: invoice.id,
          error: error.message
        });
      }
    }
  }

  private async retryInvoice(invoice: any): Promise<void> {
    // Check retry count from logs
    const retryLogs = invoice.logs.filter((log: any) =>
      log.message.includes('retry') || log.message.includes('Retry')
    );

    if (retryLogs.length >= this.config.maxRetries) {
      await audit('ERROR', 'Max retries exceeded, marking as failed', {
        invoiceId: invoice.id,
        retryCount: retryLogs.length
      });

      // Mark as permanently failed
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'REJECTED' }
      });

      // Notify via webhook
      await webhookService.notifyStatusChange(invoice.id, 'PENDING', 'REJECTED', {
        reason: 'max_retries_exceeded',
        retryCount: retryLogs.length
      });

      return;
    }

    await audit('INFO', 'Retrying invoice emission', {
      invoiceId: invoice.id,
      retryCount: retryLogs.length + 1
    });

    try {
      // Re-emit the invoice using the stored normalized data
      const normalizedData = invoice.rawNormalizedJson as any;

      // Import here to avoid circular dependency
      const { emitInvoice } = await import('../nfse/nfse.service');

      const result = await emitInvoice(normalizedData, undefined); // No idempotency key for retries

      await audit('INFO', 'Invoice retry successful', {
        invoiceId: invoice.id,
        newStatus: result.status,
        retryCount: retryLogs.length + 1
      });

    } catch (error: any) {
      await audit('ERROR', 'Invoice retry failed', {
        invoiceId: invoice.id,
        error: error.message,
        retryCount: retryLogs.length + 1
      });

      // Log the retry attempt
      await prisma.logEntry.create({
        data: {
          invoiceId: invoice.id,
          level: 'ERROR',
          message: `Retry attempt ${retryLogs.length + 1} failed: ${error.message}`,
          context: { retryAttempt: retryLogs.length + 1, error: error.message }
        }
      });
    }
  }

  // Manual retry for specific invoice
  async retryInvoiceById(invoiceId: string): Promise<boolean> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        logs: {
          where: { level: 'ERROR' },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== 'PENDING') {
      throw new Error(`Invoice status is ${invoice.status}, not PENDING`);
    }

    await this.retryInvoice(invoice);
    return true;
  }

  // Get retry statistics
  async getRetryStats(): Promise<{
    pendingCount: number;
    retryableCount: number;
    maxRetriesExceeded: number;
  }> {
    const cutoffDate = new Date(Date.now() - this.config.maxAgeHours * 60 * 60 * 1000);

    const [pendingCount, retryableInvoices] = await Promise.all([
      prisma.invoice.count({ where: { status: 'PENDING' } }),
      prisma.invoice.findMany({
        where: {
          status: 'PENDING',
          createdAt: { lt: cutoffDate }
        },
        include: {
          logs: {
            where: { level: 'ERROR' },
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      })
    ]);

    const maxRetriesExceeded = retryableInvoices.filter((invoice: any) => {
      const retryLogs = invoice.logs.filter((log: any) =>
        log.message.includes('retry') || log.message.includes('Retry')
      );
      return retryLogs.length >= this.config.maxRetries;
    }).length;

    const retryableCount = retryableInvoices.length - maxRetriesExceeded;

    return {
      pendingCount,
      retryableCount,
      maxRetriesExceeded
    };
  }
}

export const retryService = new RetryService();
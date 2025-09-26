// Sistema de Jobs/Retry simplificado para ambiente serverless
import { PrismaClient } from '@prisma/client';

// Cache global para reusar conexão
let cachedPrisma = null;

async function getPrisma() {
  if (!cachedPrisma) {
    cachedPrisma = new PrismaClient();
  }
  return cachedPrisma;
}

// Configuração padrão de retry
const DEFAULT_CONFIG = {
  maxRetries: 3,
  maxAgeHours: 24,
  retryDelayMs: 30000
};

export class JobsService {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    console.log('JobsService initialized with config:', this.config);
  }

  // Processar invoices pendentes que precisam de retry
  async processRetries() {
    const prisma = await getPrisma();
    const cutoffDate = new Date(Date.now() - this.config.maxAgeHours * 60 * 60 * 1000);

    console.log('Processing retries with cutoff date:', cutoffDate);

    try {
      // Buscar invoices pendentes antigas
      const pendingInvoices = await prisma.invoice.findMany({
        where: {
          status: 'PENDING',
          createdAt: {
            lt: cutoffDate
          }
        },
        include: {
          logs: {
            where: { level: 'ERROR' },
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        },
        take: 50 // Limitar para não sobrecarregar serverless
      });

      console.log(`Found ${pendingInvoices.length} pending invoices for retry`);

      let processed = 0;
      let failed = 0;
      let skipped = 0;

      for (const invoice of pendingInvoices) {
        try {
          const retryLogs = invoice.logs.filter(log => 
            log.message.includes('retry') || log.message.includes('Retry')
          );

          // Verificar se excedeu máximo de tentativas
          if (retryLogs.length >= this.config.maxRetries) {
            console.log(`Invoice ${invoice.id} exceeded max retries (${retryLogs.length}), marking as REJECTED`);
            
            await prisma.invoice.update({
              where: { id: invoice.id },
              data: { status: 'REJECTED' }
            });

            // Log da rejeição
            await prisma.logEntry.create({
              data: {
                invoiceId: invoice.id,
                level: 'ERROR',
                message: `Invoice marked as REJECTED - exceeded max retries (${retryLogs.length})`,
                context: { 
                  reason: 'max_retries_exceeded',
                  retryCount: retryLogs.length,
                  maxRetries: this.config.maxRetries
                }
              }
            });

            skipped++;
            continue;
          }

          // Tentar reprocessar a invoice
          await this.retryInvoice(invoice, retryLogs.length + 1);
          processed++;

        } catch (error) {
          console.error(`Failed to retry invoice ${invoice.id}:`, error.message);
          
          // Log do erro de retry
          await prisma.logEntry.create({
            data: {
              invoiceId: invoice.id,
              level: 'ERROR', 
              message: `Retry failed: ${error.message}`,
              context: { 
                error: error.message,
                retryAttempt: (invoice.logs.filter(l => l.message.includes('retry')).length + 1)
              }
            }
          });

          failed++;
        }
      }

      const result = {
        processed,
        failed,
        skipped,
        total: pendingInvoices.length,
        timestamp: new Date().toISOString()
      };

      console.log('Retry processing completed:', result);
      return result;

    } catch (error) {
      console.error('Error in processRetries:', error);
      throw error;
    }
  }

  // Tentar reprocessar uma invoice específica
  async retryInvoice(invoice, retryAttempt) {
    const prisma = await getPrisma();
    
    console.log(`Retrying invoice ${invoice.id}, attempt ${retryAttempt}`);

    // Log do início do retry
    await prisma.logEntry.create({
      data: {
        invoiceId: invoice.id,
        level: 'INFO',
        message: `Retry attempt ${retryAttempt} started`,
        context: { 
          retryAttempt,
          maxRetries: this.config.maxRetries,
          invoiceStatus: invoice.status
        }
      }
    });

    // Por agora, apenas simular o reprocessamento
    // Em produção, aqui chamaria o serviço de emissão NFSe
    console.log(`Would retry invoice ${invoice.id} with data:`, {
      id: invoice.id,
      status: invoice.status,
      hasRawData: !!invoice.rawNormalizedJson
    });

    // Simular sucesso/falha baseado em alguma lógica
    const shouldSucceed = Math.random() > 0.3; // 70% chance de sucesso

    if (shouldSucceed) {
      // Simular sucesso - em produção aqui teria lógica real
      await prisma.logEntry.create({
        data: {
          invoiceId: invoice.id,
          level: 'INFO', 
          message: `Retry attempt ${retryAttempt} completed successfully`,
          context: { 
            retryAttempt,
            result: 'success_simulation'
          }
        }
      });
      
      console.log(`Invoice ${invoice.id} retry simulation: SUCCESS`);
    } else {
      // Simular falha
      throw new Error(`Retry simulation failed for invoice ${invoice.id}`);
    }
  }

  // Obter estatísticas de retry
  async getRetryStats() {
    const prisma = await getPrisma();
    
    try {
      const [
        totalPending,
        pendingOld,
        totalRejected,
        recentLogs
      ] = await Promise.all([
        // Total de invoices pendentes
        prisma.invoice.count({
          where: { status: 'PENDING' }
        }),
        
        // Invoices pendentes antigas (candidatas a retry)
        prisma.invoice.count({
          where: {
            status: 'PENDING',
            createdAt: {
              lt: new Date(Date.now() - this.config.maxAgeHours * 60 * 60 * 1000)
            }
          }
        }),
        
        // Total de invoices rejeitadas
        prisma.invoice.count({
          where: { status: 'REJECTED' }
        }),
        
        // Logs recentes de retry
        prisma.logEntry.count({
          where: {
            level: 'ERROR',
            message: { contains: 'retry' },
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        })
      ]);

      return {
        totalPending,
        pendingOld,
        totalRejected,
        recentRetryErrors: recentLogs,
        config: this.config,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting retry stats:', error);
      throw error;
    }
  }

  // Forçar retry de uma invoice específica
  async forceRetry(invoiceId) {
    const prisma = await getPrisma();
    
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          logs: {
            where: { level: 'ERROR' },
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.status !== 'PENDING') {
        throw new Error(`Invoice status is ${invoice.status}, not PENDING`);
      }

      const retryCount = invoice.logs.filter(log => 
        log.message.includes('retry')
      ).length;

      await this.retryInvoice(invoice, retryCount + 1);

      return {
        success: true,
        invoiceId,
        retryAttempt: retryCount + 1,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`Error forcing retry for invoice ${invoiceId}:`, error);
      throw error;
    }
  }
}

// Instância singleton 
export const jobsService = new JobsService();
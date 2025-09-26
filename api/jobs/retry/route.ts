import { audit } from '../../../src/infra/logging/audit';
import { prisma } from '../../../src/infra/db/prisma';

interface RetryConfig {
  maxRetries: number;
  maxAgeHours: number;
}

interface VercelRequest {
  method?: string;
  headers: Record<string, string | undefined>;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(data: unknown): void;
}

/**
 * Serverless function para processar retries de NFS-e
 * Esta função deve ser chamada via webhook/cron job do Vercel
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    return await handlePost(req, res);
  } else if (req.method === 'GET') {
    return await handleGet(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const config: RetryConfig = {
    maxRetries: 3,
    maxAgeHours: 24
  };

  try {
    // Verificar autenticação
    const authHeader = req.headers.authorization;
    const expectedToken = process.env.RETRY_WEBHOOK_TOKEN;
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await audit('INFO', 'Serverless retry job started', { config });

    // Usar diretamente o RetryService
    const { RetryService } = await import('../../../src/modules/jobs/retry.service');
    
    const retryService = new RetryService({
      maxRetries: config.maxRetries,
      maxAgeHours: config.maxAgeHours
    });

    const result = await retryService.processOnce();
    const finalResult = {
      ...result,
      timestamp: new Date().toISOString()
    };

    await audit('INFO', 'Serverless retry job completed', finalResult);

    return res.status(200).json(finalResult);

  } catch (error) {
    await audit('ERROR', 'Serverless retry job error', {
      error: error instanceof Error ? error.message : String(error)
    });

    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
    const stats = await prisma.invoice.groupBy({
      by: ['status'],
      _count: true
    });

    const pendingCount = await prisma.invoice.count({
      where: {
        status: 'PENDING',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // últimas 24h
        }
      }
    });

    return res.status(200).json({
      stats,
      pendingCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
// Cron job endpoint para processamento automático de retries
import { jobsService } from '../jobs-service.mjs';

export default async function handler(req, res) {
  // Verificar método
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verificar autenticação (opcional em desenvolvimento)
    const authHeader = req.headers.authorization;
    const expectedToken = process.env.JOBS_WEBHOOK_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid or missing webhook token'
      });
    }

    console.log('🔄 Starting scheduled retry job...');
    
    // Processar retries
    const result = await jobsService.processRetries();
    
    console.log('✅ Scheduled retry job completed:', result);

    // Retornar resultado
    return res.status(200).json({
      success: true,
      message: 'Retry job completed successfully',
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Scheduled retry job failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Retry job failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
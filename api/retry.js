const { RetryService } = require('../../dist/modules/jobs/retry.service.cjs');

module.exports = async (req, res) => {
  try {
    // Verificar se é um cron job do Vercel (tem header específico)
    const isVercelCron = req.headers['user-agent']?.includes('vercel-cron') || 
                        req.headers['vercel-cron'] || 
                        req.method === 'GET';

    if (!isVercelCron) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const retryService = new RetryService();
    const result = await retryService.processOnce();
    
    res.status(200).json({
      message: 'Retry process completed',
      ...result
    });
  } catch (error) {
    console.error('Retry job error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message 
    });
  }
};
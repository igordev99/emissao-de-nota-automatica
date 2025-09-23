// Versão mínima da aplicação para teste no Vercel
export default async function handler(req, res) {
  try {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    
    // Apenas endpoints básicos para teste
    switch (pathname) {
      case '/':
        res.status(200).json({ 
          message: 'NFSe API - Vercel Test',
          version: '1.0.0',
          timestamp: new Date().toISOString()
        });
        break;
        
      case '/health':
        res.status(200).json({
          status: 'ok',
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        });
        break;
        
      case '/version':
        res.status(200).json({
          version: '1.0.0'
        });
        break;
        
      default:
        res.status(404).json({
          error: 'Not Found',
          path: pathname
        });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message 
    });
  }
}
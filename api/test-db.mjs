// Versão com Prisma + Supabase
import { createRequire } from 'module';
const requireModule = createRequire(import.meta.url);

export default async function handler(req, res) {
  try {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    
    // Apenas endpoints básicos + banco
    switch (pathname) {
      case '/':
        res.status(200).json({ 
          message: 'NFSe API - Vercel + Supabase Test',
          version: '1.1.0',
          timestamp: new Date().toISOString()
        });
        break;
        
      case '/health':
        res.status(200).json({
          status: 'ok',
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          version: '1.1.0'
        });
        break;
        
      case '/health/db':
        try {
          // Importar Prisma diretamente
          const { PrismaClient } = await import('@prisma/client');
          const prisma = new PrismaClient();
          
          await prisma.$queryRaw`SELECT 1`;
          await prisma.$disconnect();
          
          res.status(200).json({
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          res.status(500).json({
            status: 'error',
            database: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
        break;
        
      case '/version':
        res.status(200).json({
          version: '1.1.0'
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
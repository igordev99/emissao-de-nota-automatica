// Teste simples de JWT no ambiente serverless
import jwt from '@fastify/jwt';
import Fastify from 'fastify';

let cachedApp;

async function createTestApp() {
  const app = Fastify({ 
    logger: false,
    trustProxy: true
  });
  
  // Registrar plugin JWT
  const jwtSecret = process.env.JWT_SECRET || 'dev-secret-please-change-123456';
  await app.register(jwt, { secret: jwtSecret });
  
  return app;
}

export default async function handler(req, res) {
  try {
    if (!cachedApp) {
      cachedApp = await createTestApp();
      await cachedApp.ready();
    }

    // Rota para verificar se JWT está carregado
    if (req.url === '/health/auth') {
      res.status(200).json({
        status: 'ok',
        message: 'JWT authentication system loaded',
        hasJWT: !!cachedApp.jwt,
        jwtSecretSet: !!process.env.JWT_SECRET,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Gerar token de teste
    if (req.url === '/auth/token' && req.method === 'POST') {
      try {
        const payload = { sub: 'test-user', roles: ['tester'] };
        const token = cachedApp.jwt.sign(payload, { expiresIn: '1h' });
        res.status(200).json({ token });
      } catch (error) {
        res.status(500).json({ 
          error: 'Failed to generate token', 
          details: error.message 
        });
      }
      return;
    }

    // Verificar token
    if (req.url === '/auth/verify' && req.method === 'POST') {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.status(401).json({ error: 'Missing or invalid Authorization header' });
          return;
        }

        const token = authHeader.split(' ')[1];
        const decoded = cachedApp.jwt.verify(token);
        res.status(200).json({
          status: 'valid',
          decoded,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(401).json({ 
          error: 'Invalid token', 
          details: error.message 
        });
      }
      return;
    }

    // Fallback para outras rotas
    res.status(404).json({ 
      error: 'Not Found',
      availableEndpoints: [
        'GET /health/auth',
        'POST /auth/token',
        'POST /auth/verify'
      ]
    });

  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      details: error.message 
    });
  }
}
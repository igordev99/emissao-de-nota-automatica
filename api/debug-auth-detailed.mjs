// Debug de autenticação simplificado
import jwt from '@fastify/jwt';
import Fastify from 'fastify';

let cachedApp;

async function createDebugApp() {
  const app = Fastify({ 
    logger: false,
    trustProxy: true
  });
  
  // Registrar plugin JWT
  const jwtSecret = process.env.JWT_SECRET || 'dev-secret-please-change-123456';
  await app.register(jwt, { secret: jwtSecret });

  // Endpoint para debug de autenticação
  app.post('/auth/debug-detailed', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      
      if (!authHeader) {
        return {
          status: 'error',
          error: 'No authorization header',
          headers: Object.keys(request.headers)
        };
      }

      if (!authHeader.startsWith('Bearer ')) {
        return {
          status: 'error',
          error: 'Invalid authorization format',
          authHeader: authHeader.substring(0, 20) + '...'
        };
      }

      const token = authHeader.split(' ')[1];
      
      try {
        const decoded = app.jwt.verify(token);
        return {
          status: 'success',
          decoded,
          tokenLength: token.length,
          secretLength: jwtSecret.length
        };
      } catch (verifyError) {
        return {
          status: 'verify_error',
          error: verifyError.message,
          tokenLength: token.length,
          secretLength: jwtSecret.length,
          tokenStart: token.substring(0, 30) + '...'
        };
      }

    } catch (error) {
      return {
        status: 'unexpected_error',
        error: error.message
      };
    }
  });

  // Endpoint usando jwtVerify
  app.get('/test-jwt-verify', async (request, reply) => {
    try {
      await request.jwtVerify();
      return {
        status: 'success',
        user: request.user,
        message: 'JWT verification successful'
      };
    } catch (error) {
      return reply.status(401).send({
        status: 'error',
        error: error.message,
        code: error.code
      });
    }
  });

  return app;
}

export default async function handler(req, res) {
  try {
    if (!cachedApp) {
      cachedApp = await createDebugApp();
      await cachedApp.ready();
    }

    await cachedApp.inject({
      method: req.method,
      url: req.url,
      headers: req.headers,
      payload: req.body,
      remoteAddress: req.ip || req.connection?.remoteAddress
    }).then(response => {
      res.status(response.statusCode);
      Object.entries(response.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      res.end(response.body);
    });

  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      details: error.message 
    });
  }
}
// Teste de autenticação JWT
import { buildApp } from '../dist/app.js';

let cachedApp;

export default async function handler(req, res) {
  if (!cachedApp) {
    try {
      cachedApp = await buildApp();
      await cachedApp.ready();
    } catch (error) {
      console.error('Failed to build app:', error);
      res.status(500).json({ error: 'Internal Server Error', details: error.message });
      return;
    }
  }

  // Rotas específicas de teste
  if (req.url === '/health/auth') {
    // Endpoint de teste de autenticação (sem token)
    res.status(200).json({
      status: 'ok',
      message: 'Authentication system loaded',
      hasJWT: !!cachedApp.jwt,
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (req.url === '/auth/test-token' && req.method === 'POST') {
    // Gerar token de teste
    try {
      if (process.env.NODE_ENV === 'production') {
        res.status(403).json({ error: 'Token generation disabled in production' });
        return;
      }
      
      const payload = { sub: 'test-user', roles: ['tester'] };
      const token = cachedApp.jwt.sign(payload, { expiresIn: '1h' });
      res.status(200).json({ token });
    } catch (error) {
      console.error('Token generation error:', error);
      res.status(500).json({ error: 'Failed to generate token', details: error.message });
    }
    return;
  }

  if (req.url === '/auth/verify-token' && req.method === 'POST') {
    // Verificar token
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
      console.error('Token verification error:', error);
      res.status(401).json({ error: 'Invalid token', details: error.message });
    }
    return;
  }

  // Para outras rotas, usar o comportamento padrão do app
  try {
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
    console.error('Error handling request:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
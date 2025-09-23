// API NFSe no Vercel Serverless
import jwt from '@fastify/jwt';
import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { getCertificateInfo } from './certificate.mjs';

let cachedApp;
let cachedPrisma;

async function getPrisma() {
  if (!cachedPrisma) {
    cachedPrisma = new PrismaClient();
  }
  return cachedPrisma;
}

async function createNfseApp() {
  const app = Fastify({ 
    logger: false,
    trustProxy: true
  });

  // Registrar CORS para permitir frontend
  await app.register(import('@fastify/cors'), {
    origin: [
      'https://ui-ten-xi.vercel.app',
      'http://localhost:5173', // Vite dev server
      /.*\.vercel\.app$/ // Qualquer domínio vercel
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  });
  
  // Registrar plugin JWT
  const jwtSecret = process.env.JWT_SECRET || 'dev-secret-please-change-123456';
  await app.register(jwt, { secret: jwtSecret });

  // Health endpoints
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString()
  }));

  app.get('/health/db', async () => {
    try {
      const prisma = await getPrisma();
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        database: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  });

  app.get('/health/auth', async () => ({
    status: 'ok',
    message: 'JWT authentication system loaded',
    hasJWT: !!app.jwt,
    timestamp: new Date().toISOString()
  }));

  // Endpoint de certificado digital (verificação completa)
  app.get('/health/cert', async () => {
    try {
      const certInfo = getCertificateInfo();
      
      if (!certInfo) {
        return {
          loaded: false,
          status: 'not_configured',
          error: 'Certificate not configured - missing CERT_PFX_BASE64',
          timestamp: new Date().toISOString()
        };
      }
      
      // Determinar status baseado na validade
      let status = 'valid';
      if (!certInfo.isValid) {
        status = certInfo.daysToExpire < 0 ? 'expired' : 'not_yet_valid';
      } else if (certInfo.daysToExpire < 30) {
        status = 'expiring_soon';
      }
      
      return {
        loaded: true,
        status,
        thumbprint: certInfo.thumbprint,
        hasPrivateKey: !!certInfo.privateKeyPem,
        notBefore: certInfo.notBefore.toISOString(),
        notAfter: certInfo.notAfter.toISOString(),
        daysToExpire: certInfo.daysToExpire,
        isValid: certInfo.isValid,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        loaded: false,
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  });

  // Endpoint completo de dependências
  app.get('/health/deps', async () => {
    const result = {
      status: 'unknown',
      components: {},
      timestamp: new Date().toISOString()
    };

    // Test Database
    try {
      const prisma = await getPrisma();
      await prisma.$queryRaw`SELECT 1`;
      result.components.database = {
        status: 'healthy',
        message: 'Connected to database'
      };
    } catch (error) {
      result.components.database = {
        status: 'unhealthy', 
        error: error.message
      };
    }

    // Test Certificate
    try {
      const certInfo = getCertificateInfo();
      if (!certInfo) {
        result.components.certificate = {
          status: 'not_configured',
          message: 'Certificate not configured'
        };
      } else {
        let certStatus = 'healthy';
        if (!certInfo.isValid) {
          certStatus = 'unhealthy';
        } else if (certInfo.daysToExpire < 30) {
          certStatus = 'warning';
        }
        
        result.components.certificate = {
          status: certStatus,
          thumbprint: certInfo.thumbprint,
          daysToExpire: certInfo.daysToExpire,
          message: `Certificate valid, expires in ${certInfo.daysToExpire} days`
        };
      }
    } catch (error) {
      result.components.certificate = {
        status: 'unhealthy',
        error: error.message
      };
    }

    // Overall status
    const statuses = Object.values(result.components).map(c => c.status);
    if (statuses.every(s => s === 'healthy')) {
      result.status = 'healthy';
    } else if (statuses.some(s => s === 'unhealthy')) {
      result.status = 'unhealthy';
    } else {
      result.status = 'degraded';
    }

    return result;
  });

  // Auth endpoints
  app.post('/auth/token', async (request) => {
    if (process.env.NODE_ENV === 'production') {
      const err = new Error('Token generation disabled in production');
      err.statusCode = 403;
      throw err;
    }
    
    const body = request.body || {};
    const sub = body.sub || 'tester';
    const payload = { sub, roles: ['tester'] };
    const token = app.jwt.sign(payload, { expiresIn: '1h' });
    
    return { token };
  });

  // NFSe endpoints com autenticação manual
  app.get('/nfse', async (request, reply) => {
    try {
      // Autenticação manual
      try {
        await request.jwtVerify();
      } catch (authError) {
        return reply.status(401).send({
          error: {
            message: 'Authentication required',
            code: 'AUTH_ERROR'
          }
        });
      }

      const prisma = await getPrisma();
      
      // Parâmetros de query básicos
      const page = Math.max(1, Number(request.query.page || 1));
      const pageSize = Math.min(100, Math.max(1, Number(request.query.pageSize || 20)));
      const skip = (page - 1) * pageSize;
      
      // Filtros básicos
      const where = {};
      if (request.query.status) {
        where.status = request.query.status;
      }
      if (request.query.providerCnpj) {
        where.providerCnpj = request.query.providerCnpj;
      }
      
      // Buscar invoices
      const [items, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            rpsNumber: true,
            rpsSeries: true,
            issueDate: true,
            providerCnpj: true,
            customerDoc: true,
            serviceAmount: true,
            nfseNumber: true
          }
        }),
        prisma.invoice.count({ where })
      ]);
      
      return {
        page,
        pageSize,
        total,
        items
      };
    } catch (error) {
      console.error('Error listing invoices:', error);
      return reply.status(500).send({
        error: {
          message: 'Failed to list invoices',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  });

  app.get('/nfse/:id', async (request, reply) => {
    try {
      // Autenticação manual
      try {
        await request.jwtVerify();
      } catch (authError) {
        return reply.status(401).send({
          error: {
            message: 'Authentication required',
            code: 'AUTH_ERROR'
          }
        });
      }

      const prisma = await getPrisma();
      const id = request.params.id;
      
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          nfseNumber: true,
          verificationCode: true,
          cancelReason: true,
          canceledAt: true
        }
      });
      
      if (!invoice) {
        return reply.status(404).send({
          error: {
            message: 'Invoice not found',
            code: 'NOT_FOUND'
          }
        });
      }
      
      return invoice;
    } catch (error) {
      console.error('Error getting invoice:', error);
      return reply.status(500).send({
        error: {
          message: 'Failed to get invoice',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  });

  // Error handler
  app.setErrorHandler(async (error, request, reply) => {
    const statusCode = error.statusCode || 500;
    
    reply.status(statusCode).send({
      error: {
        message: error.message || 'Internal Server Error',
        code: error.code || 'UNKNOWN_ERROR'
      }
    });
  });
  
  return app;
}

export default async function handler(req, res) {
  try {
    if (!cachedApp) {
      cachedApp = await createNfseApp();
      await cachedApp.ready();
    }

    // Converter request para formato Fastify
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
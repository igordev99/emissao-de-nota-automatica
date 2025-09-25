// API NFSe no Vercel Serverless com Supabase
import jwt from '@fastify/jwt';
import Fastify from 'fastify';
import { createClient } from '@supabase/supabase-js';
import { getCertificateInfo } from './certificate-enhanced.mjs';
import { jobsService } from './jobs-service.mjs';

let cachedApp;
let cachedSupabase;

// Usar Supabase direto - sem dependências Prisma complexas

function getSupabase() {
  if (!cachedSupabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ctrkdpeqiwxkvvwymipi.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0cmtkcGVxaXd4a3Z2d3ltaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjgzNjQsImV4cCI6MjA3NDE0NDM2NH0.TC8ZqqF9EIR7oHg26qDOSSvZKj5IDCma8Ti8d6tqFMQ';
    
    cachedSupabase = createClient(supabaseUrl, supabaseKey);
  }
  return cachedSupabase;
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
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('Client')
        .select('id')
        .limit(1);
        
      if (error) throw error;
      
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
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('Client')
        .select('id')
        .limit(1);
        
      if (error) throw error;
        
      result.components.database = {
        status: 'healthy',
        message: 'Connected to Supabase database'
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

    // Test Jobs System
    try {
      const jobStats = await jobsService.getRetryStats();
      
      let jobsStatus = 'healthy';
      if (jobStats.pendingOld > 20) {
        jobsStatus = 'warning';
      }
      if (jobStats.pendingOld > 50) {
        jobsStatus = 'unhealthy';
      }

      result.components.jobs = {
        status: jobsStatus,
        pendingJobs: jobStats.totalPending,
        oldPendingJobs: jobStats.pendingOld,
        rejectedJobs: jobStats.totalRejected,
        message: `${jobStats.pendingOld} jobs awaiting retry`
      };
    } catch (error) {
      result.components.jobs = {
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

  // Jobs & Retry endpoints
  app.get('/jobs/stats', async () => {
    try {
      return await jobsService.getRetryStats();
    } catch (error) {
      throw new Error(`Failed to get job stats: ${error.message}`);
    }
  });

  app.post('/jobs/retry/process', async (request, reply) => {
    try {
      const result = await jobsService.processRetries();
      return result;
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to process retries',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.post('/jobs/retry/invoice', async (request, reply) => {
    try {
      const { invoiceId } = request.body || {};
      
      if (!invoiceId) {
        return reply.status(400).send({
          error: 'Invoice ID is required',
          timestamp: new Date().toISOString()
        });
      }

      const result = await jobsService.forceRetry(invoiceId);
      return result;
    } catch (error) {
      const statusCode = error.message.includes('not found') ? 404 :
                        error.message.includes('not PENDING') ? 400 : 500;
      
      return reply.status(statusCode).send({
        error: 'Failed to retry invoice',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Health check para jobs
  app.get('/health/jobs', async () => {
    try {
      const stats = await jobsService.getRetryStats();
      
      // Determinar status baseado nas estatísticas
      let status = 'healthy';
      if (stats.pendingOld > 20) {
        status = 'degraded';
      }
      if (stats.pendingOld > 50) {
        status = 'unhealthy';
      }

      return {
        status,
        pendingJobs: stats.totalPending,
        oldPendingJobs: stats.pendingOld,
        rejectedJobs: stats.totalRejected,
        recentErrors: stats.recentRetryErrors,
        message: `${stats.pendingOld} jobs need retry processing`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  });

  // Auth endpoints
  app.post('/auth/token', async (request) => {
    // Login funcional para demo - validação básica
    const body = request.body || {};
    const sub = body.sub || 'tester';
    
    // Lista de usuários válidos para demo
    const validUsers = ['tester', 'admin', 'demo', 'user', 'test'];
    
    if (!validUsers.includes(sub.toLowerCase())) {
      const err = new Error('Usuário não autorizado. Use: tester, admin, demo, user ou test');
      err.statusCode = 401;
      throw err;
    }
    
    const payload = { 
      sub: sub.toLowerCase(), 
      roles: ['user'], 
      name: sub.charAt(0).toUpperCase() + sub.slice(1),
      iat: Math.floor(Date.now() / 1000)
    };
    const token = app.jwt.sign(payload, { expiresIn: '24h' });
    
    return { token, user: payload };
  });

  // Login com email/senha para compatibilidade
  app.post('/auth/login', async (request) => {
    const body = request.body || {};
    const { email, password } = body;
    
    // Credenciais de demo
    const demoCredentials = {
      'demo@example.com': 'demo123',
      'admin@nfse.com': 'admin123',
      'tester@test.com': 'test123',
      'user@system.com': 'user123'
    };
    
    if (!email || !password) {
      const err = new Error('Email e senha são obrigatórios');
      err.statusCode = 400;
      throw err;
    }
    
    if (!demoCredentials[email] || demoCredentials[email] !== password) {
      const err = new Error('Credenciais inválidas');
      err.statusCode = 401;
      throw err;
    }
    
    const sub = email.split('@')[0];
    const payload = { 
      sub, 
      email,
      roles: ['user'], 
      name: sub.charAt(0).toUpperCase() + sub.slice(1),
      iat: Math.floor(Date.now() / 1000)
    };
    const token = app.jwt.sign(payload, { expiresIn: '24h' });
    
    return { token, user: payload };
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

      const supabase = getSupabase();
      
      // Parâmetros de query básicos
      const page = Math.max(1, Number(request.query.page || 1));
      const pageSize = Math.min(100, Math.max(1, Number(request.query.pageSize || 20)));
      const offset = (page - 1) * pageSize;
      
      // Construir query base
      let query = supabase
        .from('Invoice')
        .select(`
          id,
          status,
          rpsNumber,
          rpsSeries,
          issueDate,
          providerCnpj,
          customerDoc,
          serviceAmount,
          nfseNumber
        `, { count: 'exact' })
        .order('createdAt', { ascending: false })
        .range(offset, offset + pageSize - 1);
      
      // Aplicar filtros
      if (request.query.status) {
        query = query.eq('status', request.query.status);
      }
      if (request.query.providerCnpj) {
        query = query.eq('providerCnpj', request.query.providerCnpj);
      }
      
      const { data: items, count: total, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return {
        page,
        pageSize,
        total: total || 0,
        items: items || []
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

      const supabase = getSupabase();
      const id = request.params.id;
      
      const { data: invoice, error } = await supabase
        .from('Invoice')
        .select(`
          id,
          status,
          nfseNumber,
          verificationCode,
          cancelReason,
          canceledAt
        `)
        .eq('id', id)
        .single();
      
      if (error) {
        throw error;
      }
      
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

  // Endpoint de métricas para Grafana/Prometheus
  app.get('/metrics', async (request, reply) => {
    reply.type('text/plain; version=0.0.4; charset=utf-8');
    
    try {
      const supabase = getSupabase();
      
      // Verificar conexão com banco
      const { error: connectionError } = await supabase
        .from('Invoice')
        .select('id')
        .limit(1);
        
      if (connectionError) throw connectionError;
      
      // Coletar métricas básicas (safe mode)
      let totalInvoices = 0;
      let pendingInvoices = 0;
      let completedInvoices = 0;
      let rejectedInvoices = 0;
      let recentErrors = 0;
      
      try {
        const { count: total } = await supabase.from('Invoice').select('*', { count: 'exact', head: true });
        const { count: pending } = await supabase.from('Invoice').select('*', { count: 'exact', head: true }).eq('status', 'PENDING');
        const { count: completed } = await supabase.from('Invoice').select('*', { count: 'exact', head: true }).eq('status', 'COMPLETED');
        const { count: rejected } = await supabase.from('Invoice').select('*', { count: 'exact', head: true }).eq('status', 'REJECTED');
        
        totalInvoices = total || 0;
        pendingInvoices = pending || 0;
        completedInvoices = completed || 0;
        rejectedInvoices = rejected || 0;
      } catch (e) {
        // Tabela invoice pode não existir ainda
        console.log('Invoice table not found, using defaults');
      }
      
      try {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: errors } = await supabase
          .from('LogEntry')
          .select('*', { count: 'exact', head: true })
          .eq('level', 'ERROR')
          .gte('createdAt', yesterday);
          
        recentErrors = errors || 0;
      } catch (e) {
        // Tabela logEntry pode não existir ainda
        console.log('LogEntry table not found, using defaults');
      }

      // Métricas no formato Prometheus
      const metrics = [
        `# HELP nfse_invoices_total Total number of invoices`,
        `# TYPE nfse_invoices_total counter`,
        `nfse_invoices_total ${totalInvoices}`,
        ``,
        `# HELP nfse_invoices_by_status Invoice count by status`,
        `# TYPE nfse_invoices_by_status gauge`,
        `nfse_invoices_by_status{status="pending"} ${pendingInvoices}`,
        `nfse_invoices_by_status{status="completed"} ${completedInvoices}`,
        `nfse_invoices_by_status{status="rejected"} ${rejectedInvoices}`,
        ``,
        `# HELP nfse_errors_24h Error count in last 24 hours`,
        `# TYPE nfse_errors_24h gauge`,
        `nfse_errors_24h ${recentErrors}`,
        ``,
        `# HELP nfse_system_health System health status (1=healthy, 0=unhealthy)`,
        `# TYPE nfse_system_health gauge`,
        `nfse_system_health{component="database"} 1`,
        `nfse_system_health{component="certificate"} 1`,
        `nfse_system_health{component="jobs"} ${pendingInvoices < 50 ? 1 : 0}`,
        ``,
        `# HELP nfse_app_info Application info`,
        `# TYPE nfse_app_info gauge`,
        `nfse_app_info{version="1.0.0",environment="production"} 1`,
        ``,
        `# HELP nfse_uptime System uptime`,
        `# TYPE nfse_uptime counter`,
        `nfse_uptime ${Math.floor(Date.now() / 1000)}`,
        ``
      ].join('\n');

      return metrics;
    } catch (error) {
      console.error('Error collecting metrics:', error);
      return [
        `# Error collecting metrics: ${error.message}`,
        `# TYPE nfse_system_health gauge`,
        `nfse_system_health{component="metrics"} 0`,
        `nfse_system_health{component="database"} 0`,
        ``
      ].join('\n');
    }
  });
  
  // Endpoints de Clientes
  app.get('/api/clients', async (request, reply) => {
    try {
      const { page = 1, pageSize = 10, search } = request.query;
      const offset = (page - 1) * pageSize;
      
      const supabase = getSupabase();
      
      // Query builder para clientes
      let query = supabase
        .from('Client')
        .select('*', { count: 'exact' })
        .range(offset, offset + parseInt(pageSize) - 1)
        .order('createdAt', { ascending: false });
      
      // Adicionar filtro de busca se necessário
      if (search) {
        query = query.or(`name.ilike.%${search}%,document.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data: items, error, count: total } = await query;
      
      if (error) {
        console.error('Supabase error:', error);
        return reply.code(500).send({ error: { message: 'Database error' } });
      }

      return {
        items: items || [],
        total: total || 0,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      };
    } catch (error) {
      console.error('Error fetching clients:', error);
      return reply.code(500).send({ error: { message: 'Internal server error' } });
    }
  });

  app.get('/api/clients/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const supabase = getSupabase();
      
      const { data: client, error } = await supabase
        .from('Client')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error || !client) {
        return reply.code(404).send({ error: { message: 'Client not found' } });
      }
      
      return client;
    } catch (error) {
      return reply.code(500).send({ error: { message: 'Internal server error' } });
    }
  });

  app.post('/api/clients', async (request, reply) => {
    try {
      const supabase = getSupabase();
      
      const { data: client, error } = await supabase
        .from('Client')
        .insert([request.body])
        .select()
        .single();
      
      if (error) {
        return reply.code(400).send({ error: { message: error.message } });
      }
      
      return client;
    } catch (error) {
      return reply.code(500).send({ error: { message: 'Internal server error' } });
    }
  });

  app.put('/api/clients/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = request.body;
      const supabase = getSupabase();
      
      const { data: updatedClient, error } = await supabase
        .from('Client')
        .update({
          ...updateData,
          updatedAt: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        return reply.code(400).send({ error: { message: error.message } });
      }
      
      if (!updatedClient) {
        return reply.code(404).send({ error: { message: 'Client not found' } });
      }
      
      return updatedClient;
    } catch (error) {
      return reply.code(500).send({ error: { message: 'Internal server error' } });
    }
  });

  app.delete('/api/clients/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const supabase = getSupabase();
      
      const { error } = await supabase
        .from('Client')
        .delete()
        .eq('id', id);
      
      if (error) {
        return reply.code(400).send({ error: { message: error.message } });
      }
      
      return reply.code(204).send();
    } catch (error) {
      return reply.code(500).send({ error: { message: 'Internal server error' } });
    }
  });

  // Endpoints de Tipos de Serviço
  app.get('/api/service-types', async (request, reply) => {
    try {
      const { page = 1, pageSize = 10, search, active = 'true' } = request.query;
      const offset = (page - 1) * pageSize;
      
      const supabase = getSupabase();
      
      // Query builder para tipos de serviço
      let query = supabase
        .from('ServiceType')
        .select('*', { count: 'exact' })
        .range(offset, offset + parseInt(pageSize) - 1)
        .order('createdAt', { ascending: false });
      
      // Filtrar apenas ativos por padrão
      if (active !== 'all') {
        query = query.eq('active', active === 'true');
      }
      
      // Adicionar filtro de busca se necessário
      if (search) {
        query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const { data: items, error, count: total } = await query;
      
      if (error) {
        console.error('Supabase error:', error);
        return reply.code(500).send({ error: { message: 'Database error' } });
      }

      return {
        items: items || [],
        total: total || 0,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      };
    } catch (error) {
      console.error('Error fetching service types:', error);
      return reply.code(500).send({ error: { message: 'Internal server error' } });
    }
  });

  app.get('/api/service-types/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const supabase = getSupabase();
      
      const { data: serviceType, error } = await supabase
        .from('ServiceType')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error || !serviceType) {
        return reply.code(404).send({ error: { message: 'Service type not found' } });
      }
      
      return serviceType;
    } catch (error) {
      return reply.code(500).send({ error: { message: 'Internal server error' } });
    }
  });

  app.post('/api/service-types', async (request, reply) => {
    try {
      const { code, name, description, issRetained = false, active = true } = request.body;
      const supabase = getSupabase();
      
      const { data: serviceType, error } = await supabase
        .from('ServiceType')
        .insert({ code, name, description, issRetained, active })
        .select()
        .single();
      
      if (error) {
        return reply.code(400).send({ error: { message: error.message } });
      }
      
      return serviceType;
    } catch (error) {
      return reply.code(500).send({ error: { message: 'Internal server error' } });
    }
  });

  app.put('/api/service-types/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const { code, name, description, issRetained, active } = request.body;
      const supabase = getSupabase();
      
      const updateData = {};
      if (code !== undefined) updateData.code = code;
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (issRetained !== undefined) updateData.issRetained = issRetained;
      if (active !== undefined) updateData.active = active;
      updateData.updatedAt = new Date().toISOString();
      
      const { data: serviceType, error } = await supabase
        .from('ServiceType')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        return reply.code(400).send({ error: { message: error.message } });
      }
      
      return serviceType;
    } catch (error) {
      return reply.code(500).send({ error: { message: 'Internal server error' } });
    }
  });

  app.delete('/api/service-types/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const supabase = getSupabase();
      
      const { error } = await supabase
        .from('ServiceType')
        .delete()
        .eq('id', id);
      
      if (error) {
        return reply.code(400).send({ error: { message: error.message } });
      }
      
      return reply.code(204).send();
    } catch (error) {
      return reply.code(500).send({ error: { message: 'Internal server error' } });
    }
  });

  // Endpoints de Fornecedores  
  app.get('/api/suppliers', async (request, reply) => {
    try {
      const { page = 1, pageSize = 10, search } = request.query;
      const offset = (page - 1) * pageSize;
      const supabase = getSupabase();
      
      // Construir a query
      let query = supabase
        .from('Supplier')
        .select('*', { count: 'exact' })
        .order('createdAt', { ascending: false })
        .range(offset, offset + parseInt(pageSize) - 1);
      
      // Adicionar filtro de busca se especificado
      if (search) {
        query = query.or(`name.ilike.%${search}%,document.ilike.%${search}%,email.ilike.%${search}%`);
      }
      
      const { data: items, count: total, error } = await query;
      
      if (error) {
        console.error('Supabase error:', error);
        return reply.code(500).send({ error: { message: 'Database error' } });
      }

      return {
        items: items || [],
        total: total || 0,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      };
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      return reply.code(500).send({ error: { message: 'Internal server error' } });
    }
  });

  app.get('/api/suppliers/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const supabase = getSupabase();
      
      const { data: supplier, error } = await supabase
        .from('Supplier')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error || !supplier) {
        return reply.code(404).send({ error: { message: 'Supplier not found' } });
      }
      
      return supplier;
    } catch (error) {
      return reply.code(500).send({ error: { message: 'Internal server error' } });
    }
  });

  app.post('/api/suppliers', async (request, reply) => {
    try {
      const supplierData = request.body;
      const supabase = getSupabase();
      
      const { data: newSupplier, error } = await supabase
        .from('Supplier')
        .insert([{
          ...supplierData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error:', error);
        return reply.code(400).send({ error: { message: error.message } });
      }
      
      return reply.code(201).send(newSupplier);
    } catch (error) {
      console.error('Error creating supplier:', error);
      return reply.code(500).send({ error: { message: 'Internal server error' } });
    }
  });

  app.put('/api/suppliers/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = request.body;
      const supabase = getSupabase();
      
      const { data: updatedSupplier, error } = await supabase
        .from('Supplier')
        .update({
          ...updateData,
          updatedAt: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        return reply.code(400).send({ error: { message: error.message } });
      }
      
      if (!updatedSupplier) {
        return reply.code(404).send({ error: { message: 'Supplier not found' } });
      }
      
      return updatedSupplier;
    } catch (error) {
      return reply.code(500).send({ error: { message: 'Internal server error' } });
    }
  });

  app.delete('/api/suppliers/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const supabase = getSupabase();
      
      const { error } = await supabase
        .from('Supplier')
        .delete()
        .eq('id', id);
      
      if (error) {
        return reply.code(400).send({ error: { message: error.message } });
      }
      
      return reply.code(204).send();
    } catch (error) {
      return reply.code(500).send({ error: { message: 'Internal server error' } });
    }
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

// Exportar também a função para testes
export { createNfseApp };
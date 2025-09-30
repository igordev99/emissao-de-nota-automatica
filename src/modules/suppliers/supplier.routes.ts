import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

import { supplierService, SupplierData } from './supplier.service';

const execFileAsync = promisify(execFile);

const supplierIdSchema = z.object({
  id: z.string().uuid()
});

export async function supplierRoutes(app: FastifyInstance) {
  // Criar fornecedor
  app.post('/suppliers', async (request, reply) => {
    const supplierData = request.body as SupplierData;

    const supplier = await supplierService.createSupplier(supplierData);

    return reply.status(201).send(supplier);
  });

  // Listar fornecedores
  app.get('/suppliers', async (request, reply) => {
    const { page = 1, pageSize = 20, search } = request.query as any;

    const result = await supplierService.listSuppliers(page, pageSize, search);
    return reply.send(result);
  });

  // Obter fornecedor por ID
  app.get('/suppliers/:id', async (request, reply) => {
    const { id } = request.params as z.infer<typeof supplierIdSchema>;

    const supplier = await supplierService.getSupplier(id);

    if (!supplier) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Fornecedor não encontrado'
      });
    }

    return reply.send(supplier);
  });

  // Obter fornecedor por CNPJ
  app.get('/suppliers/document/:document', async (request, reply) => {
    const { document } = request.params as { document: string };

    const supplier = await supplierService.getSupplierByDocument(document);

    if (!supplier) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Fornecedor não encontrado'
      });
    }

    return reply.send(supplier);
  });

  // Atualizar fornecedor
  app.put('/suppliers/:id', async (request, reply) => {
    const { id } = request.params as z.infer<typeof supplierIdSchema>;
    const updateData = request.body as Partial<SupplierData>;

    const supplier = await supplierService.updateSupplier(id, updateData);

    if (!supplier) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Fornecedor não encontrado'
      });
    }

    return reply.send(supplier);
  });

  // Remover fornecedor
  app.delete('/suppliers/:id', async (request, reply) => {
    const { id } = request.params as z.infer<typeof supplierIdSchema>;

    const deleted = await supplierService.deleteSupplier(id);

    if (!deleted) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Fornecedor não encontrado'
      });
    }

    return reply.send({
      success: true,
      message: 'Fornecedor removido com sucesso'
    });
  });

  // Extração automática de fornecedores do Uphold
  app.post('/extract-uphold-suppliers', async (request, reply) => {
    try {
      const { email, password } = request.body as { email: string; password: string };

      // Validação básica
      if (!email || !password) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Email e senha são obrigatórios'
        });
      }

      // Caminho para o script de extração focado de tomadores
      const scriptPath = path.resolve(process.cwd(), 'scripts', 'extract-tomadores-focused.js');
      
      // Verificar se o script existe
      try {
        await fs.access(scriptPath);
      } catch {
        return reply.status(500).send({
          error: 'SCRIPT_NOT_FOUND',
          message: 'Script de extração de fornecedores não encontrado'
        });
      }

      // Executar o script Puppeteer
      const { stdout, stderr } = await execFileAsync('node', [scriptPath], {
        env: {
          ...process.env,
          UPHOLD_EMAIL: email,
          UPHOLD_PASSWORD: password
        },
        timeout: 120000 // 2 minutos timeout (pode demorar mais que clientes)
      });

      if (stderr) {
        app.log.warn({ stderr }, 'Script stderr output');
      }

      // Tentar parsear o resultado
      let extractedData;
      try {
        // O script pode retornar múltiplas linhas, pegar a última que contém o JSON
        const lines = stdout.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        extractedData = JSON.parse(lastLine);
      } catch (parseError) {
        app.log.error(`Failed to parse supplier extraction result: stdout=${stdout}, stderr=${stderr}, error=${parseError}`);
        return reply.status(500).send({
          error: 'PARSE_ERROR',
          message: 'Erro ao processar dados de fornecedores extraídos',
          debug: stdout
        });
      }

      // Transformar dados para o formato esperado
      const suppliers = extractedData.suppliers?.map((supplier: any) => ({
        name: supplier.name || '',
        document: supplier.document || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address
      })) || [];

      return reply.send({
        success: true,
        message: `${suppliers.length} fornecedores extraídos com sucesso`,
        suppliers,
        extractedAt: new Date().toISOString()
      });

    } catch (error: any) {
      app.log.error('Supplier extraction error:', error);
      
      if (error.code === 'ETIMEDOUT') {
        return reply.status(408).send({
          error: 'TIMEOUT',
          message: 'Tempo limite excedido na extração de fornecedores'
        });
      }

      return reply.status(500).send({
        error: 'EXTRACTION_ERROR',
        message: 'Erro durante a extração dos dados de fornecedores',
        details: error.message
      });
    }
  });
}
import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { supplierService, SupplierData } from './supplier.service';

const createSupplierSchema = z.object({
  name: z.string().min(1),
  document: z.string().length(14), // CNPJ only
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.object({
    street: z.string(),
    number: z.string(),
    complement: z.string().optional(),
    neighborhood: z.string(),
    city: z.string(),
    state: z.string().length(2),
    zipCode: z.string()
  }).optional()
});

const updateSupplierSchema = z.object({
  name: z.string().min(1).optional(),
  document: z.string().length(14).optional(), // CNPJ only
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.object({
    street: z.string(),
    number: z.string(),
    complement: z.string().optional(),
    neighborhood: z.string(),
    city: z.string(),
    state: z.string().length(2),
    zipCode: z.string()
  }).optional()
});

const supplierIdSchema = z.object({
  id: z.string().uuid()
});

const listSuppliersQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val)).refine(val => val > 0).optional(),
  pageSize: z.string().transform(val => parseInt(val)).refine(val => val > 0 && val <= 100).optional(),
  search: z.string().optional()
});

const supplierResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  document: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});

const suppliersListResponseSchema = z.object({
  items: z.array(supplierResponseSchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number()
});

const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string()
});

const successResponseSchema = z.object({
  success: z.boolean(),
  message: z.string()
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
}
import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { supplierService, SupplierData } from './supplier.service';

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
}
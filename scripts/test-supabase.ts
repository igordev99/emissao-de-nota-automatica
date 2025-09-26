#!/usr/bin/env tsx
/**
 * Script para testar inserção de dados no Supabase
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testSupabaseConnection() {
  try {
    console.log('🔗 Testando conexão com Supabase...')
    
    // 1. Testar conexão básica
    await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Conexão estabelecida com sucesso')
    
    // 2. Testar inserção de cliente
    const testClient = await prisma.client.create({
      data: {
        name: 'Cliente Teste Supabase',
        document: '12345678901',
        email: 'teste@supabase.com',
        phone: '11999999999'
      }
    })
    console.log('✅ Cliente criado:', testClient)
    
    // 3. Testar listagem
    const clients = await prisma.client.findMany()
    console.log('📋 Clientes no banco:', clients.length)
    
    // 4. Testar inserção de fornecedor
    const testSupplier = await prisma.supplier.create({
      data: {
        name: 'Fornecedor Teste Supabase',
        document: '12345678000123',
        email: 'fornecedor@supabase.com', 
        phone: '11888888888'
      }
    })
    console.log('✅ Fornecedor criado:', testSupplier)
    
    // 5. Testar listagem de fornecedores
    const suppliers = await prisma.supplier.findMany()
    console.log('📋 Fornecedores no banco:', suppliers.length)
    
    console.log('🎉 Todos os testes passaram! Supabase está funcionando corretamente.')
    
  } catch (error) {
    console.error('❌ Erro nos testes:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSupabaseConnection()
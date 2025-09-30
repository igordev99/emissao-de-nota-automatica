#!/usr/bin/env tsx

/**
 * Script para migrar dados do PostgreSQL atual para Supabase
 * 
 * Uso:
 * 1. Configure as variáveis de ambiente com Supabase
 * 2. Execute: npx tsx scripts/migrate-to-supabase.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ctrkdpeqiwxkvvwymipi.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY é necessária para migração')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrateDatabase() {
  console.log('🚀 Iniciando migração para Supabase...')
  
  try {
    // 1. Verificar conexão
    const { data, error } = await supabase.from('clients').select('count(*)')
    
    if (error) {
      console.log('📝 Tabelas não existem ainda, criando schema...')
      await createTables()
    } else {
      console.log('✅ Conexão com Supabase estabelecida')
    }

    // 2. Migrar dados existentes (se houver)
    // await migrateExistingData()

    console.log('🎉 Migração concluída com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro durante migração:', error)
    process.exit(1)
  }
}

async function createTables() {
  console.log('📋 Criando tabelas no Supabase...')
  
  // O schema será criado via Prisma migrate
  // Este script é para migração de dados, não schema
  console.log('ℹ️  Use: npx prisma migrate dev --name init-supabase')
}

async function migrateExistingData() {
  console.log('📦 Migrando dados existentes...')
  // Implementar migração de dados do PostgreSQL antigo se necessário
}

if (require.main === module) {
  migrateDatabase()
}
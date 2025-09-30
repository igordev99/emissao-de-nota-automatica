// Script de debug para verificar o CRUD de fornecedores
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ctrkdpeqiwxkvvwymipi.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0cmtkcGVxaXd4a3Z2d3ltaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjgzNjQsImV4cCI6MjA3NDE0NDM2NH0.TC8ZqqF9EIR7oHg26qDOSSvZKj5IDCma8Ti8d6tqFMQ';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '***' : undefined);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugSuppliers() {
  console.log('🔍 DIAGNÓSTICO DO CRUD DE FORNECEDORES');
  console.log('=====================================');

  try {
    // 1. Testar conexão
    console.log('\n1. Testando conexão com Supabase...');
    const { data: test, error: testError } = await supabase.from('Supplier').select('count').limit(1);
    
    if (testError) {
      console.error('❌ Erro de conexão:', testError.message);
      if (testError.code === 'PGRST116') {
        console.error('   → Tabela "Supplier" não existe ou não tem permissões');
        
        // Verificar outras possíveis tabelas
        console.log('\n2. Verificando tabelas disponíveis...');
        const { data: tables, error: tablesError } = await supabase.rpc('get_table_names');
        console.log('Tabelas encontradas:', tables);
      }
      return;
    }
    console.log('✅ Conexão estabelecida com sucesso');

    // 2. Verificar estrutura da tabela
    console.log('\n2. Verificando estrutura da tabela Supplier...');
    const { data: suppliers, error: selectError } = await supabase
      .from('Supplier')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.error('❌ Erro ao acessar tabela:', selectError.message);
      return;
    }
    
    console.log('✅ Tabela acessível, estrutura:', suppliers.length ? Object.keys(suppliers[0]) : 'Vazia');

    // 3. Testar criação de fornecedor de teste
    console.log('\n3. Testando criação de fornecedor...');
    const testSupplier = {
      name: 'Fornecedor Teste Debug',
      document: '12345678000199',
      email: 'debug@teste.com',
      phone: '11999999999',
      address: {
        street: 'Rua Teste',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01000-000'
      }
    };

    // Gerar UUID manualmente para teste
    const { randomUUID } = await import('crypto');
    const testId = randomUUID();

    const { data: created, error: createError } = await supabase
      .from('Supplier')
      .insert([{
        id: testId,
        ...testSupplier,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }])
      .select()
      .single();

    if (createError) {
      console.error('❌ Erro ao criar fornecedor:', createError.message);
      console.error('   Código:', createError.code);
      console.error('   Detalhes:', createError.details);
      return;
    }

    console.log('✅ Fornecedor criado com sucesso:', {
      id: created.id,
      name: created.name,
      document: created.document
    });

    // 4. Testar listagem
    console.log('\n4. Testando listagem de fornecedores...');
    const { data: list, error: listError } = await supabase
      .from('Supplier')
      .select('*')
      .limit(5);

    if (listError) {
      console.error('❌ Erro ao listar fornecedores:', listError.message);
      return;
    }

    console.log(`✅ ${list.length} fornecedores encontrados`);
    list.forEach((supplier, index) => {
      console.log(`   ${index + 1}. ${supplier.name} - ${supplier.document}`);
    });

    // 5. Limpar dados de teste
    console.log('\n5. Limpando fornecedor de teste...');
    const { error: deleteError } = await supabase
      .from('Supplier')
      .delete()
      .eq('id', created.id);

    if (deleteError) {
      console.error('⚠️  Erro ao deletar fornecedor de teste:', deleteError.message);
    } else {
      console.log('✅ Fornecedor de teste removido');
    }

    console.log('\n🎉 DIAGNÓSTICO CONCLUÍDO COM SUCESSO!');
    console.log('   O CRUD de fornecedores está funcionando corretamente no Supabase.');

  } catch (error) {
    console.error('💥 Erro inesperado:', error);
  }
}

// Executar diagnóstico
debugSuppliers().then(() => {
  console.log('\n📝 Próximos passos:');
  console.log('   1. Verifique se o frontend está usando o serviço correto');
  console.log('   2. Examine o console do navegador para erros');
  console.log('   3. Confirme se a autenticação está funcionando');
  process.exit(0);
});
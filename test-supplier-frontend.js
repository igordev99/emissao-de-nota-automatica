import { hybridSupplierService } from './ui/src/services/index.js';
import { config } from 'dotenv';
config({ path: './ui/.env' });

async function testSupplierService() {
  console.log('🔍 TESTE DO SERVIÇO DE FORNECEDORES USADO NO FRONTEND');
  console.log('=================================================');

  try {
    // 1. Testar criação
    console.log('\n1. Testando criação de fornecedor...');
    const testSupplier = {
      name: 'Teste Fornecedor Frontend',
      cnpj: '12345678000199',
      email: 'teste@frontend.com',
      phone: '11999999999',
      address: {
        street: 'Rua Frontend',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01000-000'
      }
    };

    const created = await hybridSupplierService.createSupplier(testSupplier);
    console.log('✅ Fornecedor criado:', {
      id: created.id,
      name: created.name,
      document: created.cnpj || created.document
    });

    // 2. Testar listagem
    console.log('\n2. Testando listagem...');
    const suppliers = await hybridSupplierService.getSuppliers({ pageSize: 5 });
    console.log(`✅ ${suppliers.items.length} fornecedores encontrados`);
    suppliers.items.forEach((supplier, index) => {
      console.log(`   ${index + 1}. ${supplier.name} - ${supplier.cnpj || supplier.document}`);
    });

    // 3. Testar busca por ID
    console.log('\n3. Testando busca por ID...');
    const found = await hybridSupplierService.getSupplierById(created.id);
    console.log('✅ Fornecedor encontrado:', found.name);

    // 4. Limpar teste
    console.log('\n4. Removendo fornecedor de teste...');
    await hybridSupplierService.deleteSupplier(created.id);
    console.log('✅ Fornecedor removido');

    console.log('\n🎉 TODOS OS TESTES PASSARAM!');
    console.log('   O serviço de fornecedores está funcionando corretamente.');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    console.error('   Stack:', error.stack);
    
    if (error.code) {
      console.error('   Código:', error.code);
    }
  }
}

testSupplierService().then(() => process.exit(0)).catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});
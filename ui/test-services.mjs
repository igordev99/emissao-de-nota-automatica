// Teste rápido dos services migrados para Supabase
import { hybridClientService, hybridSupplierService, hybridNfseService } from './src/services/index.ts';

async function testServices() {
  try {
    console.log('🧪 Testando services migrados para Supabase...');
    
    // Testar clientes
    console.log('👥 Testando serviço de clientes...');
    const clientsResult = await hybridClientService.getClients({ page: 1, pageSize: 5 });
    console.log(`✅ Clientes: ${clientsResult.total} total, ${clientsResult.items.length} retornados`);
    
    // Testar fornecedores  
    console.log('🏭 Testando serviço de fornecedores...');
    const suppliersResult = await hybridSupplierService.getSuppliers({ page: 1, pageSize: 5 });
    console.log(`✅ Fornecedores: ${suppliersResult.total} total, ${suppliersResult.items.length} retornados`);
    
    // Testar stats de NFSe
    console.log('📊 Testando estatísticas NFSe...');
    const stats = await hybridNfseService.getStats();
    console.log(`✅ Stats: ${stats.total} total, ${stats.pending} pendentes, ${stats.success} sucessos`);
    
    console.log('🎉 Todos os services funcionando corretamente!');
    
  } catch (error) {
    console.error('❌ Erro nos testes:', error.message);
  }
}

testServices();
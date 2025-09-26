#!/usr/bin/env node

/**
 * Script para testar o fluxo completo de importação automática
 */

import fetch from 'node-fetch';

async function testeImportacaoCompleta() {
  console.log('🧪 Teste do fluxo completo de importação automática');
  console.log('===================================================');
  
  const baseUrl = 'http://localhost:3000/api';
  
  try {
    // 1. Teste de extração automática
    console.log('1️⃣ Testando extração automática do Uphold...');
    
    const extractResponse = await fetch(`${baseUrl}/extract-uphold-clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'teste.alfa@teste.com',
        password: 'Teste@teste@teste123'
      })
    });
    
    if (!extractResponse.ok) {
      throw new Error(`Erro na extração: ${extractResponse.status} ${extractResponse.statusText}`);
    }
    
    const extractResult = await extractResponse.json();
    console.log(`✅ Extração concluída: ${extractResult.clients?.length || 0} clientes encontrados`);
    
    if (!extractResult.success || !extractResult.clients || extractResult.clients.length === 0) {
      throw new Error('Nenhum cliente foi extraído');
    }
    
    // 2. Teste de importação dos clientes extraídos
    console.log('\n2️⃣ Testando importação dos clientes extraídos...');
    
    let sucessos = 0;
    let erros = 0;
    
    for (const cliente of extractResult.clients.slice(0, 3)) { // Testar apenas os primeiros 3
      try {
        const importResponse = await fetch(`${baseUrl}/clients`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: cliente.nome,
            email: cliente.email || undefined,
            document: cliente.documento || 'N/A',
            phone: cliente.inscricaoMunicipal || undefined
          })
        });
        
        if (importResponse.ok) {
          sucessos++;
          console.log(`  ✅ ${cliente.nome} importado com sucesso`);
        } else {
          erros++;
          const errorText = await importResponse.text();
          console.log(`  ❌ ${cliente.nome}: ${errorText}`);
        }
      } catch (error) {
        erros++;
        console.log(`  ❌ ${cliente.nome}: Erro de rede - ${error.message}`);
      }
    }
    
    console.log('\n🎯 Resultado do teste:');
    console.log(`✅ Sucessos: ${sucessos}`);
    console.log(`❌ Erros: ${erros}`);
    console.log(`📊 Total processados: ${sucessos + erros}`);
    
    if (sucessos > 0) {
      console.log('\n🎉 TESTE CONCLUÍDO COM SUCESSO!');
      console.log('O fluxo completo de importação automática está funcionando!');
    } else {
      console.log('\n⚠️ TESTE FALHOU');
      console.log('Nenhum cliente foi importado com sucesso');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    console.log('\n💡 Dicas de troubleshooting:');
    console.log('- Verifique se o servidor está rodando em http://localhost:3000');
    console.log('- Confirme se as credenciais do Uphold estão corretas');
    console.log('- Verifique os logs do servidor para mais detalhes');
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testeImportacaoCompleta().catch(console.error);
}

export default testeImportacaoCompleta;
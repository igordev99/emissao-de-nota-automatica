#!/usr/bin/env node
// Script de teste de integração para validar deployment
import { execSync } from 'child_process';
import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'https://emissao-de-nota-automatica.vercel.app';

async function testAPI() {
  console.log('🧪 Iniciando testes de integração...');
  console.log(`📍 Testando API: ${API_BASE}`);
  
  const tests = [
    {
      name: 'Health Check DB',
      url: '/health/db',
      expected: 'ok'
    },
    {
      name: 'Health Check Dependencies',
      url: '/health/deps',
      expected: 'healthy'
    },
    {
      name: 'Listar Clientes',
      url: '/api/clients?page=1&pageSize=5',
      expected: 'items'
    },
    {
      name: 'Listar Fornecedores',
      url: '/api/suppliers?page=1&pageSize=5',
      expected: 'items'
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      console.log(`\n🔍 Testando: ${test.name}`);
      const response = await fetch(`${API_BASE}${test.url}`);
      const data = await response.json();
      
      if (response.ok && data[test.expected] !== undefined) {
        console.log(`✅ ${test.name}: PASSOU`);
        if (test.expected === 'items') {
          console.log(`   📊 Total de registros: ${data.total}`);
        }
        passed++;
      } else {
        console.log(`❌ ${test.name}: FALHOU`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Resposta: ${JSON.stringify(data, null, 2)}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERRO`);
      console.log(`   Erro: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n📊 Resultados:');
  console.log(`✅ Testes passaram: ${passed}`);
  console.log(`❌ Testes falharam: ${failed}`);
  console.log(`📈 Taxa de sucesso: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 Todos os testes passaram! API está funcionando corretamente.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Alguns testes falharam. Verifique os logs acima.');
    process.exit(1);
  }
}

// Testar dados CSV import se especificado
async function testCSVData() {
  if (process.argv.includes('--test-csv')) {
    console.log('\n📄 Testando persistência de dados CSV...');
    
    try {
      const response = await fetch(`${API_BASE}/api/clients`);
      const data = await response.json();
      
      if (data.total > 0) {
        console.log(`✅ Dados persistem: ${data.total} clientes encontrados`);
      } else {
        console.log('⚠️  Nenhum cliente encontrado - dados CSV podem ter sido perdidos');
      }
    } catch (error) {
      console.log(`❌ Erro testando dados CSV: ${error.message}`);
    }
  }
}

// Executar testes
if (import.meta.url === `file://${process.argv[1]}`) {
  testAPI().then(() => testCSVData());
}
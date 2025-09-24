#!/usr/bin/env node

/**
 * Teste básico e manual das credenciais
 */

console.log('🔐 TESTE DE CREDENCIAIS UPHOLD');
console.log('====================================');
console.log('');
console.log('📋 Credenciais para teste MANUAL:');
console.log('URL: http://www.upholdapp.com.br:3000/login');
console.log('Email: teste.alfa@teste.com');  
console.log('Senha: Teste@teste@teste123');
console.log('');
console.log('🔍 INSTRUÇÕES PARA TESTE MANUAL:');
console.log('1. Abra o browser em: http://www.upholdapp.com.br:3000/login');
console.log('2. Digite o email: teste.alfa@teste.com');
console.log('3. Digite a senha: Teste@teste@teste123');
console.log('4. Clique em "Entrar"');
console.log('5. Se funcionar, tente acessar: http://www.upholdapp.com.br:3000/admin/clientes');
console.log('');
console.log('✅ Se o login funcionar:');
console.log('   - Copie manualmente os dados dos clientes');
console.log('   - Use a interface web: https://ui-46sixqg66-gustavo-fernandes-projects-accf2b27.vercel.app/clients/import');
console.log('   - Cole os dados no formato desejado (JSON/CSV/Manual)');
console.log('');
console.log('❌ Se o login falhar:');
console.log('   - Verificar se as credenciais estão corretas');
console.log('   - Verificar se o usuário teste.alfa@teste.com existe no sistema');
console.log('   - Confirmar se a senha não expirou');
console.log('');
console.log('📤 Para importar dados manualmente:');
console.log('Formato JSON exemplo:');
console.log('[');
console.log('  {');
console.log('    "nome": "João Silva",');
console.log('    "email": "joao@teste.com",');
console.log('    "telefone": "(11) 99999-9999",');
console.log('    "documento": "123.456.789-00",');
console.log('    "endereco": "Rua Teste, 123"');
console.log('  }');
console.log(']');
console.log('');
console.log('🌐 Interface de importação:');
console.log('https://ui-46sixqg66-gustavo-fernandes-projects-accf2b27.vercel.app/clients/import');
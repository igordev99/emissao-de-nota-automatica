#!/usr/bin/env node

/**
 * Script para testar login via HTTP direto (sem browser)
 */

import fetch from 'node-fetch';

async function testHttpLogin() {
  console.log('🔐 Testando login via HTTP...');
  console.log('Email: teste.alfa@teste.com');
  console.log('Senha: Teste@teste@teste123\n');
  
  try {
    // 1. Primeiro, obter a página de login para cookies e tokens
    console.log('📄 Obtendo página de login...');
    const loginPageResponse = await fetch('http://www.upholdapp.com.br:3000/login', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    console.log('Status da página de login:', loginPageResponse.status);
    
    if (loginPageResponse.status !== 200) {
      console.log('❌ Erro ao acessar página de login');
      return false;
    }
    
    // Extrair cookies
    const cookies = loginPageResponse.headers.raw()['set-cookie']?.join('; ') || '';
    console.log('🍪 Cookies obtidos:', cookies ? 'Sim' : 'Não');
    
    // Obter HTML para análise
    const html = await loginPageResponse.text();
    
    // Procurar por token CSRF
    let csrfToken = '';
    const csrfMatch = html.match(/name="_token" value="([^"]+)"/);
    if (csrfMatch) {
      csrfToken = csrfMatch[1];
      console.log('🔑 Token CSRF encontrado:', csrfToken.substring(0, 10) + '...');
    }
    
    // 2. Tentar fazer login
    console.log('\n🔘 Enviando credenciais de login...');
    
    const loginData = new FormData();
    loginData.append('username', 'teste.alfa@teste.com');
    loginData.append('password', 'Teste@teste@teste123');
    if (csrfToken) {
      loginData.append('_token', csrfToken);
    }
    
    const loginResponse = await fetch('http://www.upholdapp.com.br:3000/login/check', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Cookie': cookies,
        'Referer': 'http://www.upholdapp.com.br:3000/login'
      },
      body: loginData,
      redirect: 'manual'
    });
    
    console.log('Status do login:', loginResponse.status);
    console.log('Headers de resposta:', Object.fromEntries(loginResponse.headers.entries()));
    
    // 3. Analisar resultado
    if (loginResponse.status === 302) {
      const redirectLocation = loginResponse.headers.get('location');
      console.log('🔄 Redirecionamento para:', redirectLocation);
      
      if (redirectLocation && !redirectLocation.includes('/login')) {
        console.log('✅ Login bem-sucedido! (redirecionamento)');
        
        // Tentar acessar página de clientes
        const newCookies = loginResponse.headers.raw()['set-cookie']?.join('; ') || cookies;
        
        console.log('\n📋 Testando acesso à página de clientes...');
        const clientsResponse = await fetch('http://www.upholdapp.com.br:3000/admin/clientes', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Cookie': newCookies
          }
        });
        
        console.log('Status página clientes:', clientsResponse.status);
        
        if (clientsResponse.status === 200) {
          console.log('✅ Acesso à página de clientes confirmado!');
          
          // Salvar HTML para análise
          const clientsHtml = await clientsResponse.text();
          const fs = await import('fs');
          const path = await import('path');
          const { fileURLToPath } = await import('url');
          
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = path.dirname(__filename);
          
          fs.writeFileSync(path.join(__dirname, 'clientes-http-test.html'), clientsHtml);
          console.log('💾 HTML da página de clientes salvo para análise');
          
          return true;
        } else {
          console.log('❌ Erro ao acessar página de clientes');
          return false;
        }
      } else {
        console.log('❌ Login falhou (redirecionamento para login)');
        return false;
      }
    } else if (loginResponse.status === 200) {
      console.log('⚠️ Status 200 - verificando conteúdo da resposta...');
      const responseText = await loginResponse.text();
      
      if (responseText.includes('login') || responseText.includes('erro')) {
        console.log('❌ Login falhou (ainda na página de login)');
        return false;
      } else {
        console.log('✅ Possível login bem-sucedido');
        return true;
      }
    } else {
      console.log('❌ Status inesperado:', loginResponse.status);
      const responseText = await loginResponse.text();
      console.log('Resposta:', responseText.substring(0, 200));
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erro durante teste HTTP:', error.message);
    return false;
  }
}

// Executar teste
if (import.meta.url === `file://${process.argv[1]}`) {
  testHttpLogin()
    .then(success => {
      if (success) {
        console.log('\n🎉 Teste HTTP concluído com SUCESSO!');
        console.log('✅ Credenciais válidas via HTTP');
      } else {
        console.log('\n❌ Teste HTTP FALHOU');
        console.log('⚠️ Credenciais podem estar incorretas ou site mudou');
      }
    })
    .catch(console.error);
}

export default testHttpLogin;
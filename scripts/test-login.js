#!/usr/bin/env node

/**
 * Script simples para testar login com as novas credenciais
 */

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testLogin() {
  console.log('🔐 Testando login com novas credenciais...');
  console.log('Email: teste.alfa@teste.com');
  console.log('Senha: Teste@teste@teste123');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // 1. Ir para login
    console.log('📄 Navegando para página de login...');
    await page.goto('http://www.upholdapp.com.br:3000/login', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // 2. Aguardar formulário carregar
    console.log('⏳ Aguardando formulário carregar...');
    await page.waitForSelector('input[name="username"]', { timeout: 15000 });
    await page.waitForSelector('input[name="password"]', { timeout: 15000 });
    
    // 3. Screenshot antes do login
    await page.screenshot({ path: path.join(__dirname, 'test-login-before.png') });
    console.log('📸 Screenshot antes do login salva');
    
    // 4. Preencher credenciais
    console.log('✏️ Preenchendo credenciais...');
    await page.type('input[name="username"]', 'teste.alfa@teste.com', { delay: 100 });
    await page.type('input[name="password"]', 'Teste@teste@teste123', { delay: 100 });
    
    // 5. Aguardar um pouco antes de submeter
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 6. Screenshot com credenciais preenchidas
    await page.screenshot({ path: path.join(__dirname, 'test-login-filled.png') });
    console.log('📸 Screenshot com credenciais preenchidas');
    
    // 7. Submeter formulário
    console.log('🔘 Submetendo formulário...');
    await page.click('input[type="submit"]');
    
    // 8. Aguardar resposta
    try {
      await page.waitForNavigation({ 
        waitUntil: 'networkidle2',
        timeout: 15000 
      });
    } catch (error) {
      console.log('⚠️ Timeout na navegação, verificando página atual...');
    }
    
    // 9. Verificar resultado
    const currentURL = page.url();
    console.log('🌐 URL atual:', currentURL);
    
    // 10. Screenshot do resultado
    await page.screenshot({ 
      path: path.join(__dirname, 'test-login-result.png'),
      fullPage: true 
    });
    console.log('📸 Screenshot do resultado salva');
    
    // 11. Verificar se houve redirecionamento
    if (currentURL.includes('/login')) {
      console.log('❌ Login falhou - ainda na página de login');
      
      // Capturar mensagens de erro
      const messages = await page.evaluate(() => {
        const selectors = ['.alert', '.error', '.message', '.notification', '.warning'];
        const messages = [];
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            const text = el.textContent?.trim();
            if (text && text.length > 0) {
              messages.push(text);
            }
          }
        }
        
        return messages;
      });
      
      if (messages.length > 0) {
        console.log('💬 Mensagens na página:', messages);
      }
      
      return false;
    } else {
      console.log('✅ Login bem-sucedido!');
      console.log('🎯 Nova URL:', currentURL);
      
      // Tentar acessar página de clientes
      console.log('📋 Tentando acessar página de clientes...');
      try {
        await page.goto('http://www.upholdapp.com.br:3000/admin/clientes', { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
        
        await page.screenshot({ 
          path: path.join(__dirname, 'test-clients-page.png'),
          fullPage: true 
        });
        console.log('📸 Screenshot da página de clientes salva');
        console.log('✅ Acesso à página de clientes confirmado!');
        
      } catch (error) {
        console.log('❌ Erro ao acessar página de clientes:', error.message);
      }
      
      return true;
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    
    // Screenshot do erro
    try {
      await page.screenshot({ path: path.join(__dirname, 'test-login-error.png') });
      console.log('📸 Screenshot do erro salva');
    } catch (e) {
      // Ignorar erro de screenshot
    }
    
    return false;
  } finally {
    // Aguardar um pouco para inspeção antes de fechar
    console.log('🔍 Mantendo browser aberto por 10 segundos para inspeção...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    await browser.close();
  }
}

// Executar teste
if (import.meta.url === `file://${process.argv[1]}`) {
  testLogin()
    .then(success => {
      if (success) {
        console.log('\n🎉 Teste de login concluído com SUCESSO!');
        console.log('✅ Credenciais válidas: teste.alfa@teste.com');
        console.log('✅ Acesso ao painel confirmado');
      } else {
        console.log('\n❌ Teste de login FALHOU');
        console.log('⚠️ Verificar credenciais ou estrutura do site');
        console.log('📸 Conferir screenshots salvos para debug');
      }
    })
    .catch(console.error);
}

export default testLogin;
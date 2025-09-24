#!/usr/bin/env node

/**
 * Script para fazer login automático no sistema Uphold e extrair clientes
 * Baseado na análise do formulário real
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function extractUpholdClients() {
  console.log('🚀 Iniciando extração automática do Uphold...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // 1. Navegar para login
    console.log('🔐 Carregando página de login...');
    await page.goto('http://www.upholdapp.com.br:3000/login', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // 2. Preencher formulário baseado na análise anterior
    console.log('✏️ Preenchendo formulário de login...');
    
    // Aguardar campos aparecerem
    await page.waitForSelector('input[name="username"]', { timeout: 10000 });
    await page.waitForSelector('input[name="password"]', { timeout: 10000 });
    
    // Preencher credenciais
    await page.type('input[name="username"]', 'teste.alfa@teste.com');
    await page.type('input[name="password"]', 'Teste@teste@teste123');
    
    console.log('🔘 Submetendo formulário...');
    
    // Clicar no botão submit ou pressionar Enter
    await page.click('input[type="submit"]');
    
    // Aguardar redirecionamento
    await page.waitForNavigation({ 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    const currentURL = page.url();
    console.log('🌐 URL após login:', currentURL);
    
    if (currentURL.includes('/login')) {
      console.log('❌ Login falhou - ainda na página de login');
      
      // Capturar possíveis mensagens de erro
      const errorMessages = await page.evaluate(() => {
        const alerts = Array.from(document.querySelectorAll('.alert, .error, .message'));
        return alerts.map(el => el.textContent?.trim()).filter(Boolean);
      });
      
      if (errorMessages.length > 0) {
        console.log('💬 Mensagens encontradas:', errorMessages);
      }
      
      // Salvar screenshot para debug
      await page.screenshot({ path: path.join(__dirname, 'login-error.png') });
      console.log('📸 Screenshot do erro salvo');
      
      return false;
    }
    
    console.log('✅ Login bem-sucedido!');
    
    // 3. Navegar para página de clientes
    console.log('📋 Navegando para clientes...');
    await page.goto('http://www.upholdapp.com.br:3000/admin/clientes', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // 4. Aguardar conteúdo carregar
    await page.waitForTimeout(5000);
    
    // 5. Extrair dados dos clientes
    console.log('🔍 Extraindo dados dos clientes...');
    
    const clients = await page.evaluate(() => {
      const results = [];
      
      // Estratégias múltiplas para encontrar dados de clientes
      
      // 1. Procurar por tabelas
      const tables = document.querySelectorAll('table');
      for (const table of tables) {
        const rows = table.querySelectorAll('tr');
        let isClientTable = false;
        
        // Verificar se é uma tabela de clientes pelo cabeçalho
        const headerRow = rows[0];
        if (headerRow) {
          const headerText = headerRow.textContent?.toLowerCase() || '';
          if (headerText.includes('nome') || headerText.includes('cliente') || headerText.includes('email')) {
            isClientTable = true;
          }
        }
        
        if (isClientTable) {
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.querySelectorAll('td');
            
            if (cells.length >= 2) {
              const client = {
                id: Date.now() + i,
                nome: cells[0]?.textContent?.trim() || '',
                email: cells[1]?.textContent?.trim() || '',
                telefone: cells[2]?.textContent?.trim() || '',
                documento: cells[3]?.textContent?.trim() || '',
                endereco: cells[4]?.textContent?.trim() || '',
                origem: 'uphold-automatico'
              };
              
              // Só adicionar se tiver pelo menos nome válido
              if (client.nome && client.nome.length > 2 && !client.nome.includes('Nenhum')) {
                results.push(client);
              }
            }
          }
        }
      }
      
      // 2. Procurar por cards ou divs
      const clientCards = document.querySelectorAll('.client-card, .cliente-item, [data-client-id]');
      for (const card of clientCards) {
        const nome = card.querySelector('.name, .nome, h3, h4, .client-name')?.textContent?.trim() || '';
        const email = card.querySelector('.email, .client-email')?.textContent?.trim() || '';
        const telefone = card.querySelector('.phone, .telefone, .client-phone')?.textContent?.trim() || '';
        
        if (nome && nome.length > 2) {
          results.push({
            id: Date.now() + results.length,
            nome,
            email,
            telefone,
            documento: '',
            endereco: '',
            origem: 'uphold-automatico'
          });
        }
      }
      
      // 3. Procurar por listas
      const listItems = document.querySelectorAll('li, .list-item');
      for (const item of listItems) {
        const text = item.textContent?.trim() || '';
        // Se parece um nome (tem espaço e não é muito longo)
        if (text.includes(' ') && text.length > 5 && text.length < 100 && !text.includes('@') && !text.includes('http')) {
          // Verificar se não é um texto de interface
          if (!text.toLowerCase().includes('cliente') && !text.toLowerCase().includes('adicionar') && !text.toLowerCase().includes('editar')) {
            results.push({
              id: Date.now() + results.length,
              nome: text,
              email: '',
              telefone: '',
              documento: '',
              endereco: '',
              origem: 'uphold-automatico'
            });
          }
        }
      }
      
      // 4. Procurar por dados JSON no JavaScript
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const content = script.textContent || '';
        
        // Padrões para encontrar arrays de clientes
        const patterns = [
          /var\s+clientes\s*=\s*(\[.*?\]);/s,
          /window\.clientes\s*=\s*(\[.*?\]);/s,
          /"clientes":\s*(\[.*?\])/s,
          /clients\s*:\s*(\[.*?\])/s
        ];
        
        for (const pattern of patterns) {
          const match = content.match(pattern);
          if (match) {
            try {
              const data = JSON.parse(match[1]);
              if (Array.isArray(data) && data.length > 0) {
                console.log('JSON encontrado:', data.length, 'clientes');
                return data.map((client, index) => ({
                  ...client,
                  id: client.id || Date.now() + index,
                  origem: 'uphold-json'
                }));
              }
            } catch (e) {
              // Ignorar erros de JSON
            }
          }
        }
      }
      
      // Remover duplicatas por nome
      const uniqueClients = results.filter((client, index, self) => 
        index === self.findIndex(c => c.nome.toLowerCase() === client.nome.toLowerCase())
      );
      
      return uniqueClients;
    });
    
    console.log(`📊 ${clients.length} clientes encontrados`);
    
    // 6. Salvar evidências
    await page.screenshot({ 
      path: path.join(__dirname, 'clientes-success.png'),
      fullPage: true 
    });
    
    const html = await page.content();
    fs.writeFileSync(path.join(__dirname, 'clientes-final.html'), html);
    
    // 7. Salvar dados dos clientes
    if (clients.length > 0) {
      const outputPath = path.join(__dirname, 'clientes-uphold-final.json');
      fs.writeFileSync(outputPath, JSON.stringify(clients, null, 2));
      console.log(`💾 Clientes salvos em ${outputPath}`);
      
      // Criar CSV também
      const csvPath = path.join(__dirname, 'clientes-uphold-final.csv');
      const csvHeader = 'Nome,Email,Telefone,Documento,Endereco,Origem\n';
      const csvRows = clients.map(client => 
        `"${client.nome}","${client.email}","${client.telefone}","${client.documento}","${client.endereco}","${client.origem}"`
      ).join('\n');
      
      fs.writeFileSync(csvPath, csvHeader + csvRows);
      console.log(`📊 CSV salvo em ${csvPath}`);
      
      // Mostrar preview dos dados
      console.log('\n📋 Preview dos clientes:');
      clients.slice(0, 5).forEach(client => {
        console.log(`- ${client.nome} ${client.email ? `(${client.email})` : ''}`);
      });
      
      if (clients.length > 5) {
        console.log(`... e mais ${clients.length - 5} clientes`);
      }
    }
    
    // 8. Aguardar um pouco para inspeção
    console.log('\n🔍 Aguardando 10 segundos para inspeção...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    return clients;
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    // Salvar screenshot do erro
    try {
      await page.screenshot({ path: path.join(__dirname, 'error-screenshot.png') });
      console.log('📸 Screenshot do erro salvo');
    } catch (e) {
      // Ignorar erros de screenshot
    }
    
    return [];
  } finally {
    await browser.close();
  }
}

// Executar
if (import.meta.url === `file://${process.argv[1]}`) {
  extractUpholdClients()
    .then(clients => {
      if (clients.length > 0) {
        console.log('\n✅ Extração concluída com sucesso!');
        console.log('💡 Você pode importar esses clientes usando a interface web em /clients/import');
      } else {
        console.log('\n⚠️ Nenhum cliente foi extraído.');
        console.log('💡 Verifique os arquivos salvos para debug manual.');
      }
    })
    .catch(console.error);
}

export default extractUpholdClients;
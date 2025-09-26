#!/usr/bin/env node

/**
 * Script para importar clientes do painel Uphold usando Puppeteer
 * Automatiza o browser para fazer login e extrair dados
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UpholdClientScraper {
  constructor() {
    this.baseURL = 'http://www.upholdapp.com.br:3000';
    this.credentials = {
      email: 'teste.alfa@teste.com',
      password: 'Teste@teste@teste123'
    };
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log('🚀 Iniciando browser...');
    this.browser = await puppeteer.launch({
      headless: false, // Mostrar browser para debug
      defaultViewport: { width: 1280, height: 800 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  }

  async login() {
    console.log('🔐 Fazendo login no painel Uphold...');
    
    try {
      // Navegar para página de login
      await this.page.goto(`${this.baseURL}/login`, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      console.log('📄 Página de login carregada');

      // Aguardar os campos aparecerem
      await this.page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
      
      // Preencher credenciais
      const emailSelector = await this.page.$('input[type="email"], input[name="email"]');
      const passwordSelector = await this.page.$('input[type="password"], input[name="password"]');
      
      if (emailSelector && passwordSelector) {
        await emailSelector.type(this.credentials.email);
        await passwordSelector.type(this.credentials.password);
        
        console.log('✏️ Credenciais preenchidas');

        // Procurar botão de submit
        const submitButton = await this.page.$('button[type="submit"], input[type="submit"], button:contains("Entrar")');
        if (submitButton) {
          await submitButton.click();
          console.log('🔘 Botão de login clicado');
        } else {
          // Tentar pressionar Enter
          await this.page.keyboard.press('Enter');
          console.log('⌨️ Enter pressionado');
        }

        // Aguardar redirecionamento
        await this.page.waitForNavigation({ 
          waitUntil: 'networkidle2',
          timeout: 15000 
        });
        
        const currentURL = this.page.url();
        console.log('🌐 URL atual após login:', currentURL);
        
        if (currentURL.includes('/login')) {
          console.log('❌ Ainda na página de login - verificar credenciais');
          return false;
        } else {
          console.log('✅ Login bem-sucedido!');
          return true;
        }
      } else {
        console.log('❌ Campos de login não encontrados');
        return false;
      }
    } catch (error) {
      console.error('❌ Erro no login:', error.message);
      return false;
    }
  }

  async navigateToClients() {
    console.log('📋 Navegando para página de clientes...');
    
    try {
      await this.page.goto(`${this.baseURL}/admin/clientes`, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      console.log('✅ Página de clientes carregada');
      return true;
    } catch (error) {
      console.error('❌ Erro ao acessar clientes:', error.message);
      return false;
    }
  }

  async extractClients() {
    console.log('🔍 Extraindo dados dos clientes...');
    
    try {
      // Aguardar tabela ou lista carregar
      await this.page.waitForTimeout(3000);

      // Tentar diferentes seletores para encontrar os dados
      const clients = await this.page.evaluate(() => {
        const results = [];
        
        // Procurar por tabelas
        const tables = document.querySelectorAll('table');
        if (tables.length > 0) {
          console.log('Tabelas encontradas:', tables.length);
          
          tables.forEach((table, index) => {
            const rows = table.querySelectorAll('tr');
            console.log(`Tabela ${index}: ${rows.length} linhas`);
            
            rows.forEach((row, rowIndex) => {
              if (rowIndex === 0) return; // Skip header
              
              const cells = row.querySelectorAll('td, th');
              if (cells.length >= 2) {
                const client = {
                  id: Date.now() + rowIndex,
                  nome: cells[0]?.textContent?.trim() || '',
                  email: cells[1]?.textContent?.trim() || '',
                  telefone: cells[2]?.textContent?.trim() || '',
                  documento: cells[3]?.textContent?.trim() || '',
                  endereco: cells[4]?.textContent?.trim() || '',
                  origem: 'uphold-scraping'
                };
                
                if (client.nome && client.nome.length > 2) {
                  results.push(client);
                }
              }
            });
          });
        }

        // Procurar por cards ou divs com dados
        const cards = document.querySelectorAll('.client-card, .cliente, [data-client]');
        console.log('Cards encontrados:', cards.length);
        
        cards.forEach((card, index) => {
          const nome = card.querySelector('.name, .nome, h3, h4')?.textContent?.trim();
          const email = card.querySelector('.email, [type="email"]')?.textContent?.trim();
          const telefone = card.querySelector('.phone, .telefone')?.textContent?.trim();
          
          if (nome && nome.length > 2) {
            results.push({
              id: Date.now() + index + 1000,
              nome,
              email: email || '',
              telefone: telefone || '',
              documento: '',
              endereco: '',
              origem: 'uphold-scraping'
            });
          }
        });

        // Procurar por dados JSON no DOM
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
          const content = script.textContent || '';
          const jsonMatches = content.match(/clientes.*?=.*?(\[.*?\])/g);
          if (jsonMatches) {
            console.log('JSON encontrado em script:', jsonMatches[0].substring(0, 100));
          }
        });

        return results;
      });

      console.log(`📊 ${clients.length} clientes extraídos`);
      
      // Salvar screenshot para debug
      await this.page.screenshot({ 
        path: path.join(__dirname, 'clientes-screenshot.png'),
        fullPage: true 
      });
      console.log('📸 Screenshot salvo em clientes-screenshot.png');

      // Salvar HTML para análise
      const html = await this.page.content();
      fs.writeFileSync(path.join(__dirname, 'clientes-page-puppeteer.html'), html);
      console.log('💾 HTML salvo em clientes-page-puppeteer.html');

      return clients;
    } catch (error) {
      console.error('❌ Erro ao extrair clientes:', error.message);
      return [];
    }
  }

  async saveClients(clients) {
    if (clients.length === 0) {
      console.log('⚠️ Nenhum cliente para salvar');
      return;
    }

    const outputPath = path.join(__dirname, 'clientes-uphold-extraidos.json');
    fs.writeFileSync(outputPath, JSON.stringify(clients, null, 2));
    console.log(`💾 ${clients.length} clientes salvos em ${outputPath}`);
    
    // Criar CSV
    const csvPath = path.join(__dirname, 'clientes-uphold-extraidos.csv');
    const csvHeader = 'ID,Nome,Email,Telefone,Documento,Endereco,Origem\n';
    const csvRows = clients.map(client => 
      `"${client.id}","${client.nome}","${client.email}","${client.telefone}","${client.documento}","${client.endereco}","${client.origem}"`
    ).join('\n');
    
    fs.writeFileSync(csvPath, csvHeader + csvRows);
    console.log(`📊 CSV salvo em ${csvPath}`);
  }

  async importToAPI(clients) {
    console.log('🚀 Importando clientes para nossa API...');
    
    if (clients.length === 0) {
      console.log('⚠️ Nenhum cliente para importar');
      return;
    }

    const apiURL = 'https://emissao-de-nota-automatica-qsctryhnj.vercel.app';
    let imported = 0;
    let errors = 0;

    for (const client of clients) {
      try {
        // Usar fetch do Node.js moderno
        const response = await fetch(`${apiURL}/api/clients`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(client)
        });

        if (response.ok) {
          imported++;
          console.log(`✅ Cliente importado: ${client.nome}`);
        } else {
          errors++;
          const errorText = await response.text();
          console.log(`❌ Erro ao importar: ${client.nome} - Status: ${response.status} - ${errorText}`);
        }
      } catch (error) {
        errors++;
        console.log(`❌ Erro de rede: ${client.nome} - ${error.message}`);
      }
    }

    console.log(`\n📊 Importação concluída:`);
    console.log(`✅ Importados: ${imported}`);
    console.log(`❌ Erros: ${errors}`);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    console.log('🚀 Iniciando extração de clientes do Uphold com Puppeteer...\n');
    
    try {
      // 1. Inicializar browser
      await this.init();

      // 2. Fazer login
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        console.error('❌ Não foi possível fazer login. Verifique as credenciais.');
        await this.close();
        return;
      }

      // 3. Navegar para clientes
      const navSuccess = await this.navigateToClients();
      if (!navSuccess) {
        console.error('❌ Não foi possível acessar a página de clientes.');
        await this.close();
        return;
      }

      // 4. Extrair clientes
      const clients = await this.extractClients();

      // 5. Salvar dados
      await this.saveClients(clients);

      // 6. Importar para API (opcional)
      const shouldImport = process.argv.includes('--import');
      if (shouldImport && clients.length > 0) {
        await this.importToAPI(clients);
      } else if (clients.length > 0) {
        console.log('\n💡 Para importar os clientes para a API, execute:');
        console.log('node scripts/import-clients-puppeteer.js --import');
      }

      console.log('\n✅ Processo de extração finalizado!');
      
      // Manter browser aberto por 10 segundos para inspeção
      console.log('🔍 Mantendo browser aberto por 10 segundos para inspeção...');
      await this.page.waitForTimeout(10000);

    } catch (error) {
      console.error('❌ Erro geral:', error.message);
    } finally {
      await this.close();
    }
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const scraper = new UpholdClientScraper();
  scraper.run().catch(console.error);
}

export default UpholdClientScraper;
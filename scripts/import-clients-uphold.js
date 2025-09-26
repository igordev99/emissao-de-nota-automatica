#!/usr/bin/env node

/**
 * Script para importar clientes do painel espelho Uphold
 * Faz login no sistema e extrai dados dos clientes
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UpholdClientImporter {
  constructor() {
    this.baseURL = 'http://www.upholdapp.com.br:3000';
    this.credentials = {
      email: 'teste.alfa@teste.com',
      password: 'Teste@teste@teste123'
    };
    this.cookies = '';
    this.clients = [];
  }

  async login() {
    console.log('🔐 Fazendo login no painel Uphold...');
    
    try {
      // Primeiro, vamos obter a página de login para possíveis tokens CSRF
      const loginPageResponse = await fetch(`${this.baseURL}/login`);
      const loginPageText = await loginPageResponse.text();
      
      // Extrair cookies da primeira requisição
      const setCookieHeaders = loginPageResponse.headers.raw()['set-cookie'];
      if (setCookieHeaders) {
        this.cookies = setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');
      }

      // Tentar encontrar token CSRF se houver
      let csrfToken = '';
      const csrfMatch = loginPageText.match(/name="_token" value="([^"]+)"/);
      if (csrfMatch) {
        csrfToken = csrfMatch[1];
      }

      // Preparar dados do login
      const loginData = new URLSearchParams();
      loginData.append('email', this.credentials.email);
      loginData.append('password', this.credentials.password);
      if (csrfToken) {
        loginData.append('_token', csrfToken);
      }

      // Fazer login
      const loginResponse = await fetch(`${this.baseURL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': this.cookies,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        body: loginData,
        redirect: 'manual'
      });

      // Atualizar cookies após login
      const newSetCookieHeaders = loginResponse.headers.raw()['set-cookie'];
      if (newSetCookieHeaders) {
        const newCookies = newSetCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');
        this.cookies = this.cookies ? `${this.cookies}; ${newCookies}` : newCookies;
      }

      console.log('✅ Login realizado, status:', loginResponse.status);
      
      if (loginResponse.status === 302 || loginResponse.status === 200) {
        console.log('✅ Login bem-sucedido!');
        return true;
      } else {
        console.error('❌ Falha no login:', loginResponse.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Erro no login:', error.message);
      return false;
    }
  }

  async fetchClientsPage() {
    console.log('📋 Acessando página de clientes...');
    
    try {
      const response = await fetch(`${this.baseURL}/admin/clientes`, {
        headers: {
          'Cookie': this.cookies,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (response.status === 200) {
        const html = await response.text();
        console.log('✅ Página de clientes acessada com sucesso!');
        return html;
      } else {
        console.error('❌ Erro ao acessar clientes, status:', response.status);
        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao buscar clientes:', error.message);
      return null;
    }
  }

  parseClientsFromHTML(html) {
    console.log('🔍 Analisando HTML para extrair dados dos clientes...');
    
    // Salvar HTML para análise
    fs.writeFileSync(path.join(__dirname, 'clientes-page.html'), html);
    console.log('💾 HTML salvo em clientes-page.html para análise');

    const clients = [];
    
    // Procurar por padrões comuns de tabelas de clientes
    const tablePatterns = [
      /<table[^>]*>(.*?)<\/table>/gis,
      /<tbody[^>]*>(.*?)<\/tbody>/gis,
      /<tr[^>]*>(.*?)<\/tr>/gis
    ];

    // Procurar por dados JSON inline
    const jsonPatterns = [
      /var\s+clientes\s*=\s*(\[.*?\]);/s,
      /window\.clientes\s*=\s*(\[.*?\]);/s,
      /"clientes":\s*(\[.*?\])/s
    ];

    for (const pattern of jsonPatterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          console.log('✅ Dados JSON encontrados:', data.length, 'clientes');
          return data;
        } catch (e) {
          console.log('⚠️ Erro ao parsear JSON encontrado');
        }
      }
    }

    // Se não encontrou JSON, procurar na estrutura HTML
    const rowMatches = html.match(/<tr[^>]*>.*?<\/tr>/gis);
    if (rowMatches) {
      console.log(`🔍 Encontradas ${rowMatches.length} linhas de tabela`);
      
      rowMatches.forEach((row, index) => {
        const cells = row.match(/<td[^>]*>(.*?)<\/td>/gis);
        if (cells && cells.length > 2) {
          const client = {
            id: index + 1,
            nome: this.cleanHTML(cells[0] || ''),
            email: this.cleanHTML(cells[1] || ''),
            telefone: this.cleanHTML(cells[2] || ''),
            documento: this.cleanHTML(cells[3] || ''),
            endereco: this.cleanHTML(cells[4] || '')
          };
          
          // Só adicionar se tiver pelo menos nome
          if (client.nome && client.nome.length > 2) {
            clients.push(client);
          }
        }
      });
    }

    console.log(`📊 ${clients.length} clientes extraídos do HTML`);
    return clients;
  }

  cleanHTML(html) {
    return html
      .replace(/<[^>]*>/g, '') // Remove tags HTML
      .replace(/&nbsp;/g, ' ') // Replace &nbsp;
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  async saveClients(clients) {
    const outputPath = path.join(__dirname, 'clientes-importados.json');
    fs.writeFileSync(outputPath, JSON.stringify(clients, null, 2));
    console.log(`💾 ${clients.length} clientes salvos em ${outputPath}`);
    
    // Também criar um CSV para fácil visualização
    const csvPath = path.join(__dirname, 'clientes-importados.csv');
    const csvHeader = 'ID,Nome,Email,Telefone,Documento,Endereco\n';
    const csvRows = clients.map(client => 
      `"${client.id}","${client.nome}","${client.email}","${client.telefone}","${client.documento}","${client.endereco}"`
    ).join('\n');
    
    fs.writeFileSync(csvPath, csvHeader + csvRows);
    console.log(`📊 CSV salvo em ${csvPath}`);
  }

  async importToAPI(clients) {
    console.log('🚀 Importando clientes para nossa API...');
    
    const apiURL = 'https://emissao-de-nota-automatica-qsctryhnj.vercel.app';
    let imported = 0;
    let errors = 0;

    for (const client of clients) {
      try {
        const response = await fetch(`${apiURL}/api/clients`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nome: client.nome,
            email: client.email,
            telefone: client.telefone,
            documento: client.documento,
            endereco: client.endereco,
            origem: 'uphold-import'
          })
        });

        if (response.ok) {
          imported++;
          console.log(`✅ Cliente importado: ${client.nome}`);
        } else {
          errors++;
          console.log(`❌ Erro ao importar: ${client.nome} - Status: ${response.status}`);
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

  async run() {
    console.log('🚀 Iniciando importação de clientes do Uphold...\n');
    
    // 1. Fazer login
    const loginSuccess = await this.login();
    if (!loginSuccess) {
      console.error('❌ Não foi possível fazer login. Verifique as credenciais.');
      return;
    }

    // 2. Buscar página de clientes
    const html = await this.fetchClientsPage();
    if (!html) {
      console.error('❌ Não foi possível acessar a página de clientes.');
      return;
    }

    // 3. Extrair dados dos clientes
    const clients = this.parseClientsFromHTML(html);
    if (clients.length === 0) {
      console.log('⚠️ Nenhum cliente encontrado ou formato não reconhecido.');
      console.log('📄 Verifique o arquivo clientes-page.html para análise manual.');
      return;
    }

    // 4. Salvar dados extraídos
    await this.saveClients(clients);

    // 5. Importar para nossa API
    if (clients.length > 0) {
      const shouldImport = process.argv.includes('--import');
      if (shouldImport) {
        await this.importToAPI(clients);
      } else {
        console.log('\n💡 Para importar os clientes para a API, execute:');
        console.log('node import-clients-uphold.js --import');
      }
    }

    console.log('\n✅ Processo de importação finalizado!');
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const importer = new UpholdClientImporter();
  importer.run().catch(console.error);
}

export default UpholdClientImporter;
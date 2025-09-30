#!/usr/bin/env node

/**
 * Script focado para extrair tomadores da página /admin/tomadores
 * Baseado na análise da estrutura HTML encontrada
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function extractTomadoresFocused() {
  // Obter credenciais das variáveis de ambiente ou usar padrão
  const email = process.env.UPHOLD_EMAIL || 'teste.alfa@teste.com';
  const password = process.env.UPHOLD_PASSWORD || 'Teste@teste@teste123';
  
  console.log('🎯 Extração focada de tomadores - Página /admin/tomadores');
  console.log('===========================================================');
  console.log(`👤 Login: ${email}`);
  
  const browser = await puppeteer.launch({
    headless: process.env.NODE_ENV === 'production', // Headless em produção
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const page = await browser.newPage();
  
  try {
    // 1. Login
    console.log('🔐 Fazendo login...');
    await page.goto('http://www.upholdapp.com.br:3000/login', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    await page.waitForSelector('input[name="username"]', { timeout: 10000 });
    await page.type('input[name="username"]', email, { delay: 50 });
    await page.type('input[name="password"]', password, { delay: 50 });
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('input[type="submit"]')
    ]);
    
    console.log('✅ Login realizado!');
    
    // 2. Acessar a página de tomadores
    console.log('📋 Acessando página de tomadores...');
    await page.goto('http://www.upholdapp.com.br:3000/admin/tomadores', { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    // Aguardar a tabela carregar
    console.log('⏳ Aguardando tabela carregar...');
    await page.waitForSelector('#tbTomadores', { timeout: 10000 });
    
    // Aguardar os dados aparecerem na tabela
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Tentar aumentar o número de itens por página
    try {
      console.log('📊 Configurando exibição para mostrar mais itens...');
      
      // Tentar selecionar 100 itens por página se possível
      const lengthSelect = await page.$('#tbTomadores_length select');
      if (lengthSelect) {
        await page.select('#tbTomadores_length select', '100');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar recarregar
      }
    } catch (e) {
      console.log('ℹ️ Não foi possível alterar o número de itens por página');
    }
    
    // 3. Extrair dados da tabela de tomadores
    console.log('🔍 Extraindo dados da tabela...');
    
    const tomadores = await page.evaluate(() => {
      const results = [];
      
      // Buscar especificamente a tabela #tbTomadores
      const table = document.querySelector('#tbTomadores');
      if (!table) {
        console.log('❌ Tabela #tbTomadores não encontrada');
        return [];
      }
      
      const tbody = table.querySelector('tbody');
      if (!tbody) {
        console.log('❌ tbody não encontrado na tabela');
        return [];
      }
      
      const rows = tbody.querySelectorAll('tr');
      console.log(`📊 Encontradas ${rows.length} linhas na tabela de tomadores`);
      
      rows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        
        if (cells.length >= 4) { // Nome, CNPJ/CPF, Data, Inscr.Municipal
          // Coluna 0: Nome (pode estar em um link)
          const nameCell = cells[0];
          const nameLink = nameCell.querySelector('a');
          const name = nameLink ? nameLink.textContent.trim() : nameCell.textContent.trim();
          
          // Coluna 1: CNPJ/CPF
          const document = cells[1] ? cells[1].textContent.trim() : '';
          
          // Coluna 2: Data de Cadastro
          const dataCadastro = cells[2] ? cells[2].textContent.trim() : '';
          
          // Coluna 3: Inscrição Municipal
          const inscricaoMunicipal = cells[3] ? cells[3].textContent.trim() : '';
          
          if (name && document && name !== 'Nome') { // Evitar cabeçalho
            console.log(`  ✅ Tomador encontrado: ${name} - ${document}`);
            
            results.push({
              name: name,
              document: document,
              email: '', // Não disponível nesta visualização
              phone: '', // Não disponível nesta visualização
              dataCadastro: dataCadastro,
              inscricaoMunicipal: inscricaoMunicipal,
              source: 'admin_tomadores_table',
              rowIndex: index
            });
          }
        }
      });
      
      return results;
    });
    
    console.log(`📊 ${tomadores.length} tomadores extraídos da primeira página`);
    
    // 4. Tentar navegar pelas páginas para buscar mais dados
    let allTomadores = [...tomadores];
    let currentPage = 1;
    const maxPages = 5; // Limitar a 5 páginas para não sobrecarregar
    
    try {
      console.log('📄 Verificando se há mais páginas...');
      
      // Verificar informações de paginação
      const paginationInfo = await page.evaluate(() => {
        const infoElement = document.querySelector('#tbTomadores_info');
        return infoElement ? infoElement.textContent.trim() : '';
      });
      
      console.log(`📋 Info da paginação: ${paginationInfo}`);
      
      // Tentar navegar para próximas páginas
      while (currentPage < maxPages) {
        const nextButton = await page.$('#tbTomadores_next:not(.disabled)');
        if (!nextButton) {
          console.log('📄 Não há mais páginas disponíveis');
          break;
        }
        
        console.log(`📄 Navegando para página ${currentPage + 1}...`);
        
        try {
          await page.click('#tbTomadores_next a');
          await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar possível reload
          
          currentPage++;
          
          // Extrair dados da nova página
          const moreTomadores = await page.evaluate(() => {
            const results = [];
            const tbody = document.querySelector('#tbTomadores tbody');
            if (tbody) {
              const rows = tbody.querySelectorAll('tr');
              
              rows.forEach((row, index) => {
                const cells = row.querySelectorAll('td');
                
                if (cells.length >= 4) {
                  const nameCell = cells[0];
                  const nameLink = nameCell.querySelector('a');
                  const name = nameLink ? nameLink.textContent.trim() : nameCell.textContent.trim();
                  const document = cells[1] ? cells[1].textContent.trim() : '';
                  const dataCadastro = cells[2] ? cells[2].textContent.trim() : '';
                  const inscricaoMunicipal = cells[3] ? cells[3].textContent.trim() : '';
                  
                  if (name && document && name !== 'Nome') {
                    results.push({
                      name: name,
                      document: document,
                      email: '',
                      phone: '',
                      dataCadastro: dataCadastro,
                      inscricaoMunicipal: inscricaoMunicipal,
                      source: 'admin_tomadores_table',
                      rowIndex: index,
                      page: currentPage
                    });
                  }
                }
              });
            }
            return results;
          });
          
          console.log(`📊 Página ${currentPage}: +${moreTomadores.length} tomadores`);
          allTomadores = [...allTomadores, ...moreTomadores];
          
        } catch (pageError) {
          console.log(`❌ Erro ao navegar para página ${currentPage + 1}: ${pageError.message}`);
          break;
        }
      }
      
    } catch (paginationError) {
      console.log(`ℹ️ Erro na paginação (continuando com dados da primeira página): ${paginationError.message}`);
    }
    
    console.log(`📊 Total final: ${allTomadores.length} tomadores extraídos`);
    
    // 5. Transformar para o formato padrão da API de suppliers
    const suppliersPadronizados = allTomadores.map(tomador => ({
      name: tomador.name,
      document: tomador.document,
      email: tomador.email || '',
      phone: tomador.phone || '',
      inscricaoMunicipal: tomador.inscricaoMunicipal,
      dataCadastro: tomador.dataCadastro
    }));
    
    // 6. Salvar os dados
    if (suppliersPadronizados.length > 0) {
      // JSON completo
      const jsonPath = path.join(__dirname, 'tomadores-focused-extraction.json');
      fs.writeFileSync(jsonPath, JSON.stringify(allTomadores, null, 2));
      console.log(`💾 Dados completos salvos: ${jsonPath}`);
      
      // JSON padronizado para API
      const padronizadoPath = path.join(__dirname, 'suppliers-from-tomadores.json');
      fs.writeFileSync(padronizadoPath, JSON.stringify(suppliersPadronizados, null, 2));
      console.log(`💾 Dados padronizados salvos: ${padronizadoPath}`);
      
      // CSV
      const csvPath = path.join(__dirname, 'tomadores-extraction.csv');
      const csvHeader = 'Nome,CNPJ/CPF,Email,Telefone,Data_Cadastro,Inscricao_Municipal\n';
      const csvRows = suppliersPadronizados.map(supplier => 
        `"${supplier.name}","${supplier.document}","${supplier.email}","${supplier.phone}","${supplier.dataCadastro || ''}","${supplier.inscricaoMunicipal || ''}"`
      ).join('\n');
      
      fs.writeFileSync(csvPath, csvHeader + csvRows);
      console.log(`📊 CSV salvo: ${csvPath}`);
      
      // Screenshot final
      await page.screenshot({ 
        path: path.join(__dirname, 'tomadores-final-state.png'),
        fullPage: false 
      });
      
      // Preview
      console.log('\n📋 PREVIEW DOS TOMADORES EXTRAÍDOS:');
      console.log('===================================');
      suppliersPadronizados.slice(0, 15).forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} - CNPJ: ${item.document} - IM: ${item.inscricaoMunicipal || 'N/A'}`);
      });
      
      if (suppliersPadronizados.length > 15) {
        console.log(`... e mais ${suppliersPadronizados.length - 15} tomadores`);
      }
    }
    
    return suppliersPadronizados;
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    try {
      await page.screenshot({ 
        path: path.join(__dirname, 'tomadores-focused-error.png'),
        fullPage: true 
      });
      console.log('📸 Screenshot do erro salvo');
    } catch (e) {
      console.log('❌ Não foi possível salvar screenshot do erro');
    }
    
    throw error;
  } finally {
    await browser.close();
  }
}

// Executar
if (import.meta.url === `file://${process.argv[1]}`) {
  extractTomadoresFocused()
    .then(suppliers => {
      console.log('\n🎉 EXTRAÇÃO FOCADA FINALIZADA!');
      console.log(`✅ ${suppliers.length} tomadores extraídos com sucesso`);
      
      const result = {
        success: true,
        suppliers: suppliers,
        extractedAt: new Date().toISOString(),
        count: suppliers.length,
        source: 'admin_tomadores_table'
      };
      
      // Saída JSON estruturada para o endpoint capturar
      console.log(JSON.stringify(result));
      
      if (suppliers.length > 0) {
        console.error('\n💡 PRÓXIMOS PASSOS:');
        console.error('1. Os dados foram salvos em: suppliers-from-tomadores.json');
        console.error('2. Use a interface de importação de fornecedores');
        console.error('3. Ou integre com o endpoint POST /api/suppliers/extract');
      }
    })
    .catch(error => {
      console.error(`❌ Erro na extração: ${error.message}`);
      
      const result = {
        success: false,
        error: error.message,
        suppliers: [],
        extractedAt: new Date().toISOString(),
        source: 'admin_tomadores_table'
      };
      
      console.log(JSON.stringify(result));
      process.exit(1);
    });
}

export default extractTomadoresFocused;
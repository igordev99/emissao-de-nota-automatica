#!/usr/bin/env node

/**
 * Script para extrair especificamente dados do módulo de fórmulas
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function extractFormulas() {
  const email = process.env.UPHOLD_EMAIL || 'teste.alfa@teste.com';
  const password = process.env.UPHOLD_PASSWORD || 'Teste@teste@teste123';
  
  console.log('🧮 Extração do Módulo de Fórmulas do Uphold');
  console.log('===========================================');
  
  const browser = await puppeteer.launch({
    headless: process.env.NODE_ENV === 'production', 
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const page = await browser.newPage();
  
  try {
    // Login
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
    
    // Acessar módulo de fórmulas
    console.log('📋 Acessando módulo de fórmulas...');
    const response = await page.goto('http://www.upholdapp.com.br:3000/admin/config/formulas', { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    if (response.status() !== 200) {
      throw new Error(`Módulo não acessível: status ${response.status()}`);
    }
    
    // Aguardar página carregar
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Screenshot
    await page.screenshot({ 
      path: path.join(__dirname, 'formulas-module.png'),
      fullPage: true 
    });
    
    // Salvar HTML
    const html = await page.content();
    fs.writeFileSync(path.join(__dirname, 'formulas-module.html'), html);
    
    console.log('🔍 Extraindo dados das fórmulas...');
    
    const formulasData = await page.evaluate(() => {
      const data = {
        title: document.title || '',
        url: window.location.href,
        tables: [],
        forms: [],
        inputs: [],
        fieldValues: {}
      };
      
      // Extrair tabelas
      const tables = document.querySelectorAll('table');
      console.log(`📊 Encontradas ${tables.length} tabelas`);
      
      tables.forEach((table, index) => {
        const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
        const rows = [];
        
        const tableRows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
        tableRows.forEach(row => {
          const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim());
          if (cells.length > 0) {
            rows.push(cells);
          }
        });
        
        if (headers.length > 0 || rows.length > 0) {
          data.tables.push({
            index,
            headers,
            rows,
            totalRows: rows.length
          });
        }
      });
      
      // Extrair formulários
      const forms = document.querySelectorAll('form');
      forms.forEach((form, index) => {
        const inputs = Array.from(form.querySelectorAll('input, select, textarea')).map(input => ({
          type: input.type || input.tagName.toLowerCase(),
          name: input.name || input.id || '',
          id: input.id || '',
          value: input.value || '',
          placeholder: input.placeholder || ''
        }));
        
        if (inputs.length > 0) {
          data.forms.push({
            index,
            inputs
          });
        }
      });
      
      // Procurar campos específicos relacionados às fórmulas
      const formulaKeywords = ['valmin', 'valmax', 'indice', 'fator', 'iss', 'aliquota', 'percentual'];
      
      formulaKeywords.forEach(keyword => {
        // Buscar inputs com nomes relacionados
        const inputs = document.querySelectorAll(`input[name*="${keyword}" i], input[id*="${keyword}" i]`);
        inputs.forEach(input => {
          const key = `${keyword}_${input.name || input.id}`;
          data.fieldValues[key] = {
            name: input.name,
            id: input.id,
            value: input.value,
            type: input.type
          };
        });
        
        // Buscar em células de tabelas
        const cells = document.querySelectorAll('td, th');
        cells.forEach(cell => {
          const text = cell.textContent.toLowerCase();
          if (text.includes(keyword)) {
            const key = `cell_${keyword}_${Math.random()}`;
            data.fieldValues[key] = {
              text: cell.textContent.trim(),
              tag: cell.tagName,
              context: keyword
            };
          }
        });
      });
      
      // Extrair todos os inputs da página
      const allInputs = document.querySelectorAll('input, select, textarea');
      allInputs.forEach((input, index) => {
        data.inputs.push({
          index,
          type: input.type || input.tagName.toLowerCase(),
          name: input.name || '',
          id: input.id || '',
          value: input.value || '',
          placeholder: input.placeholder || ''
        });
      });
      
      return data;
    });
    
    console.log(`📊 Dados extraídos:`);
    console.log(`   - ${formulasData.tables.length} tabelas`);
    console.log(`   - ${formulasData.forms.length} formulários`);
    console.log(`   - ${formulasData.inputs.length} campos de entrada`);
    console.log(`   - ${Object.keys(formulasData.fieldValues).length} campos relacionados a fórmulas`);
    
    // Salvar dados
    const jsonPath = path.join(__dirname, 'formulas-extracted-data.json');
    fs.writeFileSync(jsonPath, JSON.stringify(formulasData, null, 2));
    console.log(`💾 Dados salvos: ${jsonPath}`);
    
    // Mostrar preview dos dados importantes
    console.log('\n📋 DADOS ENCONTRADOS:');
    console.log('====================');
    
    if (formulasData.tables.length > 0) {
      console.log('\n📊 TABELAS:');
      formulasData.tables.forEach((table, index) => {
        console.log(`   Tabela ${index + 1}: ${table.headers.join(' | ')}`);
        if (table.rows.length > 0) {
          console.log(`   Exemplo: ${table.rows[0].join(' | ')}`);
        }
      });
    }
    
    if (Object.keys(formulasData.fieldValues).length > 0) {
      console.log('\n🧮 CAMPOS DE FÓRMULAS ENCONTRADOS:');
      Object.entries(formulasData.fieldValues).slice(0, 10).forEach(([key, value]) => {
        if (value.value) {
          console.log(`   ${key}: ${value.value}`);
        } else if (value.text) {
          console.log(`   ${key}: ${value.text}`);
        }
      });
    }
    
    return formulasData;
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    try {
      await page.screenshot({ 
        path: path.join(__dirname, 'formulas-error.png'),
        fullPage: true 
      });
    } catch (e) {
      // Ignorar
    }
    
    throw error;
  } finally {
    await browser.close();
  }
}

// Executar
if (import.meta.url === `file://${process.argv[1]}`) {
  extractFormulas()
    .then(data => {
      console.log('\n🎉 EXTRAÇÃO DE FÓRMULAS FINALIZADA!');
      
      const result = {
        success: true,
        formulasData: data,
        extractedAt: new Date().toISOString()
      };
      
      console.log(JSON.stringify(result));
    })
    .catch(error => {
      const result = {
        success: false,
        error: error.message,
        extractedAt: new Date().toISOString()
      };
      
      console.log(JSON.stringify(result));
      process.exit(1);
    });
}

export default extractFormulas;
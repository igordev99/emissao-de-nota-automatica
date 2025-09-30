#!/usr/bin/env node

/**
 * Script para explorar funcionalidades adicionais do sistema Uphold
 * - Tipos de Serviço
 * - Fórmulas de Cálculo
 * - Fechamento Mensal
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function exploreUpholdModules() {
  // Obter credenciais das variáveis de ambiente ou usar padrão
  const email = process.env.UPHOLD_EMAIL || 'teste.alfa@teste.com';
  const password = process.env.UPHOLD_PASSWORD || 'Teste@teste@teste123';
  
  console.log('🔍 Exploração de Módulos Avançados do Uphold');
  console.log('============================================');
  console.log(`👤 Login: ${email}`);
  
  const browser = await puppeteer.launch({
    headless: process.env.NODE_ENV === 'production', 
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const page = await browser.newPage();
  
  // Mapear todas as páginas que vamos explorar
  const modulesToExplore = [
    {
      name: 'Tipos de Serviço',
      url: '/config/tipos_servico',
      description: 'Configurações de tipos de serviços disponíveis'
    },
    {
      name: 'Fórmulas de Cálculo',
      url: '/admin/config/formulas',
      description: 'Configurações de fórmulas (valMin, valMax, índice, fatorRedutor, issRetidoDAS)'
    },
    {
      name: 'Fechamento Mensal',
      url: '/admin/fechamento',
      description: 'Funcionalidades de fechamento mensal'
    },
    {
      name: 'Faturamento Externo',
      url: '/admin/faturamento_externo',
      description: 'Relatórios de faturamento externo (12 meses)'
    },
    {
      name: 'Administradores',
      url: '/admin/admins',
      description: 'Gestão de administradores do sistema'
    }
  ];
  
  const results = {
    explorationDate: new Date().toISOString(),
    modules: [],
    summary: {
      totalModules: modulesToExplore.length,
      accessibleModules: 0,
      extractedData: {}
    }
  };
  
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
    
    // 2. Explorar cada módulo
    for (const module of modulesToExplore) {
      try {
        console.log(`\n📋 Explorando: ${module.name} (${module.url})`);
        
        const response = await page.goto(`http://www.upholdapp.com.br:3000${module.url}`, { 
          waitUntil: 'networkidle2',
          timeout: 15000 
        });
        
        if (response && response.status() === 200) {
          console.log(`✅ Módulo acessível: ${module.name}`);
          results.summary.accessibleModules++;
          
          // Aguardar página carregar
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Screenshot
          const screenshotPath = path.join(__dirname, `module_${module.url.replace(/[\/]/g, '_')}.png`);
          await page.screenshot({ 
            path: screenshotPath,
            fullPage: true 
          });
          
          // Salvar HTML
          const htmlPath = path.join(__dirname, `module_${module.url.replace(/[\/]/g, '_')}.html`);
          const html = await page.content();
          fs.writeFileSync(htmlPath, html);
          
          // Extrair dados específicos de cada módulo
          console.log('🔍 Extraindo dados...');
          
          const moduleData = await page.evaluate((moduleName) => {
            console.log(`🔍 Iniciando extração para ${moduleName}...`);
            
            const data = {
              title: document.title || '',
              url: window.location.href,
              tables: [],
              forms: [],
              lists: [],
              cards: [],
              rawData: []
            };
            
            // === TABELAS ===
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
                  rows: rows.slice(0, 20), // Limitar para não sobrecarregar
                  totalRows: rows.length
                });
                console.log(`  ✅ Tabela ${index + 1}: ${headers.length} colunas, ${rows.length} linhas`);
              }
            });
            
            // === FORMULÁRIOS ===
            const forms = document.querySelectorAll('form');
            console.log(`📝 Encontrados ${forms.length} formulários`);
            
            forms.forEach((form, index) => {
              const inputs = Array.from(form.querySelectorAll('input, select, textarea')).map(input => ({
                type: input.type || input.tagName.toLowerCase(),
                name: input.name || input.id || '',
                label: input.placeholder || input.getAttribute('aria-label') || '',
                value: input.value || ''
              }));
              
              if (inputs.length > 0) {
                data.forms.push({
                  index,
                  action: form.action || '',
                  method: form.method || 'get',
                  inputs
                });
                console.log(`  ✅ Formulário ${index + 1}: ${inputs.length} campos`);
              }
            });
            
            // === LISTAS ===
            const lists = document.querySelectorAll('ul, ol');
            console.log(`📝 Encontradas ${lists.length} listas`);
            
            lists.forEach((list, index) => {
              const items = Array.from(list.querySelectorAll('li')).map(li => li.textContent.trim());
              if (items.length > 0 && items.length < 50) { // Evitar listas muito grandes
                data.lists.push({
                  index,
                  type: list.tagName.toLowerCase(),
                  items
                });
                console.log(`  ✅ Lista ${index + 1}: ${items.length} itens`);
              }
            });
            
            // === DADOS ESTRUTURADOS ===
            // Procurar por dados específicos baseados no módulo
            if (moduleName.includes('Fórmulas') || window.location.href.includes('formulas')) {
              console.log('🔍 Procurando dados de fórmulas...');
              
              // Procurar por campos específicos: valMin, valMax, indice, fatorRedutor, issRetidoDAS
              const formulaFields = ['valmin', 'valmax', 'indice', 'fatorredutor', 'issretidodas'];
              const foundFields = {};
              
              formulaFields.forEach(fieldName => {
                const elements = document.querySelectorAll(`[name*="${fieldName}"], [id*="${fieldName}"], td:contains("${fieldName}"), th:contains("${fieldName}")`);
                if (elements.length > 0) {
                  foundFields[fieldName] = Array.from(elements).map(el => ({
                    tag: el.tagName,
                    text: el.textContent.trim(),
                    value: el.value || ''
                  }));
                }
              });
              
              if (Object.keys(foundFields).length > 0) {
                data.rawData.push({
                  type: 'formula_fields',
                  data: foundFields
                });
              }
            }
            
            if (moduleName.includes('Tipos de Serviço') || window.location.href.includes('tipos_servico')) {
              console.log('🔍 Procurando tipos de serviço...');
              
              // Procurar por dados de tipos de serviços
              const serviceElements = document.querySelectorAll('select option, .service-type, [data-service]');
              const services = Array.from(serviceElements).map(el => ({
                text: el.textContent.trim(),
                value: el.value || el.getAttribute('data-service') || ''
              })).filter(s => s.text && s.text.length > 1);
              
              if (services.length > 0) {
                data.rawData.push({
                  type: 'service_types',
                  data: services
                });
              }
            }
            
            console.log(`🎯 Extração completa para ${moduleName}`);
            return data;
          }, module.name);
          
          // Adicionar dados do módulo aos resultados
          const moduleResult = {
            name: module.name,
            url: module.url,
            description: module.description,
            accessible: true,
            status: response.status(),
            data: moduleData,
            files: {
              screenshot: screenshotPath,
              html: htmlPath
            }
          };
          
          results.modules.push(moduleResult);
          results.summary.extractedData[module.name] = {
            tables: moduleData.tables.length,
            forms: moduleData.forms.length,
            lists: moduleData.lists.length,
            hasRawData: moduleData.rawData.length > 0
          };
          
          console.log(`📊 Dados extraídos: ${moduleData.tables.length} tabelas, ${moduleData.forms.length} formulários, ${moduleData.lists.length} listas`);
          
        } else {
          console.log(`❌ Módulo não acessível: ${module.name} (status: ${response?.status()})`);
          results.modules.push({
            name: module.name,
            url: module.url,
            description: module.description,
            accessible: false,
            status: response?.status() || 0,
            error: 'Não acessível'
          });
        }
        
        // Pausa entre módulos
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`❌ Erro ao explorar ${module.name}: ${error.message}`);
        results.modules.push({
          name: module.name,
          url: module.url,
          description: module.description,
          accessible: false,
          error: error.message
        });
      }
    }
    
    // 3. Salvar resultados consolidados
    const resultsPath = path.join(__dirname, 'uphold-modules-exploration.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Resultados salvos: ${resultsPath}`);
    
    // 4. Gerar relatório resumido
    console.log('\n📋 RELATÓRIO DE EXPLORAÇÃO DOS MÓDULOS');
    console.log('=====================================');
    console.log(`📊 Total de módulos explorados: ${results.modules.length}`);
    console.log(`✅ Módulos acessíveis: ${results.summary.accessibleModules}`);
    console.log(`❌ Módulos inacessíveis: ${results.modules.length - results.summary.accessibleModules}`);
    
    console.log('\n🔍 RESUMO POR MÓDULO:');
    results.modules.forEach(module => {
      const status = module.accessible ? '✅' : '❌';
      console.log(`${status} ${module.name} (${module.url})`);
      if (module.accessible && module.data) {
        console.log(`   📊 ${module.data.tables.length} tabelas | 📝 ${module.data.forms.length} formulários | 📋 ${module.data.lists.length} listas`);
      }
      if (module.error) {
        console.log(`   ⚠️ Erro: ${module.error}`);
      }
    });
    
    // 5. Destacar dados importantes encontrados
    const importantFindings = [];
    
    results.modules.forEach(module => {
      if (module.accessible && module.data) {
        // Verificar se encontrou dados de fórmulas
        const formulaData = module.data.rawData.find(rd => rd.type === 'formula_fields');
        if (formulaData) {
          importantFindings.push(`🧮 Fórmulas encontradas em ${module.name}`);
        }
        
        // Verificar se encontrou tipos de serviço
        const serviceData = module.data.rawData.find(rd => rd.type === 'service_types');
        if (serviceData) {
          importantFindings.push(`🏷️ ${serviceData.data.length} tipos de serviço encontrados em ${module.name}`);
        }
        
        // Verificar tabelas com dados
        if (module.data.tables.length > 0) {
          module.data.tables.forEach(table => {
            if (table.totalRows > 0) {
              importantFindings.push(`📊 Tabela com ${table.totalRows} registros em ${module.name}`);
            }
          });
        }
      }
    });
    
    if (importantFindings.length > 0) {
      console.log('\n🎯 DESCOBERTAS IMPORTANTES:');
      importantFindings.forEach(finding => console.log(`   ${finding}`));
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    
    try {
      await page.screenshot({ 
        path: path.join(__dirname, 'modules-exploration-error.png'),
        fullPage: true 
      });
      console.log('📸 Screenshot do erro salvo');
    } catch (e) {
      // Ignorar erro de screenshot
    }
    
    throw error;
  } finally {
    await browser.close();
  }
}

// Executar
if (import.meta.url === `file://${process.argv[1]}`) {
  exploreUpholdModules()
    .then(results => {
      console.log('\n🎉 EXPLORAÇÃO DE MÓDULOS FINALIZADA!');
      console.log(`✅ ${results.summary.accessibleModules} módulos acessíveis de ${results.modules.length} total`);
      
      const result = {
        success: true,
        modules: results.modules,
        summary: results.summary,
        exploredAt: new Date().toISOString()
      };
      
      // Saída JSON estruturada
      console.log(JSON.stringify(result));
      
      console.error('\n💡 PRÓXIMOS PASSOS:');
      console.error('1. Analisar os arquivos HTML e PNG gerados');
      console.error('2. Verificar o arquivo uphold-modules-exploration.json');
      console.error('3. Implementar extração específica para módulos com dados');
    })
    .catch(error => {
      console.error(`❌ Erro na exploração: ${error.message}`);
      
      const result = {
        success: false,
        error: error.message,
        modules: [],
        exploredAt: new Date().toISOString()
      };
      
      console.log(JSON.stringify(result));
      process.exit(1);
    });
}

export default exploreUpholdModules;
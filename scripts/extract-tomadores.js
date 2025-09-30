#!/usr/bin/env node

/**
 * Script para extrair dados de tomadores do sistema Uphold
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function extractTomadores() {
  // Obter credenciais das variáveis de ambiente ou usar padrão
  const email = process.env.UPHOLD_EMAIL || 'teste.alfa@teste.com';
  const password = process.env.UPHOLD_PASSWORD || 'Teste@teste@teste123';
  
  console.log('🎯 Extração de tomadores/fornecedores do Uphold');
  console.log('===============================================');
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
    
    // 2. Tentar acessar páginas de tomadores/fornecedores
    const paginasParaExplorar = [
      '/admin/tomadores',
      '/admin/fornecedores',
      '/admin/empresas',
      '/admin/suppliers',
      '/tomadores',
      '/fornecedores'
    ];
    
    const resultados = [];
    
    for (const pagina of paginasParaExplorar) {
      try {
        console.log(`📋 Acessando: ${pagina}`);
        
        const response = await page.goto(`http://www.upholdapp.com.br:3000${pagina}`, { 
          waitUntil: 'networkidle2',
          timeout: 15000 
        });
        
        if (response && response.status() === 200) {
          console.log(`✅ Página acessível: ${pagina}`);
          
          // Aguardar página carregar completamente
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Screenshot da página
          await page.screenshot({ 
            path: path.join(__dirname, `${pagina.replace(/[\/]/g, '_')}-screenshot.png`),
            fullPage: true 
          });
          
          // Salvar HTML da página
          const html = await page.content();
          fs.writeFileSync(path.join(__dirname, `${pagina.replace(/[\/]/g, '_')}-page.html`), html);
          
          // Extrair dados da página
          console.log('🔍 Extraindo dados...');
          
          const dados = await page.evaluate(() => {
            console.log('🔍 Iniciando extração no browser...');
            
            const resultados = [];
            
            // === ESTRATÉGIA 1: Tabelas ===
            console.log('📊 Procurando tabelas...');
            const tabelas = document.querySelectorAll('table');
            console.log(`Encontradas ${tabelas.length} tabelas`);
            
            tabelas.forEach((tabela, index) => {
              console.log(`Analisando tabela ${index + 1}...`);
              const linhas = tabela.querySelectorAll('tr');
              console.log(`  ${linhas.length} linhas encontradas`);
              
              // Pular cabeçalho, começar da linha 1
              for (let i = 1; i < linhas.length; i++) {
                const linha = linhas[i];
                const celulas = linha.querySelectorAll('td, th');
                
                if (celulas.length >= 1) {
                  console.log(`  Linha ${i}: ${celulas.length} células`);
                  
                  const item = {
                    id: Date.now() + i,
                    nome: (celulas[0]?.textContent || '').trim(),
                    documento: (celulas[1]?.textContent || '').trim(),
                    email: (celulas[2]?.textContent || '').trim(),
                    telefone: (celulas[3]?.textContent || '').trim(),
                    endereco: (celulas[4]?.textContent || '').trim(),
                    inscricaoMunicipal: (celulas[5]?.textContent || '').trim(),
                    origem: `tabela-${index + 1}`,
                    linha: i
                  };
                  
                  // Só adicionar se tiver nome válido
                  if (item.nome && 
                      item.nome.length > 2 && 
                      !item.nome.toLowerCase().includes('nome') &&
                      !item.nome.toLowerCase().includes('empresa') &&
                      !item.nome.toLowerCase().includes('nenhum')) {
                    
                    console.log(`  ✅ Item encontrado: ${item.nome}`);
                    resultados.push(item);
                  }
                }
              }
            });
            
            // === ESTRATÉGIA 2: Cards e Divs ===
            console.log('🔲 Procurando cards/divs...');
            const possiveisCards = document.querySelectorAll(
              'div[class*="supplier"], div[class*="fornecedor"], div[class*="tomador"], ' +
              'div[class*="company"], div[class*="empresa"], .list-item, .item, .row'
            );
            console.log(`Encontrados ${possiveisCards.length} possíveis cards`);
            
            possiveisCards.forEach((card, index) => {
              const texto = card.textContent?.trim() || '';
              if (texto.length > 5 && texto.length < 300) {
                // Tentar extrair informações estruturadas
                const linhas = texto.split('\n').filter(l => l.trim());
                if (linhas.length > 0) {
                  const nome = linhas[0]?.trim();
                  if (nome && nome.length > 2) {
                    console.log(`  ✅ Possível item em card: ${nome}`);
                    resultados.push({
                      id: Date.now() + index + 10000,
                      nome,
                      documento: '',
                      email: '',
                      telefone: '',
                      endereco: '',
                      inscricaoMunicipal: '',
                      origem: 'card',
                      dadosCompletos: texto
                    });
                  }
                }
              }
            });
            
            // === ESTRATÉGIA 3: Formulários ===
            console.log('📝 Procurando formulários...');
            const formularios = document.querySelectorAll('form');
            formularios.forEach((form, index) => {
              const inputs = form.querySelectorAll('input[name], select[name], textarea[name]');
              console.log(`Form ${index + 1}: ${inputs.length} campos encontrados`);
              
              const campos = Array.from(inputs).map(input => ({
                name: input.getAttribute('name'),
                type: input.type || input.tagName.toLowerCase(),
                value: input.value || '',
                placeholder: input.placeholder || ''
              }));
              
              if (campos.length > 0) {
                console.log(`  ✅ Formulário com campos relevantes encontrado`);
                resultados.push({
                  id: Date.now() + index + 20000,
                  nome: 'FORMULÁRIO_DETECTADO',
                  documento: '',
                  email: '',
                  telefone: '',
                  endereco: '',
                  inscricaoMunicipal: '',
                  origem: 'formulario',
                  campos: campos
                });
              }
            });
            
            console.log(`🎯 Total de ${resultados.length} itens encontrados`);
            return resultados;
          });
          
          console.log(`📊 Dados extraídos da página ${pagina}: ${dados.length} itens`);
          
          // Adicionar dados ao resultado geral
          resultados.push({
            pagina,
            url: `http://www.upholdapp.com.br:3000${pagina}`,
            dados,
            timestamp: new Date().toISOString()
          });
          
        } else {
          console.log(`❌ Página não acessível: ${pagina} (status: ${response?.status()})`);
        }
      } catch (error) {
        console.log(`❌ Erro ao acessar ${pagina}: ${error.message}`);
      }
      
      // Pausa entre páginas
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // 3. Consolidar todos os dados extraídos
    const todosOsItens = [];
    resultados.forEach(resultado => {
      if (resultado.dados && resultado.dados.length > 0) {
        resultado.dados.forEach(item => {
          todosOsItens.push({
            ...item,
            paginaOrigem: resultado.pagina
          });
        });
      }
    });
    
    console.log(`📊 Total consolidado: ${todosOsItens.length} itens encontrados`);
    
    // 4. Transformar dados para o formato padrão da nossa API (Fornecedores)
    const fornecedoresPadronizados = todosOsItens
      .filter(item => item.nome && item.nome !== 'FORMULÁRIO_DETECTADO')
      .map(item => ({
        name: item.nome || '',
        document: item.documento || '', // CNPJ
        email: item.email || '',
        phone: item.telefone || '',
        address: item.endereco ? {
          street: item.endereco,
          number: '',
          neighborhood: '',
          city: '',
          state: '',
          zipCode: ''
        } : undefined
      }))
      .filter(fornecedor => fornecedor.name && fornecedor.name.length > 2);
    
    // 5. Salvar os dados extraídos
    if (todosOsItens.length > 0) {
      // JSON completo
      const jsonPath = path.join(__dirname, 'tomadores-uphold-extraidos.json');
      fs.writeFileSync(jsonPath, JSON.stringify(todosOsItens, null, 2));
      console.log(`💾 JSON completo salvo: ${jsonPath}`);
      
      // JSON padronizado para API
      const padronizadoPath = path.join(__dirname, 'fornecedores-padronizados.json');
      fs.writeFileSync(padronizadoPath, JSON.stringify(fornecedoresPadronizados, null, 2));
      console.log(`💾 Dados padronizados salvos: ${padronizadoPath}`);
      
      // CSV
      const csvPath = path.join(__dirname, 'fornecedores-extraidos.csv');
      const csvHeader = 'Nome,CNPJ,Email,Telefone,Endereco,Pagina\n';
      const csvRows = todosOsItens.map(item => 
        `"${item.nome}","${item.documento || ''}","${item.email || ''}","${item.telefone || ''}","${item.endereco || ''}","${item.paginaOrigem}"`
      ).join('\n');
      
      fs.writeFileSync(csvPath, csvHeader + csvRows);
      console.log(`📊 CSV salvo: ${csvPath}`);
      
      // Preview
      console.log('\n📋 PREVIEW DOS FORNECEDORES/TOMADORES EXTRAÍDOS:');
      console.log('=================================================');
      fornecedoresPadronizados.slice(0, 10).forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} ${item.email ? `(${item.email})` : ''} CNPJ: ${item.document || 'N/A'}`);
      });
      
      if (fornecedoresPadronizados.length > 10) {
        console.log(`... e mais ${fornecedoresPadronizados.length - 10} fornecedores`);
      }
    } else {
      console.log('⚠️ Nenhum dado foi encontrado');
    }
    
    return fornecedoresPadronizados;
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    try {
      await page.screenshot({ path: path.join(__dirname, 'tomadores-extraction-error.png') });
      console.log('📸 Screenshot do erro salvo');
    } catch (e) {
      // Ignorar erro de screenshot
    }
    
    throw error; // Re-throw para o endpoint capturar
  } finally {
    await browser.close();
  }
}

// Executar
if (import.meta.url === `file://${process.argv[1]}`) {
  extractTomadores()
    .then(fornecedores => {
      console.log('\n🎉 EXTRAÇÃO FINALIZADA!');
      console.log(`✅ ${fornecedores.length} fornecedores/tomadores extraídos`);
      
      // Retornar JSON estruturado para o endpoint capturar
      const result = {
        success: true,
        suppliers: fornecedores,
        extractedAt: new Date().toISOString(),
        count: fornecedores.length
      };
      
      // Imprimir JSON na última linha para o endpoint capturar
      console.log(JSON.stringify(result));
      
      if (fornecedores.length > 0) {
        console.error('\n💡 PRÓXIMOS PASSOS:');
        console.error('1. Copie o conteúdo do arquivo: fornecedores-padronizados.json');
        console.error('2. Use a interface de importação de fornecedores');
        console.error('3. Ou integre com o endpoint /api/suppliers');
      } else {
        console.error('\n💡 NENHUM FORNECEDOR ENCONTRADO:');
        console.error('- Verifique se você tem permissão para acessar essas páginas');
        console.error('- Confira os arquivos HTML e PNG salvos para debug');
      }
    })
    .catch(error => {
      // Retornar erro estruturado
      const result = {
        success: false,
        error: error.message,
        suppliers: [],
        extractedAt: new Date().toISOString()
      };
      console.log(JSON.stringify(result));
      process.exit(1);
    });
}

export default extractTomadores;
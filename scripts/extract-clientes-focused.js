#!/usr/bin/env node

/**
 * Script para extrair dados especificamente da página de clientes do Uphold
 * Roda o login e depois foca na extração de dados
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function extractClientes() {
  // Obter credenciais das variáveis de ambiente ou usar padrão
  const email = process.env.UPHOLD_EMAIL || 'teste.alfa@teste.com';
  const password = process.env.UPHOLD_PASSWORD || 'Teste@teste@teste123';
  
  console.log('🎯 Extração focada de clientes do Uphold');
  console.log('==========================================');
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
    
    // 2. Ir direto para clientes
    console.log('📋 Acessando página de clientes...');
    await page.goto('http://www.upholdapp.com.br:3000/admin/clientes', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // 3. Aguardar página carregar completamente
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 4. Screenshot da página para verificação
    await page.screenshot({ 
      path: path.join(__dirname, 'clientes-page-extraction.png'),
      fullPage: true 
    });
    console.log('📸 Screenshot da página salvo');
    
    // 5. Salvar HTML da página
    const html = await page.content();
    fs.writeFileSync(path.join(__dirname, 'clientes-page-full.html'), html);
    console.log('💾 HTML completo da página salvo');
    
    // 6. Múltiplas estratégias para extrair dados
    console.log('🔍 Extraindo dados dos clientes...');
    
    const clientes = await page.evaluate(() => {
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
            
            const cliente = {
              id: Date.now() + i,
              nome: (celulas[0]?.textContent || '').trim(),
              email: (celulas[1]?.textContent || '').trim(),
              telefone: (celulas[2]?.textContent || '').trim(),
              documento: (celulas[3]?.textContent || '').trim(),
              endereco: (celulas[4]?.textContent || '').trim(),
              origem: `tabela-${index + 1}`,
              linha: i
            };
            
            // Só adicionar se tiver nome válido
            if (cliente.nome && 
                cliente.nome.length > 2 && 
                !cliente.nome.toLowerCase().includes('nome') &&
                !cliente.nome.toLowerCase().includes('cliente') &&
                !cliente.nome.toLowerCase().includes('nenhum')) {
              
              console.log(`  ✅ Cliente encontrado: ${cliente.nome}`);
              resultados.push(cliente);
            }
          }
        }
      });
      
      // === ESTRATÉGIA 2: Divs e Cards ===
      console.log('🔲 Procurando cards/divs...');
      const possiveisCards = document.querySelectorAll('div[class*="client"], div[class*="cliente"], .list-item, .item');
      console.log(`Encontrados ${possiveisCards.length} possíveis cards`);
      
      possiveisCards.forEach((card, index) => {
        const texto = card.textContent?.trim() || '';
        if (texto.length > 5 && texto.length < 200) {
          // Tentar extrair nome, email, etc.
          const linhas = texto.split('\n').filter(l => l.trim());
          if (linhas.length > 0) {
            const nome = linhas[0]?.trim();
            if (nome && nome.length > 2) {
              console.log(`  ✅ Possível cliente em card: ${nome}`);
              resultados.push({
                id: Date.now() + index + 10000,
                nome,
                email: '',
                telefone: '',
                documento: '',
                endereco: '',
                origem: 'card',
                dadosCompletos: texto
              });
            }
          }
        }
      });
      
      // === ESTRATÉGIA 3: Listas UL/OL ===
      console.log('📝 Procurando listas...');
      const listas = document.querySelectorAll('ul li, ol li');
      console.log(`Encontrados ${listas.length} itens de lista`);
      
      listas.forEach((item, index) => {
        const texto = item.textContent?.trim() || '';
        if (texto.length > 5 && texto.length < 100 && 
            !texto.toLowerCase().includes('menu') &&
            !texto.toLowerCase().includes('nav')) {
          
          console.log(`  ✅ Possível cliente em lista: ${texto}`);
          resultados.push({
            id: Date.now() + index + 20000,
            nome: texto,
            email: '',
            telefone: '',
            documento: '',
            endereco: '',
            origem: 'lista'
          });
        }
      });
      
      // === ESTRATÉGIA 4: JavaScript Data ===
      console.log('📜 Procurando dados JavaScript...');
      const scripts = document.querySelectorAll('script');
      scripts.forEach(script => {
        const conteudo = script.textContent || '';
        
        // Padrões para encontrar dados de clientes
        const padroes = [
          /clientes\s*[:=]\s*(\[.*?\])/gis,
          /clients\s*[:=]\s*(\[.*?\])/gis,
          /data\s*[:=]\s*(\[.*?\])/gis,
          /"nome"\s*:\s*"([^"]+)"/g
        ];
        
        padroes.forEach(padrao => {
          let match;
          while ((match = padrao.exec(conteudo)) !== null) {
            try {
              console.log(`  📄 Possível JSON encontrado: ${match[1]?.substring(0, 100)}...`);
              
              if (match[1]?.startsWith('[')) {
                const dados = JSON.parse(match[1]);
                if (Array.isArray(dados)) {
                  dados.forEach((item, index) => {
                    if (item.nome || item.name) {
                      console.log(`  ✅ Cliente em JSON: ${item.nome || item.name}`);
                      resultados.push({
                        ...item,
                        id: item.id || Date.now() + index + 30000,
                        origem: 'javascript'
                      });
                    }
                  });
                }
              }
            } catch (e) {
              // Ignorar erros de parsing
            }
          }
        });
      });
      
      console.log(`🎯 Total de ${resultados.length} clientes encontrados`);
      return resultados;
    });
    
    console.log(`📊 Extração concluída: ${clientes.length} clientes encontrados`);
    
    // 7. Salvar os dados extraídos
    if (clientes.length > 0) {
      // JSON
      const jsonPath = path.join(__dirname, 'clientes-uphold-extraidos.json');
      fs.writeFileSync(jsonPath, JSON.stringify(clientes, null, 2));
      console.log(`💾 JSON salvo: ${jsonPath}`);
      
      // CSV
      const csvPath = path.join(__dirname, 'clientes-uphold-extraidos.csv');
      const csvHeader = 'ID,Nome,Email,Telefone,Documento,Endereco,Origem\n';
      const csvRows = clientes.map(cliente => 
        `"${cliente.id}","${cliente.nome}","${cliente.email || ''}","${cliente.telefone || ''}","${cliente.documento || ''}","${cliente.endereco || ''}","${cliente.origem}"`
      ).join('\n');
      
      fs.writeFileSync(csvPath, csvHeader + csvRows);
      console.log(`📊 CSV salvo: ${csvPath}`);
      
      // Preview
      console.log('\n📋 PREVIEW DOS CLIENTES EXTRAÍDOS:');
      console.log('==================================');
      clientes.slice(0, 10).forEach((cliente, index) => {
        console.log(`${index + 1}. ${cliente.nome} ${cliente.email ? `(${cliente.email})` : ''} [${cliente.origem}]`);
      });
      
      if (clientes.length > 10) {
        console.log(`... e mais ${clientes.length - 10} clientes`);
      }
    } else {
      console.log('⚠️ Nenhum cliente foi encontrado');
      console.log('💡 Verifique os arquivos HTML e PNG salvos para debug manual');
    }
    
    // 8. Aguardar para inspeção
    console.log('\n🔍 Mantendo browser aberto por 15 segundos para inspeção...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Transformar dados para o formato padrão da nossa API
    const clientesPadronizados = clientes.map(cliente => ({
      nome: cliente.nome || '',
      email: cliente.email || '',
      documento: cliente.documento || cliente.telefone || '', // Pode ser CPF/CNPJ
      inscricaoMunicipal: cliente.endereco || '' // Usar endereço como fallback
    })).filter(cliente => cliente.nome && cliente.nome.length > 2);
    
    return clientesPadronizados;
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    try {
      await page.screenshot({ path: path.join(__dirname, 'extraction-error.png') });
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
  extractClientes()
    .then(clientes => {
      console.log('\n🎉 EXTRAÇÃO FINALIZADA!');
      console.log(`✅ ${clientes.length} clientes extraídos`);
      
      // Retornar JSON estruturado para o endpoint capturar
      const result = {
        success: true,
        clients: clientes,
        extractedAt: new Date().toISOString(),
        count: clientes.length
      };
      
      // Imprimir JSON na última linha para o endpoint capturar
      console.log(JSON.stringify(result));
      
      if (clientes.length > 0) {
        console.error('\n💡 PRÓXIMOS PASSOS:');
        console.error('1. Copie o conteúdo do arquivo: clientes-uphold-extraidos.json');
        console.error('2. Acesse: https://ui-d22svifh3-gustavo-fernandes-projects-accf2b27.vercel.app/clients/import');
        console.error('3. Selecione "JSON" como tipo de importação');
        console.error('4. Cole os dados e clique em "Importar Clientes"');
      } else {
        console.error('\n💡 NENHUM CLIENTE ENCONTRADO:');
        console.error('- Verifique se você tem permissão para acessar a página de clientes');
        console.error('- Confira os arquivos HTML e PNG salvos para debug');
        console.error('- Tente extrair os dados manualmente da página');
      }
    })
    .catch(error => {
      // Retornar erro estruturado
      const result = {
        success: false,
        error: error.message,
        clients: [],
        extractedAt: new Date().toISOString()
      };
      console.log(JSON.stringify(result));
      process.exit(1);
    });
}

export default extractClientes;
#!/usr/bin/env node

/**
 * Script para explorar o sistema Uphold e identificar páginas de tomadores/fornecedores
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function explorarSistemaUphold() {
  console.log('🔍 Explorando sistema Uphold para identificar tomadores/fornecedores');
  console.log('================================================================');
  
  const browser = await puppeteer.launch({
    headless: false, // Manter visível para análise
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
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
    await page.type('input[name="username"]', 'teste.alfa@teste.com', { delay: 50 });
    await page.type('input[name="password"]', 'Teste@teste@teste123', { delay: 50 });
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('input[type="submit"]')
    ]);
    
    console.log('✅ Login realizado!');
    
    // 2. Capturar página inicial do painel
    console.log('\n📸 Capturando página inicial do painel...');
    await page.screenshot({ 
      path: path.join(__dirname, 'painel-inicial.png'),
      fullPage: true 
    });
    
    // 3. Explorar menu e links disponíveis
    console.log('\n🔍 Analisando menu e navegação...');
    
    const navegacao = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const menus = Array.from(document.querySelectorAll('nav, .menu, .sidebar, [class*="nav"], [class*="menu"]'));
      const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
      
      const resultado = {
        links: links.map(link => ({
          texto: link.textContent?.trim() || '',
          href: link.href || link.getAttribute('href') || '',
          classe: link.className || ''
        })).filter(item => item.texto && item.href),
        
        menus: menus.map(menu => ({
          texto: menu.textContent?.trim() || '',
          classe: menu.className || '',
          tag: menu.tagName.toLowerCase()
        })).filter(item => item.texto),
        
        buttons: buttons.map(btn => ({
          texto: btn.textContent?.trim() || '',
          classe: btn.className || '',
          onclick: btn.getAttribute('onclick') || ''
        })).filter(item => item.texto)
      };
      
      return resultado;
    });
    
    console.log('\n📋 Links encontrados:');
    navegacao.links.forEach((link, index) => {
      if (link.texto.length < 100) { // Filtrar textos muito longos
        console.log(`  ${index + 1}. ${link.texto} → ${link.href}`);
      }
    });
    
    // 4. Procurar especificamente por páginas relacionadas a fornecedores/tomadores
    const paginasRelevantes = navegacao.links.filter(link => {
      const texto = link.texto.toLowerCase();
      const href = link.href.toLowerCase();
      
      return texto.includes('fornecedor') || 
             texto.includes('tomador') || 
             texto.includes('empresa') ||
             texto.includes('supplier') ||
             texto.includes('prestador') ||
             texto.includes('serviço') ||
             href.includes('fornecedor') ||
             href.includes('tomador') ||
             href.includes('empresa') ||
             href.includes('supplier') ||
             href.includes('prestador');
    });
    
    console.log('\n🎯 Páginas potencialmente relevantes:');
    if (paginasRelevantes.length > 0) {
      paginasRelevantes.forEach((link, index) => {
        console.log(`  ${index + 1}. ${link.texto} → ${link.href}`);
      });
    } else {
      console.log('  Nenhuma página específica encontrada nos links diretos');
    }
    
    // 5. Tentar acessar URLs comuns de admin
    const urlsParaTestar = [
      '/admin/fornecedores',
      '/admin/tomadores', 
      '/admin/empresas',
      '/admin/suppliers',
      '/admin/prestadores',
      '/admin/servicos',
      '/fornecedores',
      '/tomadores',
      '/empresas',
      '/suppliers',
      '/prestadores'
    ];
    
    console.log('\n🔍 Testando URLs comuns...');
    
    const urlsValidas = [];
    
    for (const url of urlsParaTestar) {
      try {
        console.log(`  Testando: ${url}`);
        const response = await page.goto(`http://www.upholdapp.com.br:3000${url}`, { 
          waitUntil: 'networkidle2',
          timeout: 10000 
        });
        
        if (response && response.status() === 200) {
          const title = await page.title();
          console.log(`    ✅ URL válida: ${url} (${title})`);
          urlsValidas.push({ url, title });
          
          // Screenshot da página encontrada
          await page.screenshot({ 
            path: path.join(__dirname, `pagina-${url.replace(/[\/]/g, '_')}.png`),
            fullPage: true 
          });
        }
      } catch (error) {
        console.log(`    ❌ URL inválida: ${url}`);
      }
      
      // Pequena pausa entre requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 6. Explorar a estrutura da página atual em busca de dados
    console.log('\n📊 Analisando estrutura da página atual...');
    
    const estrutura = await page.evaluate(() => {
      const tabelas = document.querySelectorAll('table');
      const forms = document.querySelectorAll('form');
      const inputs = document.querySelectorAll('input[name]');
      
      return {
        tabelas: Array.from(tabelas).map(tabela => ({
          headers: Array.from(tabela.querySelectorAll('th')).map(th => th.textContent?.trim() || ''),
          linhas: tabela.querySelectorAll('tr').length,
          classe: tabela.className || ''
        })),
        
        formularios: Array.from(forms).map(form => ({
          action: form.action || '',
          method: form.method || '',
          classe: form.className || ''
        })),
        
        campos: Array.from(inputs).map(input => ({
          name: input.name,
          type: input.type,
          placeholder: input.placeholder || ''
        }))
      };
    });
    
    console.log('\n📋 Estrutura encontrada:');
    console.log(`  Tabelas: ${estrutura.tabelas.length}`);
    console.log(`  Formulários: ${estrutura.formularios.length}`);
    console.log(`  Campos: ${estrutura.campos.length}`);
    
    // 7. Salvar relatório completo
    const relatorio = {
      timestamp: new Date().toISOString(),
      navegacao,
      paginasRelevantes,
      urlsValidas,
      estrutura
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'relatorio-exploracao-uphold.json'), 
      JSON.stringify(relatorio, null, 2)
    );
    
    console.log('\n💾 Relatório completo salvo em: relatorio-exploracao-uphold.json');
    
    // 8. Conclusões
    console.log('\n📋 CONCLUSÕES:');
    if (urlsValidas.length > 0) {
      console.log('✅ URLs válidas encontradas:');
      urlsValidas.forEach(item => console.log(`  - ${item.url} (${item.title})`));
    } else {
      console.log('⚠️ Nenhuma URL específica de fornecedores/tomadores encontrada');
    }
    
    if (paginasRelevantes.length > 0) {
      console.log('✅ Links relevantes identificados nos menus');
    } else {
      console.log('⚠️ Nenhum link específico encontrado nos menus');
    }
    
    // 9. Aguardar para inspeção manual
    console.log('\n🔍 Mantendo browser aberto por 30 segundos para inspeção manual...');
    console.log('💡 Use este tempo para explorar manualmente o sistema!');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    return {
      navegacao,
      paginasRelevantes,
      urlsValidas,
      estrutura
    };
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    try {
      await page.screenshot({ path: path.join(__dirname, 'exploracao-erro.png') });
      console.log('📸 Screenshot do erro salvo');
    } catch (e) {
      // Ignorar erro de screenshot
    }
    
    return null;
  } finally {
    await browser.close();
  }
}

// Executar
if (import.meta.url === `file://${process.argv[1]}`) {
  explorarSistemaUphold()
    .then(resultado => {
      console.log('\n🎉 EXPLORAÇÃO FINALIZADA!');
      
      if (resultado) {
        console.log('\n💡 PRÓXIMOS PASSOS:');
        console.log('1. Analise o relatório salvo: relatorio-exploracao-uphold.json');
        console.log('2. Confira os screenshots das páginas encontradas');
        console.log('3. Identifique a melhor estratégia para extrair dados de fornecedores/tomadores');
        
        if (resultado.urlsValidas.length > 0) {
          console.log('\n🎯 URLs PARA EXPLORAR:');
          resultado.urlsValidas.forEach(item => {
            console.log(`  - http://www.upholdapp.com.br:3000${item.url}`);
          });
        }
      }
    })
    .catch(console.error);
}

export default explorarSistemaUphold;
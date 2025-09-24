#!/usr/bin/env node

/**
 * Script simples para análise manual do site Uphold
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzeSite() {
  console.log('🔍 Analisando site Uphold...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    slowMo: 100 // Adicionar delay para debug
  });
  
  const page = await browser.newPage();
  
  try {
    // 1. Ir para a página inicial
    console.log('📄 Carregando página inicial...');
    await page.goto('http://www.upholdapp.com.br:3000', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Salvar screenshot da página inicial
    await page.screenshot({ path: path.join(__dirname, 'uphold-home.png') });
    console.log('📸 Screenshot da página inicial salvo');
    
    // 2. Ir para login
    console.log('🔐 Navegando para login...');
    await page.goto('http://www.upholdapp.com.br:3000/login', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Salvar HTML da página de login
    const loginHTML = await page.content();
    fs.writeFileSync(path.join(__dirname, 'uphold-login.html'), loginHTML);
    console.log('💾 HTML do login salvo');
    
    // Salvar screenshot do login
    await page.screenshot({ path: path.join(__dirname, 'uphold-login.png') });
    console.log('📸 Screenshot do login salvo');
    
    // 3. Analisar elementos da página
    const formInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const inputs = Array.from(document.querySelectorAll('input'));
      const buttons = Array.from(document.querySelectorAll('button'));
      
      return {
        forms: forms.map(f => ({
          action: f.action,
          method: f.method,
          elements: f.elements.length
        })),
        inputs: inputs.map(i => ({
          type: i.type,
          name: i.name,
          id: i.id,
          placeholder: i.placeholder
        })),
        buttons: buttons.map(b => ({
          type: b.type,
          textContent: b.textContent?.trim(),
          id: b.id,
          className: b.className
        }))
      };
    });
    
    console.log('📋 Elementos encontrados:', JSON.stringify(formInfo, null, 2));
    
    // Pausar para inspeção manual
    console.log('⏸️ Pausando por 30 segundos para inspeção manual...');
    console.log('💡 Use este tempo para verificar se há CAPTCHA ou outros elementos especiais');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await browser.close();
  }
}

analyzeSite().catch(console.error);
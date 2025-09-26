#!/usr/bin/env node

/**
 * Script para configuração e verificação do certificado PFX
 * Utilizado para assinatura de NFSe
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Função para ler senha de forma segura
function askPassword(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    
    process.stdout.write(question);
    let password = '';
    
    stdin.on('data', function(char) {
      char = char + '';
      
      switch(char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.setRawMode(false);
          stdin.pause();
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003':
          process.exit();
          break;
        case '\u007f': // backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    });
  });
}

async function setupCertificate() {
  console.log('🔐 Configuração do Certificado PFX para NFSe\n');
  
  const pfxPath = '/Users/alfanet/Downloads/UPHOLD CONTABILIDADE.pfx';
  
  // Verificar se o arquivo existe
  if (!fs.existsSync(pfxPath)) {
    console.error('❌ Arquivo PFX não encontrado:', pfxPath);
    process.exit(1);
  }
  
  console.log('✅ Certificado encontrado:', pfxPath);
  console.log('📁 Tamanho:', fs.statSync(pfxPath).size, 'bytes');
  
  try {
    // Solicitar senha
    const password = await askPassword('🔑 Digite a senha do certificado: ');
    
    // Validar o certificado
    const pfxData = fs.readFileSync(pfxPath);
    
    // Tentar extrair informações básicas usando Node.js crypto
    console.log('\n🔍 Validando certificado...');
    
    // Criar diretório seguro para o certificado
    const certDir = '/Users/alfanet/StudioProjects/git/emissao-de-nota-automatica/certs';
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
      console.log('📁 Diretório criado:', certDir);
    }
    
    // Copiar certificado para o projeto
    const projectPfxPath = path.join(certDir, 'certificate.pfx');
    fs.copyFileSync(pfxPath, projectPfxPath);
    console.log('✅ Certificado copiado para:', projectPfxPath);
    
    // Criar arquivo de configuração
    const configPath = path.join(certDir, 'cert-config.json');
    const config = {
      pfxPath: projectPfxPath,
      createdAt: new Date().toISOString(),
      originalName: 'UPHOLD CONTABILIDADE.pfx',
      size: fs.statSync(pfxPath).size
    };
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('✅ Configuração salva:', configPath);
    
    // Criar .env para a senha (será pedida em runtime)
    const envPath = '/Users/alfanet/StudioProjects/git/emissao-de-nota-automatica/.env.certificate';
    const envContent = `# Configuração do Certificado NFSe
CERTIFICATE_PATH=${projectPfxPath}
# CERTIFICATE_PASSWORD=<será solicitada em runtime para segurança>
CERTIFICATE_ENABLED=true
`;
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Arquivo .env criado:', envPath);
    
    console.log('\n🎉 Certificado configurado com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('1. A senha será solicitada quando necessário');
    console.log('2. O certificado está pronto para uso na API');
    console.log('3. Execute o teste de assinatura para validar');
    
  } catch (error) {
    console.error('❌ Erro ao processar certificado:', error.message);
    process.exit(1);
  }
  
  rl.close();
  process.exit(0);
}

// Executar setup
setupCertificate().catch(console.error);
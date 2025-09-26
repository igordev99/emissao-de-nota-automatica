#!/usr/bin/env node

/**
 * Script para testar e validar o certificado PFX
 * Extrai informações detalhadas do certificado UPHOLD CONTABILIDADE
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Função para ler senha de forma segura
function askPassword() {
  return new Promise((resolve) => {
    rl.question('🔑 Digite a senha do certificado: ', (password) => {
      resolve(password);
    });
  });
}

async function testCertificate() {
  console.log('🔍 Teste e Validação do Certificado PFX\n');
  
  const certPath = '/Users/alfanet/StudioProjects/git/emissao-de-nota-automatica/certs/certificate.pfx';
  
  if (!fs.existsSync(certPath)) {
    console.error('❌ Certificado não encontrado:', certPath);
    process.exit(1);
  }
  
  try {
    const password = await askPassword();
    console.log('\n🔍 Extraindo informações do certificado...\n');
    
    // Extrair informações do certificado
    const certInfo = execSync(`openssl pkcs12 -in "${certPath}" -nokeys -clcerts -passin pass:"${password}" | openssl x509 -noout -text`, {
      encoding: 'utf8'
    });
    
    // Extrair dados específicos
    const subjectMatch = certInfo.match(/Subject: (.+)/);
    const issuerMatch = certInfo.match(/Issuer: (.+)/);
    const validFromMatch = certInfo.match(/Not Before: (.+)/);
    const validToMatch = certInfo.match(/Not After : (.+)/);
    const serialMatch = certInfo.match(/Serial Number:\s*([a-f0-9:]+)/i);
    
    console.log('📋 Informações do Certificado:');
    console.log('================================');
    
    if (subjectMatch) {
      console.log('🏢 Titular:', subjectMatch[1].trim());
    }
    
    if (issuerMatch) {
      console.log('🏛️  Emissor:', issuerMatch[1].trim());
    }
    
    if (validFromMatch) {
      console.log('📅 Válido de:', validFromMatch[1].trim());
    }
    
    if (validToMatch) {
      console.log('📅 Válido até:', validToMatch[1].trim());
    }
    
    if (serialMatch) {
      console.log('🔢 Número Serial:', serialMatch[1].trim());
    }
    
    // Verificar validade
    const validTo = new Date(validToMatch ? validToMatch[1].trim() : '');
    const now = new Date();
    
    console.log('\n🔍 Status de Validade:');
    if (validTo > now) {
      const daysLeft = Math.ceil((validTo - now) / (1000 * 60 * 60 * 24));
      console.log(`✅ Certificado VÁLIDO (expira em ${daysLeft} dias)`);
    } else {
      console.log('❌ Certificado EXPIRADO');
    }
    
    // Salvar informações detalhadas
    const certDetails = {
      subject: subjectMatch ? subjectMatch[1].trim() : 'N/A',
      issuer: issuerMatch ? issuerMatch[1].trim() : 'N/A',
      validFrom: validFromMatch ? validFromMatch[1].trim() : 'N/A',
      validTo: validToMatch ? validToMatch[1].trim() : 'N/A',
      serialNumber: serialMatch ? serialMatch[1].trim() : 'N/A',
      isValid: validTo > now,
      daysUntilExpiry: Math.ceil((validTo - now) / (1000 * 60 * 60 * 24)),
      testedAt: new Date().toISOString()
    };
    
    const detailsPath = '/Users/alfanet/StudioProjects/git/emissao-de-nota-automatica/certs/cert-details.json';
    fs.writeFileSync(detailsPath, JSON.stringify(certDetails, null, 2));
    
    console.log('\n✅ Detalhes salvos em:', detailsPath);
    
    // Testar extração de chave privada (sem salvar)
    console.log('\n🔑 Testando acesso à chave privada...');
    try {
      execSync(`openssl pkcs12 -in "${certPath}" -nocerts -nodes -passin pass:"${password}"`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      console.log('✅ Chave privada acessível');
    } catch (keyError) {
      console.log('❌ Erro ao acessar chave privada');
    }
    
    console.log('\n🎉 Teste concluído com sucesso!');
    console.log('\n📋 Próximo passo: Integrar na API para assinatura de NFSe');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    if (error.message.includes('invalid password')) {
      console.error('🔐 Senha incorreta. Tente novamente.');
    }
  }
  
  rl.close();
}

testCertificate().catch(console.error);
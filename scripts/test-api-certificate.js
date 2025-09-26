#!/usr/bin/env node

/**
 * Script para testar a integração do certificado com a API NFSe
 */

import { getCertificateInfo, setCertificatePassword } from './api/certificate-enhanced.mjs';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askPassword() {
  return new Promise((resolve) => {
    rl.question('🔑 Digite a senha do certificado UPHOLD CONTABILIDADE: ', (password) => {
      resolve(password);
    });
  });
}

async function testCertificateIntegration() {
  console.log('🧪 Teste de Integração do Certificado com API NFSe\n');
  
  try {
    // Configurar variáveis de ambiente para teste local
    process.env.CERTIFICATE_ENABLED = 'true';
    process.env.CERTIFICATE_PATH = '/Users/alfanet/StudioProjects/git/emissao-de-nota-automatica/certs/certificate.pfx';
    
    // Primeiro teste sem senha (deve retornar info básica)
    console.log('📋 Teste 1: Verificar certificado sem senha...');
    let certInfo = getCertificateInfo();
    
    if (certInfo && certInfo.requiresPassword) {
      console.log('✅ Certificado detectado, senha necessária');
      console.log('📂 Fonte:', certInfo.source);
      console.log('🏢 Identificação:', certInfo.thumbprint);
    } else if (certInfo) {
      console.log('✅ Certificado carregado:', certInfo.source);
    } else {
      console.log('❌ Certificado não encontrado');
      rl.close();
      return;
    }
    
    // Segundo teste com senha
    console.log('\n📋 Teste 2: Carregar certificado com senha...');
    const password = await askPassword();
    
    // Configurar senha
    setCertificatePassword(password);
    
    // Recarregar certificado
    certInfo = getCertificateInfo();
    
    if (certInfo && !certInfo.requiresPassword) {
      console.log('\n🎉 Certificado carregado com sucesso!');
      console.log('================================');
      console.log('🏢 Organização:', certInfo.subjectInfo?.organizationName || 'N/A');
      console.log('📝 Nome Comum:', certInfo.subjectInfo?.commonName || 'N/A');
      console.log('🔢 Thumbprint:', certInfo.thumbprint);
      console.log('📅 Válido de:', certInfo.notBefore.toLocaleDateString());
      console.log('📅 Válido até:', certInfo.notAfter.toLocaleDateString());
      console.log('⏰ Status:', certInfo.isValid ? '✅ VÁLIDO' : '❌ EXPIRADO');
      
      if (certInfo.isValid) {
        console.log('📊 Dias restantes:', certInfo.daysToExpire);
      }
      
      console.log('\n🔐 Componentes extraídos:');
      console.log('🗝️  Chave privada:', certInfo.privateKeyPem ? '✅ Disponível' : '❌ Indisponível');
      console.log('📜 Certificado:', certInfo.certPem ? '✅ Disponível' : '❌ Indisponível');
      
      // Teste básico de assinatura
      console.log('\n🧪 Teste 3: Verificar capacidade de assinatura...');
      
      if (certInfo.privateKeyPem && certInfo.certPem) {
        console.log('✅ Certificado pronto para assinatura de NFSe');
        console.log('🚀 Pode ser integrado na API para produção');
      } else {
        console.log('❌ Certificado não pode ser usado para assinatura');
      }
      
    } else {
      console.log('❌ Falha ao carregar certificado com senha');
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    if (error.message.includes('invalid password')) {
      console.error('🔐 Senha incorreta');
    }
  }
  
  console.log('\n📋 Teste concluído');
  rl.close();
}

testCertificateIntegration().catch(console.error);
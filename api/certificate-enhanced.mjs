// Módulo de certificado atualizado para suportar certificado local
import crypto from 'crypto';
import forge from 'node-forge';
import fs from 'fs';
import path from 'path';

// Cache global para evitar reprocessamento
let cachedMaterial = null;

// Função para carregar certificado do arquivo local
export function loadCertificateFromFile(pfxPath, password) {
  try {
    // Se já temos cache, retorna
    if (cachedMaterial && cachedMaterial.source === 'file') {
      return cachedMaterial;
    }

    console.log('Loading certificate from file:', pfxPath);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(pfxPath)) {
      throw new Error(`Certificate file not found: ${pfxPath}`);
    }
    
    // Ler arquivo PFX
    const pfxBuffer = fs.readFileSync(pfxPath);
    
    // Parse PKCS#12
    const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password || '');
    
    let privateKey = null;
    let certificate = null;
    
    // Extract private key and certificate
    for (const safeContent of p12.safeContents) {
      for (const safeBag of safeContent.safeBags) {
        if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag) {
          privateKey = safeBag.key;
        } else if (safeBag.type === forge.pki.oids.certBag) {
          certificate = safeBag.cert;
        }
      }
    }
    
    if (!privateKey || !certificate) {
      throw new Error('Invalid PFX: missing private key or certificate');
    }
    
    // Convert to PEM format
    const privateKeyPem = forge.pki.privateKeyToPem(privateKey);
    const certPem = forge.pki.certificateToPem(certificate);
    
    // Calculate thumbprint
    const der = forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes();
    const thumbprint = crypto
      .createHash('sha1')
      .update(Buffer.from(der, 'binary'))
      .digest('hex')
      .toUpperCase();
    
    // Check validity
    const now = new Date();
    const isValid = now >= certificate.validity.notBefore && now <= certificate.validity.notAfter;
    const daysToExpire = Math.round(
      (certificate.validity.notAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Extract certificate subject information
    const subjectInfo = {};
    certificate.subject.attributes.forEach(attr => {
      const name = forge.pki.oids[attr.type] || attr.type;
      subjectInfo[name] = attr.value;
    });
    
    cachedMaterial = {
      privateKeyPem,
      certPem,
      thumbprint,
      notBefore: certificate.validity.notBefore,
      notAfter: certificate.validity.notAfter,
      isValid,
      daysToExpire,
      subjectInfo,
      source: 'file',
      loadedAt: new Date().toISOString()
    };
    
    console.log(`Certificate loaded successfully. Subject: ${subjectInfo.commonName || subjectInfo.organizationName}, Thumbprint: ${thumbprint}, Days to expire: ${daysToExpire}`);
    
    return cachedMaterial;
    
  } catch (error) {
    console.error('Failed to load certificate from file:', error);
    throw new Error(`Certificate loading failed: ${error.message}`);
  }
}

export function loadCertificateFromBase64(pfxBase64, password) {
  try {
    // Se já temos cache, retorna
    if (cachedMaterial && cachedMaterial.source === 'base64') {
      return cachedMaterial;
    }

    console.log('Loading certificate from base64...');
    
    // Decode base64 to buffer
    const pfxBuffer = Buffer.from(pfxBase64, 'base64');
    
    // Parse PKCS#12
    const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password || '');
    
    let privateKey = null;
    let certificate = null;
    
    // Extract private key and certificate
    for (const safeContent of p12.safeContents) {
      for (const safeBag of safeContent.safeBags) {
        if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag) {
          privateKey = safeBag.key;
        } else if (safeBag.type === forge.pki.oids.certBag) {
          certificate = safeBag.cert;
        }
      }
    }
    
    if (!privateKey || !certificate) {
      throw new Error('Invalid PFX: missing private key or certificate');
    }
    
    // Convert to PEM format
    const privateKeyPem = forge.pki.privateKeyToPem(privateKey);
    const certPem = forge.pki.certificateToPem(certificate);
    
    // Calculate thumbprint
    const der = forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes();
    const thumbprint = crypto
      .createHash('sha1')
      .update(Buffer.from(der, 'binary'))
      .digest('hex')
      .toUpperCase();
    
    // Check validity
    const now = new Date();
    const isValid = now >= certificate.validity.notBefore && now <= certificate.validity.notAfter;
    const daysToExpire = Math.round(
      (certificate.validity.notAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    cachedMaterial = {
      privateKeyPem,
      certPem,
      thumbprint,
      notBefore: certificate.validity.notBefore,
      notAfter: certificate.validity.notAfter,
      isValid,
      daysToExpire,
      source: 'base64',
      loadedAt: new Date().toISOString()
    };
    
    console.log(`Certificate loaded successfully. Thumbprint: ${thumbprint}, Days to expire: ${daysToExpire}`);
    
    return cachedMaterial;
    
  } catch (error) {
    console.error('Failed to load certificate:', error);
    throw new Error(`Certificate loading failed: ${error.message}`);
  }
}

export function getCertificateInfo() {
  // Verificar configuração local primeiro
  const localCertPath = process.env.CERTIFICATE_PATH || '/Users/alfanet/StudioProjects/git/emissao-de-nota-automatica/certs/certificate.pfx';
  const localCertEnabled = process.env.CERTIFICATE_ENABLED === 'true';
  const certPassword = process.env.CERTIFICATE_PASSWORD;
  
  // Tentar carregar certificado local primeiro
  if (localCertEnabled && fs.existsSync(localCertPath)) {
    console.log('Using local certificate:', localCertPath);
    
    try {
      // Para desenvolvimento local, usar senha interativa ou variável de ambiente
      const password = certPassword || process.env.CERT_PFX_PASSWORD;
      
      if (!password) {
        console.log('Certificate password not provided - returning basic info');
        return {
          privateKeyPem: '[Password Required]',
          certPem: '[Password Required]',
          thumbprint: 'UPHOLD_CONTABILIDADE',
          notBefore: new Date(),
          notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          isValid: true,
          daysToExpire: 365,
          requiresPassword: true,
          source: 'file'
        };
      }
      
      return loadCertificateFromFile(localCertPath, password);
      
    } catch (error) {
      console.error('Failed to load local certificate:', error);
      // Fallback para base64 se disponível
    }
  }
  
  // Fallback para certificado base64 (produção)
  const pfxBase64 = process.env.CERT_PFX_BASE64;
  const pfxPassword = process.env.CERT_PFX_PASSWORD;
  
  console.log('Environment check:', {
    hasLocalCert: fs.existsSync(localCertPath),
    localCertEnabled,
    hasPfxBase64: !!pfxBase64,
    pfxBase64Length: pfxBase64 ? pfxBase64.length : 0,
    hasPassword: !!pfxPassword,
    envKeys: Object.keys(process.env).filter(k => k.includes('CERT'))
  });
  
  if (!pfxBase64) {
    console.log('CERT_PFX_BASE64 not found in environment variables');
    return null;
  }

  // Check if base64 is too short (likely misconfigured)
  if (pfxBase64.length < 100) {
    console.log('CERT_PFX_BASE64 appears to be misconfigured (too short)');
    
    // Return mock certificate info for demonstration
    const mockExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    return {
      privateKeyPem: '[Mock Private Key - Not Loaded]',
      certPem: '[Mock Certificate - Not Loaded]', 
      thumbprint: 'MOCK123456789ABCDEF',
      notBefore: new Date(),
      notAfter: mockExpiry,
      isValid: true,
      daysToExpire: 365,
      source: 'mock'
    };
  }
  
  try {
    return loadCertificateFromBase64(pfxBase64, pfxPassword);
  } catch (error) {
    console.error('Error getting certificate info:', error);
    return null;
  }
}

// Clear cache function (useful for testing)
export function clearCertificateCache() {
  cachedMaterial = null;
}

// Função para configurar certificado com senha interativa
export function setCertificatePassword(password) {
  process.env.CERTIFICATE_PASSWORD = password;
  clearCertificateCache(); // Limpar cache para recarregar com nova senha
}
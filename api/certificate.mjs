// Módulo de certificado simplificado para ambiente serverless
import crypto from 'crypto';
import forge from 'node-forge';

// Cache global para evitar reprocessamento
let cachedMaterial = null;

export function loadCertificateFromBase64(pfxBase64, password) {
  try {
    // Se já temos cache, retorna
    if (cachedMaterial) {
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
      daysToExpire
    };
    
    console.log(`Certificate loaded successfully. Thumbprint: ${thumbprint}, Days to expire: ${daysToExpire}`);
    
    return cachedMaterial;
    
  } catch (error) {
    console.error('Failed to load certificate:', error);
    throw new Error(`Certificate loading failed: ${error.message}`);
  }
}

export function getCertificateInfo() {
  const pfxBase64 = process.env.CERT_PFX_BASE64;
  const pfxPassword = process.env.CERT_PFX_PASSWORD;
  
  // Debug logging (can be removed in production)
  console.log('Environment check:', {
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
    const mockExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
    return {
      privateKeyPem: '[Mock Private Key - Not Loaded]',
      certPem: '[Mock Certificate - Not Loaded]', 
      thumbprint: 'MOCK123456789ABCDEF',
      notBefore: new Date(),
      notAfter: mockExpiry,
      isValid: true,
      daysToExpire: 365
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
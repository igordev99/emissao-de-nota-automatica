import crypto from 'crypto';
import fs from 'fs';

import { DOMParser } from '@xmldom/xmldom';
import forge from 'node-forge';
import { SignedXml } from 'xml-crypto';

interface CertMaterial {
  privateKeyPem: string;
  certPem: string;
  thumbprint: string;
  notBefore: Date;
  notAfter: Date;
}

let cached: CertMaterial | null = null;

export function loadPfxMaterial(pfxPath?: string, passphrase?: string, pfxBase64?: string): CertMaterial {
  if (cached) return cached;
  
  let pfxBuffer: Buffer;
  if (pfxBase64) {
    // Load from base64 string (for serverless environments)
    pfxBuffer = Buffer.from(pfxBase64, 'base64');
  } else if (pfxPath) {
    // Load from file path (for local development)
    pfxBuffer = fs.readFileSync(pfxPath);
  } else {
    throw new Error('Either pfxPath or pfxBase64 must be provided');
  }
  
  const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, passphrase || '');
  let keyObj: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  let certObj: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  for (const safeContent of p12.safeContents) {
    for (const safeBag of safeContent.safeBags) {
      if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag) {
        keyObj = safeBag.key;
      } else if (safeBag.type === forge.pki.oids.certBag) {
        certObj = safeBag.cert;
      }
    }
  }
  if (!keyObj || !certObj) throw new Error('Invalid PFX content');
  const privateKeyPem = forge.pki.privateKeyToPem(keyObj);
  const certPem = forge.pki.certificateToPem(certObj);
  const der = forge.asn1.toDer(forge.pki.certificateToAsn1(certObj)).getBytes();
  const thumbprint = crypto.createHash('sha1').update(Buffer.from(der, 'binary')).digest('hex').toUpperCase();
  cached = { privateKeyPem, certPem, thumbprint, notBefore: certObj.validity.notBefore, notAfter: certObj.validity.notAfter };
  return cached;
}

export function signXmlEnveloped(xml: string, referenceXPath = "/*[local-name()='Rps']") {
  // Permitir modo de teste sem certificado real: se não houver CERT_PFX_PATH mas estivermos em NODE_ENV=test
  let material: CertMaterial;
  if (!process.env.CERT_PFX_PATH) {
    if (process.env.NODE_ENV === 'test') {
      // Gera um par de chaves efêmero apenas para teste (não persistido)
      const keypair = forge.pki.rsa.generateKeyPair(2048); // aumentar força em testes
      const cert = forge.pki.createCertificate();
      cert.publicKey = keypair.publicKey;
      cert.serialNumber = '01';
      cert.validity.notBefore = new Date();
      cert.validity.notAfter = new Date(Date.now() + 3600_000);
      cert.setSubject([{ name: 'commonName', value: 'Test Cert' }]);
      cert.setIssuer([{ name: 'commonName', value: 'Test Cert' }]);
      cert.sign(keypair.privateKey);
      material = {
        privateKeyPem: forge.pki.privateKeyToPem(keypair.privateKey),
        certPem: forge.pki.certificateToPem(cert),
        thumbprint: 'TEST',
        notBefore: cert.validity.notBefore,
        notAfter: cert.validity.notAfter
      };
    } else {
      throw new Error('CERT_PFX_PATH not configured');
    }
  } else {
    material = loadPfxMaterial(process.env.CERT_PFX_PATH, process.env.CERT_PFX_PASSWORD, process.env.CERT_PFX_BASE64);
  }
  // Definição de algoritmos: padrão SHA-256, fallback SHA-1 se SIGN_LEGACY_SHA1=1
  const legacy = process.env.SIGN_LEGACY_SHA1 === '1';
  const signatureAlgorithm = legacy
    ? 'http://www.w3.org/2000/09/xmldsig#rsa-sha1'
    : 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
  const digestAlgorithm = legacy
    ? 'http://www.w3.org/2000/09/xmldsig#sha1'
    : 'http://www.w3.org/2001/04/xmlenc#sha256';

  const sig: any = new SignedXml({ // eslint-disable-line @typescript-eslint/no-explicit-any
    privateKey: material.privateKeyPem,
    publicCert: material.certPem,
    canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    signatureAlgorithm
  });
  try {
    sig.addReference({ xpath: referenceXPath, transforms: [ 'http://www.w3.org/2000/09/xmldsig#enveloped-signature', 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315' ], digestAlgorithm });
  } catch {
    // Fallback: assina documento inteiro
    sig.addReference({ xpath: '', transforms: [ 'http://www.w3.org/2000/09/xmldsig#enveloped-signature', 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315' ], digestAlgorithm });
  }
  sig.computeSignature(xml);
  let signed = sig.getSignedXml();
  if (!/<KeyInfo\b/.test(signed)) {
    const certBody = extractCertBody(material.certPem).replace(/\s+/g, '');
    // Inject KeyInfo before closing Signature element
    signed = signed.replace(/<\/Signature>\s*<\/Rps>/, `<KeyInfo><X509Data><X509Certificate>${certBody}</X509Certificate></X509Data></KeyInfo></Signature></Rps>`);
  }
  return signed;
}

function extractCertBody(pem: string) {
  return pem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/\r?\n/g, '');
}

export function verifyXmlSignature(xml: string): boolean {
  try {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const signatures = doc.getElementsByTagName('Signature');
    if (!signatures || !signatures.length) return false;
    const sigNode = signatures[0];
    // Extrair certificado embutido (primeiro X509Certificate)
    let publicCertPem: string | undefined;
    const certElems = sigNode.getElementsByTagName('X509Certificate');
    if (certElems && certElems.length) {
      const b64 = certElems[0].textContent?.replace(/\s+/g, '') || '';
      if (b64) {
        // Reconstrói PEM
        const body = b64.match(/.{1,64}/g)?.join('\n') || b64;
        publicCertPem = `-----BEGIN CERTIFICATE-----\n${body}\n-----END CERTIFICATE-----`;
      }
    }
    const sig: any = new SignedXml({ publicCert: publicCertPem }); // eslint-disable-line @typescript-eslint/no-explicit-any
    sig.loadSignature(sigNode);
    const ok = sig.checkSignature(xml);
    return ok;
  } catch {
    return false;
  }
}

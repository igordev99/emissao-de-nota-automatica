import { signXmlEnveloped, verifyXmlSignature } from '../src/core/xml/signer';
delete process.env.CERT_PFX_PATH; process.env.NODE_ENV = 'test';

describe('verifyXmlSignature', () => {
  it('validates a signed XML (ephemeral cert)', () => {
    delete process.env.CERT_PFX_PATH;
    const xml = '<Rps><Teste>Ok</Teste></Rps>';
    const signed = signXmlEnveloped(xml);
    expect(verifyXmlSignature(signed)).toBe(true);
  });
  it('fails on tampered XML', () => {
    const xml = '<Rps><Teste>Ok</Teste></Rps>';
    const signed = signXmlEnveloped(xml);
    const tampered = signed.replace('Ok', 'Tamper');
    expect(verifyXmlSignature(tampered)).toBe(false);
  });
  it('fails when no signature present', () => {
    const raw = '<Rps><X>1</X></Rps>';
    expect(verifyXmlSignature(raw)).toBe(false);
  });
});
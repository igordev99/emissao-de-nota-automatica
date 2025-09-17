// @jest-environment node
/// <reference types="jest" />
import { signXmlEnveloped } from '../src/core/xml/signer';
delete process.env.CERT_PFX_PATH; process.env.NODE_ENV = 'test';

describe('XML Signature', () => {
  it('signs a minimal RPS XML', () => {
    const xml = '<Rps><Teste>Ok</Teste></Rps>';
    const signed = signXmlEnveloped(xml);
  expect(signed).toMatch(/<Signature\b/);
    expect(signed).toMatch(/X509Certificate/);
  });
});

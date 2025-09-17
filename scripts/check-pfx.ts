import { loadPfxMaterial } from '../src/core/xml/signer';

function fail(msg: string) {
  console.error(JSON.stringify({ ok: false, error: msg }));
  process.exit(1);
}

(async () => {
  const pfx = process.env.CERT_PFX_PATH;
  const pass = process.env.CERT_PFX_PASSWORD;
  if (!pfx) fail('CERT_PFX_PATH not set');
  try {
    const m = loadPfxMaterial(pfx as string, pass);
    const now = Date.now();
    const daysToExpire = Math.round((m.notAfter.getTime() - now) / (1000 * 60 * 60 * 24));
    console.log(JSON.stringify({ ok: true, thumbprint: m.thumbprint, notBefore: m.notBefore.toISOString(), notAfter: m.notAfter.toISOString(), daysToExpire }));
  } catch (e: any) {
    fail(e?.message || 'Failed to load PFX');
  }
})();

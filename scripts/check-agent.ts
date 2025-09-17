import https from 'https';

function fail(msg: string) {
  console.error(JSON.stringify({ ok: false, error: msg }));
  process.exit(1);
}

(async () => {
  const url = process.env.AGENT_BASE_URL;
  const pfxPath = process.env.CERT_PFX_PATH;
  const pass = process.env.CERT_PFX_PASSWORD;
  if (!url) fail('AGENT_BASE_URL not set');
  let agent: https.Agent | undefined;
  try {
    if (pfxPath && pass) {
      const fs = await import('fs');
      const pfx = fs.readFileSync(pfxPath);
      agent = new https.Agent({ pfx, passphrase: pass, rejectUnauthorized: true, minVersion: 'TLSv1.2' });
    } else {
      agent = new https.Agent({ rejectUnauthorized: true, minVersion: 'TLSv1.2' });
    }
    await new Promise<void>((resolve, reject) => {
      const req = https.request(url as string, { method: 'GET', agent }, (res) => {
        const status = res.statusCode || 0;
        res.resume(); // drain
        if (status >= 200 && status < 500) {
          console.log(JSON.stringify({ ok: true, status }));
          resolve();
        } else {
          reject(new Error(`Unexpected status: ${status}`));
        }
      });
      req.on('error', reject);
      req.end();
    });
  } catch (e: any) {
    fail(e?.message || 'Failed to reach agent');
  }
})();

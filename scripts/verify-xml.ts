#!/usr/bin/env tsx
/* Verify XML signature from file or base64 input.
   Usage (PowerShell):
     # From file
     npm run -s verify:xml -- --file path\to\signed.xml
     # From base64 (writes result only)
     npm run -s verify:xml -- --b64 (Get-Content xml.b64 -Raw)
*/
import fs from 'fs';

import { verifyXmlSignature } from '../src/core/xml/signer';

function parseArgs(argv: string[]) {
  const a: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) {
      const k = t.slice(2);
      const n = argv[i + 1];
      if (!n || n.startsWith('--')) { a[k] = true; } else { a[k] = n; i++; }
    }
  }
  return a;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let xml = '';
  if (args.file && typeof args.file === 'string') {
    xml = fs.readFileSync(args.file, 'utf8');
  } else if (args.b64 && typeof args.b64 === 'string') {
    const buf = Buffer.from(args.b64, 'base64');
    xml = buf.toString('utf8');
  } else {
    console.error('Usage: --file <xml> OR --b64 <base64>');
    process.exit(2);
  }
  const ok = verifyXmlSignature(xml);
  process.stdout.write(JSON.stringify({ ok }) + '\n');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(String(e)); process.exit(1); });

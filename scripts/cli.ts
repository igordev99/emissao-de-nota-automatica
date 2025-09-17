#!/usr/bin/env tsx
/*
 Simple DX CLI for the NFSe API
 Usage (PowerShell examples):
   # Emit from JSON file and print response
   npm run -s cli -- emit --body emit.json --idem my-key --token $env:JWT

   # Get by id
   npm run -s cli -- get --id inv_1 --token $env:JWT

   # List with filters
   npm run -s cli -- list --status SUCCESS --page 1 --pageSize 5 --token $env:JWT

   # Fetch XML/PDF and save to files
   npm run -s cli -- xml --id inv_1 --out xml.b64 --token $env:JWT
   npm run -s cli -- pdf --id inv_1 --out nfse.pdf --decode --token $env:JWT

   # Cancel with reason
   npm run -s cli -- cancel --id inv_1 --reason "Erro de digitação" --token $env:JWT

 Token options:
   --token <JWT>        Use an explicit JWT
   --dev-token          Request a dev token from /auth/token (only in dev)
   --gen-token          Generate a local dev token using JWT_SECRET (sub=dev)
*/

import jwt from 'jsonwebtoken';
import { readFileSync, writeFileSync } from 'fs';

type Dict = Record<string, string | number | boolean | null | undefined>;

function parseArgs(argv: string[]) {
  const out: Record<string, any> = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) { out[key] = true; } else { out[key] = next; i++; }
    } else {
      out._.push(a);
    }
  }
  return out;
}

function printHelp() {
  const help = `NFSe CLI
Commands:
  emit   --body <file.json> [--idem <key>] [--base <url>] [--token|--dev-token|--gen-token]
  get    --id <invoiceId> [--base <url>] [--token|--dev-token|--gen-token]
  list   [--status <S>] [--page N] [--pageSize N] [--base <url>] [--token|--dev-token|--gen-token]
  xml    --id <invoiceId> [--out file] [--base <url>] [--token|--dev-token|--gen-token]
  pdf    --id <invoiceId> [--out file] [--decode] [--base <url>] [--token|--dev-token|--gen-token]
  cancel --id <invoiceId> [--reason text] [--base <url>] [--token|--dev-token|--gen-token]

Options:
  --base        Base URL (default http://127.0.0.1:3000)
  --token       Explicit JWT token
  --dev-token   Request token from /auth/token (dev only)
  --gen-token   Generate token using JWT_SECRET (sub=dev)
  --pretty      Pretty-print JSON outputs
  --out         Output file path (xml/pdf)
  --decode      If set with pdf, decodes base64 and writes binary
`;
  process.stdout.write(help);
}

async function getToken(opts: any, baseUrl: string): Promise<string> {
  if (opts.token) return String(opts.token);
  if (opts['dev-token']) {
    const r = await fetch(`${baseUrl}/auth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sub: 'dev' }),
    });
    if (!r.ok) throw new Error(`Auth token failed: ${r.status} ${r.statusText}`);
    const j = await r.json();
    if (!j.token) throw new Error('Token missing in response');
    return j.token;
  }
  // Generate a local dev token when explicitly requested OR when none provided (DX fallback)
  if (opts['gen-token'] || (!opts.token && !opts['dev-token'])) {
    const secret = process.env.JWT_SECRET || 'change_this_development_secret_please';
    return jwt.sign({ sub: 'dev', roles: ['tester'] }, secret, { expiresIn: '1h' });
  }
  const envToken = process.env.JWT_TOKEN || process.env.TOKEN || process.env.JWT;
  if (envToken) return envToken;
  throw new Error('Missing token. Provide --token, --dev-token, --gen-token, or set JWT_TOKEN.');
}

async function jsonGet(url: string, token: string) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`);
  return r.json();
}

async function jsonPostWithHeaders(url: string, token: string, body: any, headers: Dict = {}) {
  const h: Record<string, string> = { Authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  for (const [k, v] of Object.entries(headers)) if (v != null) h[k] = String(v);
  const r = await fetch(url, { method: 'POST', headers: h, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`POST ${url} -> ${r.status}`);
  const j = await r.json();
  const hdrs: Record<string, string> = {};
  r.headers.forEach((v, k) => { hdrs[k.toLowerCase()] = v; });
  return { body: j, headers: hdrs };
}

function readJsonFile(path: string): any {
  const txt = readFileSync(path, 'utf8');
  return JSON.parse(txt);
}

function writeFile(path: string, data: Buffer) {
  writeFileSync(path, data);
}

async function main() {
  const argv = parseArgs(process.argv.slice(2));
  const cmd = argv._[0];
  if (!cmd || argv.help || argv.h) return printHelp();

  const base = String(argv.base || 'http://127.0.0.1:3000');
  const pretty = !!argv.pretty;
  const token = await getToken(argv, base);

  switch (cmd) {
    case 'emit': {
      const bodyPath = String(argv.body || '');
      if (!bodyPath) throw new Error('emit: --body <file.json> is required');
      const idem = argv.idem ? String(argv.idem) : undefined;
      const headers: Dict = {};
      if (idem) headers['Idempotency-Key'] = idem;
      const payload = readJsonFile(bodyPath);
  const res = await jsonPostWithHeaders(`${base}/nfse/emitir`, token, payload, headers);
  const corr = res.headers['x-correlation-id'] || res.headers['x-request-id'];
  if (corr) process.stderr.write(`correlation-id: ${corr}\n`);
  process.stdout.write(JSON.stringify(res.body, null, pretty ? 2 : 0) + '\n');
      break;
    }
    case 'get': {
      const id = String(argv.id || '');
      if (!id) throw new Error('get: --id is required');
      const res = await jsonGet(`${base}/nfse/${encodeURIComponent(id)}`, token);
      process.stdout.write(JSON.stringify(res, null, pretty ? 2 : 0) + '\n');
      break;
    }
    case 'list': {
      const params: Dict = {};
      const keys = ['status', 'providerCnpj', 'nfseNumber', 'verificationCode', 'customerDoc', 'from', 'to', 'minAmount', 'maxAmount', 'page', 'pageSize', 'sortBy', 'sortDir'];
      for (const k of keys) if (argv[k] != null) params[k] = argv[k];
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v != null) q.set(k, String(v)); });
      const url = `${base}/nfse${q.size ? '?' + q.toString() : ''}`;
      const res = await jsonGet(url, token);
      process.stdout.write(JSON.stringify(res, null, pretty ? 2 : 0) + '\n');
      break;
    }
    case 'xml': {
      const id = String(argv.id || '');
      if (!id) throw new Error('xml: --id is required');
      const r = await fetch(`${base}/nfse/${encodeURIComponent(id)}/xml`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`GET xml -> ${r.status}`);
      const j = await r.json();
      const b64 = j.xmlBase64 || j.xml || '';
      if (argv.out) {
        writeFile(String(argv.out), Buffer.from(String(b64)));
        process.stdout.write(`written base64 to ${argv.out}\n`);
      } else {
        process.stdout.write(JSON.stringify(j, null, pretty ? 2 : 0) + '\n');
      }
      break;
    }
    case 'pdf': {
      const id = String(argv.id || '');
      if (!id) throw new Error('pdf: --id is required');
      const r = await fetch(`${base}/nfse/${encodeURIComponent(id)}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`GET pdf -> ${r.status}`);
      const j = await r.json();
      const b64 = j.pdfBase64 || j.pdf || '';
      if (argv.out) {
        if (argv.decode) {
          writeFile(String(argv.out), Buffer.from(String(b64), 'base64'));
          process.stdout.write(`written binary to ${argv.out}\n`);
        } else {
          writeFile(String(argv.out), Buffer.from(String(b64)));
          process.stdout.write(`written base64 to ${argv.out}\n`);
        }
      } else {
        process.stdout.write(JSON.stringify(j, null, pretty ? 2 : 0) + '\n');
      }
      break;
    }
    case 'cancel': {
      const id = String(argv.id || '');
      if (!id) throw new Error('cancel: --id is required');
      const reason = argv.reason ? String(argv.reason) : undefined;
  const res = await jsonPostWithHeaders(`${base}/nfse/${encodeURIComponent(id)}/cancel`, token, { reason });
  const corr = res.headers['x-correlation-id'] || res.headers['x-request-id'];
  if (corr) process.stderr.write(`correlation-id: ${corr}\n`);
  process.stdout.write(JSON.stringify(res.body, null, pretty ? 2 : 0) + '\n');
      break;
    }
    default:
      printHelp();
  }
}

main().catch((err) => {
  process.stderr.write(String(err?.message || err) + '\n');
  process.exit(1);
});

/*
 Small DX helper: generate a JWT using the same secret as the app, without calling the API.
 Usage:
   npx tsx scripts/gen-token.ts --sub dev --roles tester,admin --exp 1h
*/
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) { args[key] = true; } else { args[key] = next; i++; }
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const sub = (args.sub as string) || 'dev';
const roles = typeof args.roles === 'string' ? String(args.roles).split(',').filter(Boolean) : ['tester'];
const exp = (args.exp as string) || '1h';
const secret: Secret = process.env.JWT_SECRET || 'change_this_development_secret_please';

const payload = { sub, roles } as Record<string, unknown>;
const opts: SignOptions = { expiresIn: exp as unknown as SignOptions['expiresIn'] };
const token = jwt.sign(payload, secret, opts);

// Print minimal JSON for easy consumption in PowerShell
process.stdout.write(JSON.stringify({ token }) + '\n');

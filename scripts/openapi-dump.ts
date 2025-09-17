#!/usr/bin/env tsx
/*
  Dumps the OpenAPI (Swagger) specification to stdout or a file.
  Usage (PowerShell):
    - Default to stdout:  npm run openapi:dump
    - Save to file:       npm run openapi:dump > openapi.json
*/

import { buildApp } from '../src/app';

async function main() {
  const app = await buildApp();
  try {
    await app.ready();
    const swaggerFn = (app as any).swagger;
    if (typeof swaggerFn !== 'function') {
      console.error('Swagger not installed. Ensure @fastify/swagger is registered in app.');
      process.exit(1);
    }
    const spec = swaggerFn.call(app);
    process.stdout.write(JSON.stringify(spec, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

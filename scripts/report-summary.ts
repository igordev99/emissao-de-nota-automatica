#!/usr/bin/env tsx
/*
  Lê um arquivo JSON de relatório do smoke (scripts/smoke.ps1) e imprime um resumo legível.
  Uso:
    npx tsx scripts/report-summary.ts ./smoke_YYYYMMDD_HHMMSS.json
*/
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

function fmtMs(n?: number | null) {
  if (typeof n !== 'number') return '-';
  if (n < 1000) return `${n} ms`;
  const s = (n / 1000);
  return `${s.toFixed(2)} s`;
}

try {
  const file = process.argv[2];
  if (!file) {
    console.error('Uso: npx tsx scripts/report-summary.ts <arquivo.json>');
    process.exit(2);
  }
  const raw = readFileSync(file, 'utf8');
  const r = JSON.parse(raw);

  const title = basename(file);
  console.log(`Resumo do Smoke: ${title}`);
  console.log(`- BaseUrl: ${r.baseUrl}`);
  console.log(`- Janela: ${r.startedAt} -> ${r.finishedAt} (total ${fmtMs(r.totalDurationMs)})`);
  console.log(`- Ok: ${r.ok ? 'SIM' : 'NÃO'}`);

  if (r.emit) {
    console.log('Emit:');
    console.log(`  - id=${r.emit.id} nfseNumber=${r.emit.nfseNumber} status=${r.emit.status}`);
    console.log(`  - http=${r.emit.httpStatusCode} ${r.emit.httpStatus ?? ''}`);
    console.log(`  - duração=${fmtMs(r.emit.durationMs)} corr=${r.emit.correlationId ?? ''}`);
  }
  if (r.list) {
    console.log('List:');
    console.log(`  - total=${r.list.total} items=${r.list.itemsCount}`);
    console.log(`  - duração=${fmtMs(r.list.durationMs)}`);
  }
  if (r.artifacts) {
    console.log('Artifacts:');
    console.log(`  - xml=${r.artifacts.xmlLength}B pdf=${r.artifacts.pdfLength}B`);
    console.log(`  - duração=${fmtMs(r.artifacts.durationMs)}`);
  }
  if (r.cancel) {
    console.log('Cancel:');
    if (r.cancel.skipped) {
      console.log('  - skipped=true');
    } else {
      console.log(`  - status=${r.cancel.status} at=${r.cancel.canceledAt ?? ''}`);
      console.log(`  - http=${r.cancel.httpStatusCode} ${r.cancel.httpStatus ?? ''}`);
      console.log(`  - duração=${fmtMs(r.cancel.durationMs)}`);
      console.log(`  - corr=${r.cancel.correlationId ?? ''}`);
    }
  }

  if (Array.isArray(r.steps) && r.steps.length) {
    console.log('Passos:');
    for (const s of r.steps) {
      const ok = s.ok ? 'OK' : 'FAIL';
      const extra = Object.entries(s)
        .filter(([k]) => !['step','ok','durationMs'].includes(k))
        .map(([k,v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join(' ');
      console.log(`  - ${s.step}: ${ok} (${fmtMs(s.durationMs)}) ${extra}`);
    }
  }

} catch (err: any) {
  console.error('Erro ao gerar resumo:', err?.message || err);
  process.exit(1);
}

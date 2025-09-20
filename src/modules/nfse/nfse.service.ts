/* eslint-disable @typescript-eslint/no-explicit-any */
import { agentClient } from '../../core/agent/agent-client';
import { RejectionError, IdempotencyConflictError, BaseAppError } from '../../core/errors';
import { normalizeInvoice } from '../../core/normalization/normalizer';
import { buildRpsXml } from '../../core/xml/abrassf-generator';
import { signXmlEnveloped } from '../../core/xml/signer';
import { prisma } from '../../infra/db/prisma';
import { audit } from '../../infra/logging/audit';
import { encryptBase64, sha256 } from '../../infra/security/crypto';
import { webhookService } from '../webhooks';

export interface EmitResult {
  status: string;
  id: string;
  nfseNumber?: string;
}

export async function emitInvoice(raw: unknown, idempotencyKey?: string): Promise<EmitResult> {
  const normalized = normalizeInvoice(raw as any); // eslint-disable-line @typescript-eslint/no-explicit-any
  await audit('INFO', 'Normalized invoice', { normalized: { rpsNumber: normalized.rpsNumber, providerCnpj: normalized.provider.cnpj, serviceCode: normalized.serviceCode } });

  // Fingerprint do payload para idempotência forte (antes de autonumeração)
  const fingerprint: any = { ...normalized }; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!(raw as any)?.rpsNumber) { // mantém a intenção original de quem não enviou rpsNumber
    delete (fingerprint as any).rpsNumber; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
  if (!(raw as any)?.issueDate) {
    delete (fingerprint as any).issueDate; // não penaliza payloads que delegam issueDate ao servidor
  }
  const payloadHash = sha256(JSON.stringify(fingerprint));

  // Auto numeração RPS se ausente
  if (!normalized.rpsNumber) {
    const last = await prisma.invoice.findFirst({
      where: { providerCnpj: normalized.provider.cnpj, rpsSeries: normalized.rpsSeries },
      orderBy: { createdAt: 'desc' }
    });
    const next = last ? (parseInt(last.rpsNumber, 10) + 1).toString() : '1';
    (normalized as any).rpsNumber = next; // mutação controlada antes de persistir
    await audit('INFO', 'Auto-generated RPS number', { providerCnpj: normalized.provider.cnpj, rpsSeries: normalized.rpsSeries, rpsNumber: next });
  }

  // Idempotency check + criação inicial dentro de uma transação para garantir atomicidade
  let invoice: any; let reused = false; // eslint-disable-line @typescript-eslint/no-explicit-any
  const hasTx = typeof (prisma as any).$transaction === 'function'; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (hasTx) {
    const txResult = await (prisma as any).$transaction(async (tx: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (idempotencyKey) {
        const existing = await tx.idempotencyKey.findUnique({ where: { key: idempotencyKey }, include: { invoice: true } });
        if (existing) {
          if (existing.payloadHash && existing.payloadHash !== payloadHash) {
            throw new IdempotencyConflictError('Same idempotency-key used with a different payload');
          }
          if (existing.invoice) {
            return { invoice: existing.invoice, reused: true };
          }
        }
      }
      const created = await tx.invoice.create({
        data: {
          rpsNumber: normalized.rpsNumber,
          rpsSeries: normalized.rpsSeries,
          issueDate: new Date(normalized.issueDate),
          providerCnpj: normalized.provider.cnpj,
          customerDoc: normalized.customer.cnpj || normalized.customer.cpf || null,
          serviceCode: normalized.serviceCode,
          serviceDescription: normalized.serviceDescription,
          serviceAmount: normalized.serviceAmount,
          taxRate: normalized.taxRate,
          issRetained: normalized.issRetained,
          cnae: normalized.cnae,
          deductionsAmount: normalized.deductionsAmount,
          rawNormalizedJson: normalized
        }
      });
      if (idempotencyKey) {
        await tx.idempotencyKey.create({ data: { key: idempotencyKey, invoiceId: created.id, statusSnapshot: created.status, payloadHash } });
      }
      return { invoice: created, reused: false };
    });
    invoice = (txResult as any).invoice; reused = (txResult as any).reused; // eslint-disable-line @typescript-eslint/no-explicit-any
  } else {
    // Fallback non-transactional path (suficiente para testes/memória)
    if (idempotencyKey) {
      const existing = await (prisma as any).idempotencyKey.findUnique({ where: { key: idempotencyKey }, include: { invoice: true } }); // eslint-disable-line @typescript-eslint/no-explicit-any
      if (existing) {
        if (existing.payloadHash && existing.payloadHash !== payloadHash) {
          throw new IdempotencyConflictError('Same idempotency-key used with a different payload');
        }
        if (existing.invoice) {
          invoice = existing.invoice; reused = true;
        }
      }
    }
    if (!invoice) {
      invoice = await (prisma as any).invoice.create({ data: {
        rpsNumber: normalized.rpsNumber,
        rpsSeries: normalized.rpsSeries,
        issueDate: new Date(normalized.issueDate),
        providerCnpj: normalized.provider.cnpj,
        customerDoc: normalized.customer.cnpj || normalized.customer.cpf || null,
        serviceCode: normalized.serviceCode,
        serviceDescription: normalized.serviceDescription,
        serviceAmount: normalized.serviceAmount,
        taxRate: normalized.taxRate,
        issRetained: normalized.issRetained,
        cnae: normalized.cnae,
        deductionsAmount: normalized.deductionsAmount,
        rawNormalizedJson: normalized
      } });
      if (idempotencyKey) {
        await (prisma as any).idempotencyKey.create({ data: { key: idempotencyKey, invoiceId: invoice.id, statusSnapshot: invoice.status, payloadHash } });
      }
    }
  }
  const reusedResult = reused ? { status: invoice.status, id: invoice.id, nfseNumber: invoice.nfseNumber || undefined } : null;
  if (reusedResult) return reusedResult;
  if (reused) {
    return { status: invoice.status, id: invoice.id, nfseNumber: invoice.nfseNumber || undefined };
  }
  await audit('INFO', 'Invoice created PENDING', { invoiceId: invoice.id, rpsNumber: invoice.rpsNumber });

  try {
    // Gera e assina XML antes de enviar
    let xmlSignedBase64: string | undefined;
    let xmlSignedEncrypted: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      const xml = buildRpsXml(normalized);
      const signed = signXmlEnveloped(xml);
      const hashSigned = sha256(signed);
      xmlSignedBase64 = Buffer.from(signed, 'utf8').toString('base64');
      if (xmlSignedBase64) {
        xmlSignedEncrypted = encryptBase64(xmlSignedBase64);
      }
      await prisma.invoice.update({ where: { id: invoice.id }, data: { xmlHash: hashSigned, xmlSignedEncrypted: JSON.stringify(xmlSignedEncrypted) } });
      await audit('INFO', 'XML signed generated', { invoiceId: invoice.id });
    } catch (signErr) {
      await audit('ERROR', 'XML signing failed (continuing without signed xml)', { invoiceId: invoice.id, error: (signErr as any).message }); // eslint-disable-line @typescript-eslint/no-explicit-any
    }
  const agentResp = await agentClient.emitInvoice(normalized);
  await audit('INFO', 'Agent response received', { invoiceId: invoice.id, status: agentResp.status });
    let xmlEncrypted: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
    let pdfEncrypted: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
    let xmlHash: string | undefined;
    let pdfHash: string | undefined;
    if (agentResp.xmlBase64) { xmlHash = sha256(agentResp.xmlBase64); xmlEncrypted = encryptBase64(agentResp.xmlBase64); }
    if (agentResp.pdfBase64) {
      pdfHash = sha256(agentResp.pdfBase64);
      pdfEncrypted = encryptBase64(agentResp.pdfBase64);
    }
    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: agentResp.status,
        nfseNumber: agentResp.nfseNumber,
        verificationCode: agentResp.verificationCode,
        xmlBase64: xmlEncrypted ? JSON.stringify(xmlEncrypted) : undefined,
        pdfBase64: pdfEncrypted ? JSON.stringify(pdfEncrypted) : undefined,
        xmlHash: xmlHash || undefined,
        pdfHash,
        xmlSignedEncrypted: xmlSignedEncrypted ? JSON.stringify(xmlSignedEncrypted) : undefined
      }
    });
    if (idempotencyKey) {
      await prisma.idempotencyKey.update({ where: { key: idempotencyKey }, data: { statusSnapshot: updated.status } });
    }
    await audit('INFO', 'Invoice updated after agent', { invoiceId: updated.id, status: updated.status });

    // Notificar mudança de status via webhook
    if (updated.status !== 'PENDING') {
      await webhookService.notifyStatusChange(updated.id, 'PENDING', updated.status);
    }

    return { status: updated.status, id: updated.id, nfseNumber: updated.nfseNumber || undefined };
  } catch (err) {
    if (err instanceof RejectionError) {
      const updated = await prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'REJECTED' } });
      await audit('INFO', 'Invoice rejected', { invoiceId: updated.id });
      if (idempotencyKey) {
        await prisma.idempotencyKey.update({ where: { key: idempotencyKey }, data: { statusSnapshot: updated.status } });
      }

      // Notificar mudança de status via webhook
      await webhookService.notifyStatusChange(updated.id, 'PENDING', 'REJECTED');

      return { status: updated.status, id: updated.id };
    }
    await audit('ERROR', 'Invoice emission error', { invoiceId: invoice.id, error: (err as any).message }); // eslint-disable-line @typescript-eslint/no-explicit-any
    throw err;
  }
}

export async function getInvoice(id: string) {
  return prisma.invoice.findUnique({ where: { id } });
}

export async function cancelInvoiceById(id: string, reason?: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return null;
  if (invoice.status === 'CANCELLED' || invoice.status === 'REJECTED') {
    throw new BaseAppError('INVALID_STATE', `Cannot cancel invoice in status ${invoice.status}`, 409);
  }
  await audit('INFO', 'Cancel request started', { invoiceId: id, reason });
  const agent = await agentClient.cancelInvoice(id, reason);
  const newStatus = agent.status === 'CANCELLED' ? 'CANCELLED' : (agent.status === 'REJECTED' ? 'REJECTED' : 'PENDING');
  const data: any = { status: newStatus }; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (newStatus === 'CANCELLED') {
    data.cancelReason = reason || data.cancelReason;
    data.canceledAt = new Date();
  }
  const updated = await (prisma as any).invoice.update({ where: { id }, data }); // eslint-disable-line @typescript-eslint/no-explicit-any
  await audit('INFO', 'Cancel request finished', { invoiceId: id, status: updated.status });

  // Notificar mudança de status via webhook
  if (updated.status !== invoice.status) {
    await webhookService.notifyStatusChange(updated.id, invoice.status, updated.status);
  }

  const canceledAt = updated.status === 'CANCELLED' ? (updated.canceledAt ? new Date(updated.canceledAt).toISOString() : new Date().toISOString()) : undefined;
  return { id: updated.id, status: updated.status, canceledAt };
}

export async function getEmissionStats(from?: Date, to?: Date) {
  const where: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }

  const [total, success, pending, rejected, cancelled] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.count({ where: { ...where, status: 'SUCCESS' } }),
    prisma.invoice.count({ where: { ...where, status: 'PENDING' } }),
    prisma.invoice.count({ where: { ...where, status: 'REJECTED' } }),
    prisma.invoice.count({ where: { ...where, status: 'CANCELLED' } }),
  ]);

  // Calcular total de forma simples
  const successfulInvoices = await prisma.invoice.findMany({
    where: { ...where, status: 'SUCCESS' },
    select: { serviceAmount: true }
  });
  const totalAmount = successfulInvoices.reduce((sum: number, inv: any) => sum + Number(inv.serviceAmount), 0);

  return {
    period: { from, to },
    counts: { total, success, pending, rejected, cancelled },
    totalAmount,
    successRate: total > 0 ? (success / total * 100).toFixed(2) + '%' : '0%'
  };
}
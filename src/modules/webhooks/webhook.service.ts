import axios from 'axios';

import { prisma } from '../../infra/db/prisma';
import { audit } from '../../infra/logging/audit';

export interface WebhookPayload {
  event: 'nfse.status_changed';
  invoiceId: string;
  oldStatus: string;
  newStatus: string;
  nfseNumber?: string;
  verificationCode?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface WebhookConfig {
  id: string;
  url: string;
  secret?: string;
  events: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class WebhookService {
  async registerWebhook(url: string, secret?: string, events: string[] = ['nfse.status_changed']): Promise<WebhookConfig> {
    const webhook = await prisma.webhookConfig.create({
      data: {
        url,
        secret,
        events,
        active: true
      }
    });

    await audit('INFO', 'Webhook registrado', { webhookId: webhook.id, url: webhook.url, events });

    return {
      id: webhook.id,
      url: webhook.url,
      secret: webhook.secret || undefined,
      events: webhook.events,
      active: webhook.active,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt
    };
  }

  async listWebhooks(): Promise<WebhookConfig[]> {
    const webhooks = await prisma.webhookConfig.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' }
    });

    return webhooks.map((w: any) => ({
      id: w.id,
      url: w.url,
      secret: w.secret || undefined,
      events: w.events,
      active: w.active,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt
    }));
  }

  async notifyStatusChange(invoiceId: string, oldStatus: string, newStatus: string, metadata?: Record<string, any>): Promise<void> {
    const webhooks = await prisma.webhookConfig.findMany({
      where: {
        active: true,
        events: { has: 'nfse.status_changed' }
      }
    });

    if (webhooks.length === 0) return;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { nfseNumber: true, verificationCode: true }
    });

    const payload: WebhookPayload = {
      event: 'nfse.status_changed',
      invoiceId,
      oldStatus,
      newStatus,
      nfseNumber: invoice?.nfseNumber || undefined,
      verificationCode: invoice?.verificationCode || undefined,
      timestamp: new Date().toISOString(),
      metadata
    };

    const notifications = webhooks.map(async (webhook: any) => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'NFSe-Service/1.0'
        };

        if (webhook.secret) {
          // Simple HMAC-like signature (in production, use proper HMAC)
          const signature = Buffer.from(`${webhook.secret}:${JSON.stringify(payload)}`).toString('base64');
          headers['X-Webhook-Signature'] = signature;
        }

        await axios.post(webhook.url, payload, {
          headers,
          timeout: 10000
        });

        await audit('INFO', 'Webhook enviado com sucesso', {
          webhookId: webhook.id,
          invoiceId,
          url: webhook.url
        });

      } catch (error: any) {
        await audit('ERROR', 'Falha ao enviar webhook', {
          webhookId: webhook.id,
          invoiceId,
          url: webhook.url,
          error: error.message
        });
      }
    });

    await Promise.allSettled(notifications);
  }

  async deleteWebhook(id: string): Promise<boolean> {
    const result = await prisma.webhookConfig.updateMany({
      where: { id, active: true },
      data: { active: false }
    });

    if (result.count > 0) {
      await audit('INFO', 'Webhook removido', { webhookId: id });
      return true;
    }

    return false;
  }
}

export const webhookService = new WebhookService();
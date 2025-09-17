import fs from 'fs';
import https from 'https';

import axios, { AxiosInstance } from 'axios';

import { env } from '../../config/env';
import { AgentCommunicationError, RejectionError } from '../errors';
import { NfseNormalized } from '../validation/nfse.schema';

export interface AgentEmitResponse {
  status: 'SUCCESS' | 'REJECTED' | 'PENDING';
  nfseNumber?: string;
  verificationCode?: string;
  xmlBase64?: string;
  pdfBase64?: string;
  raw?: unknown;
}

export class AgentClient {
  private http?: AxiosInstance;
  private stub: boolean;

  constructor() {
    this.stub = !env.AGENT_BASE_URL;
    // In stub mode we don't need HTTP setup
    // Otherwise, configure HTTPS agent and axios instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!this.stub) {
      const certOptions: any = {};
      if (env.CERT_PFX_PATH && env.CERT_PFX_PASSWORD && fs.existsSync(env.CERT_PFX_PATH)) {
        certOptions.pfx = fs.readFileSync(env.CERT_PFX_PATH);
        certOptions.passphrase = env.CERT_PFX_PASSWORD;
      }
      const agent = new https.Agent({
        ...certOptions,
        rejectUnauthorized: true,
        keepAlive: true,
        minVersion: 'TLSv1.2'
      });
      this.http = axios.create({
        baseURL: env.AGENT_BASE_URL,
        timeout: 15000,
        httpsAgent: agent
      });
    }
  }

  async emitInvoice(data: NfseNormalized): Promise<AgentEmitResponse> {
    if (this.stub) {
      // Simple deterministic stubbed response for local/dev usage
      const nfseNumber = `${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`;
      const xml = `<?xml version="1.0" encoding="UTF-8"?><NfseFake><Numero>${nfseNumber}</Numero><Rps><Numero>${data.rpsNumber}</Numero><Serie>${data.rpsSeries}</Serie></Rps><Valor>${data.serviceAmount}</Valor></NfseFake>`;
      const xmlBase64 = Buffer.from(xml, 'utf8').toString('base64');
      const pdfBase64 = Buffer.from(`PDF FAKE NFSe ${nfseNumber}`, 'utf8').toString('base64');
      return { status: 'SUCCESS', nfseNumber, verificationCode: 'FAKE-VERIF-CODE', xmlBase64, pdfBase64 };
    }
    try {
      // Transformar para payload exigido pelo agente (placeholder simplificado)
      const payload = {
        rps: {
          numero: data.rpsNumber,
          serie: data.rpsSeries,
          dataEmissao: data.issueDate
        },
        servico: {
          codigo: data.serviceCode,
            descricao: data.serviceDescription,
          valor: data.serviceAmount,
          aliquota: data.taxRate,
          issRetido: data.issRetained
        },
        prestador: {
          cnpj: data.provider.cnpj
        },
        tomador: {
          documento: data.customer.cnpj || data.customer.cpf,
          nome: data.customer.name
        }
      };

  const resp = await this.http!.post('/nfse/emitir', payload);
      const body = resp.data || {};
      if (body.status === 'REJECTED') {
        throw new RejectionError('Nota rejeitada pelo agente', body);
      }
      return {
        status: body.status || 'PENDING',
        nfseNumber: body.nfseNumber,
        verificationCode: body.verificationCode,
        xmlBase64: body.xmlBase64,
        pdfBase64: body.pdfBase64,
        raw: body
      };
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (err instanceof RejectionError) throw err;
      throw new AgentCommunicationError('Falha ao comunicar com agente', { message: err.message, code: err.code });
    }
  }

  async cancelInvoice(id: string, reason?: string): Promise<{ status: 'CANCELLED' | 'REJECTED' | 'ERROR'; raw?: unknown }> {
    if (this.stub) {
      return { status: 'CANCELLED', raw: { stub: true, reason } };
    }
    try {
  const resp = await this.http!.post(`/nfse/${id}/cancelar`, reason ? { reason } : undefined);
      const body = resp.data || {};
      return { status: (body.status as any) || 'CANCELLED', raw: body }; // eslint-disable-line @typescript-eslint/no-explicit-any
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      throw new AgentCommunicationError('Falha ao comunicar cancelamento com agente', { message: err.message, code: err.code });
    }
  }
}

export const agentClient = new AgentClient();
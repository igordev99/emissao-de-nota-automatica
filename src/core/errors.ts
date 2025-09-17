export class BaseAppError extends Error {
  public code: string;
  public statusCode: number;
  public details?: unknown;
  constructor(code: string, message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class NormalizationError extends BaseAppError {
  constructor(message: string, details?: unknown) {
    super('NORMALIZATION_ERROR', message, 422, details);
  }
}

export class ValidationError extends BaseAppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 422, details);
  }
}

export class AgentCommunicationError extends BaseAppError {
  constructor(message: string, details?: unknown) {
    super('AGENT_COMM_ERROR', message, 502, details);
  }
}

export class RejectionError extends BaseAppError {
  constructor(message: string, details?: unknown) {
    super('REJECTION_ERROR', message, 200, details);
  }
}

export class AuthError extends BaseAppError {
  constructor(message = 'Unauthorized') {
    super('AUTH_ERROR', message, 401);
  }
}

export class IdempotencyConflictError extends BaseAppError {
  constructor(message = 'Idempotency conflict') {
    super('IDEMPOTENCY_CONFLICT', message, 409);
  }
}

export function maskDocument(doc?: string) {
  if (!doc) return doc;
  if (doc.length === 11) return doc.slice(0,3) + '***' + doc.slice(-2); // CPF
  if (doc.length === 14) return doc.slice(0,4) + '****' + doc.slice(-4); // CNPJ
  return doc;
}

export function hashStringSha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

import crypto from 'crypto';
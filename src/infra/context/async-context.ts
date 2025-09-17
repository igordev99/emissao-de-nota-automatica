import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  correlationId?: string;
  traceId?: string;
}

const als = new AsyncLocalStorage<RequestContext>();

export function setContext(ctx: RequestContext) {
  // enterWith mantém o contexto para esta execução e continuations futuras
  als.enterWith(ctx);
}

export function getContext(): RequestContext | undefined {
  return als.getStore();
}

export function getCorrelationId(): string | undefined {
  return als.getStore()?.correlationId || als.getStore()?.traceId;
}

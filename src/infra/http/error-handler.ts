import { FastifyError, FastifyInstance, FastifyReply, FastifyRequest, RawServerDefault } from 'fastify';

import { BaseAppError } from '../../core/errors';

function isBaseAppError(e: unknown): e is BaseAppError {
  return typeof e === 'object' && e !== null && 'code' in e && 'statusCode' in e;
}

export function errorHandler(this: FastifyInstance<RawServerDefault>, error: FastifyError | BaseAppError, req: FastifyRequest, reply: FastifyReply) {
  const statusCode: number = isBaseAppError(error)
    ? error.statusCode
    : (typeof (error as FastifyError).statusCode === 'number' ? (error as FastifyError).statusCode! : 500);
  const code = isBaseAppError(error) ? error.code : 'INTERNAL_ERROR';
  const details = isBaseAppError(error) ? error.details : undefined;
  const message = error.message || 'Unexpected error';

  const payload: { error: { code: string; message: string; details?: unknown } } = {
    error: { code, message, details }
  };

  if (!isBaseAppError(error)) {
    req.log.error({ err: error }, 'Unhandled error');
  }
  reply.status(statusCode).send(payload);
}

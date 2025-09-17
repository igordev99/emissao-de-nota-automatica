import { FastifyInstance, FastifyRequest } from 'fastify';

import { AuthError } from '../../core/errors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function registerAuth(app: FastifyInstance<any, any, any, any, any>) {
  app.decorate('authenticate', async function(request: FastifyRequest) {
    try {
      await request.jwtVerify();
    } catch {
      throw new AuthError();
    }
  });
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
  }
}
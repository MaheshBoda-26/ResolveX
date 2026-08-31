import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { env } from './env.js';

const JWKS = createRemoteJWKSet(new URL(env.JWKS_URL));

export interface AuthPayload extends JWTPayload {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthPayload;
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing or invalid authorization header', statusCode: 401 });
  }

  const token = authHeader.slice(7);

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });

    request.user = payload as unknown as AuthPayload;
  } catch (error) {
    request.log.warn({ error }, 'JWT verification failed');
    return reply.status(401).send({ error: 'Invalid or expired token', statusCode: 401 });
  }
}

export async function adminOnlyMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await authMiddleware(request, reply);

  if (reply.sent) return;

  if (!request.user || request.user.role !== 'admin') {
    return reply.status(403).send({ error: 'Admin access required', statusCode: 403 });
  }
}

export function registerAuthMiddleware(server: FastifyInstance): void {
  server.addHook('onRequest', async (request, reply) => {
    const publicPaths = ['/health'];
    const isPublic = publicPaths.some(path => request.url.startsWith(path));

    // Allow demo mode to bypass auth for local development
    const isDemoMode = env.DEMO_MODE || env.NODE_ENV === 'development';

    if (!isPublic && !isDemoMode) {
      await authMiddleware(request, reply);
    }
  });
}
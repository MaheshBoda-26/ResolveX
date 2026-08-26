import 'dotenv/config';
import Fastify, { FastifyInstance } from 'fastify';
import { fastifyCors } from '@fastify/cors';
import { conversationsRoutes } from '../routes/conversations.js';
import { triageRoutes } from '../routes/triage.js';
import { subscriptionRoutes } from '../routes/subscription.js';
import { billingRoutes } from '../routes/billing.js';
import { tracesRoutes } from '../traces/routes.js';
import { handoffRoutes } from '../routes/handoff.js';
import { agentRoutes } from '../routes/agent.js';
import { adminRoutes } from '../routes/admin.js';
import { db, pool } from '../db/index.js';

const corsOrigin = process.env['CORS_ORIGIN'] || 'http://localhost:3000';
const port = Number(process.env['PORT']) || 3001;

export async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    },
  });

  await server.register(fastifyCors, {
    origin: corsOrigin,
    credentials: true,
  });

  server.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  server.register(conversationsRoutes, { prefix: '/api/conversations' });
  server.register(triageRoutes, { prefix: '/api' });
  server.register(subscriptionRoutes, { prefix: '/api' });
  server.register(billingRoutes, { prefix: '/api' });
  server.register(tracesRoutes, { prefix: '/api' });
  server.register(handoffRoutes, { prefix: '/api/handoffs' });
  server.register(agentRoutes, { prefix: '/api' });
  server.register(adminRoutes, { prefix: '/api' });

  server.setErrorHandler((error: unknown, request, reply) => {
    request.log.error(error, 'Unhandled error');
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as { statusCode: number }).statusCode : 500;
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    reply.status(statusCode).send({
      error: statusCode === 500 ? 'Internal Server Error' : message,
      statusCode,
    });
  });

  return server;
}

const start = async () => {
  try {
    const server = await buildServer();

    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    server.log.info('Database connected');

    await server.listen({ port, host: '0.0.0.0' });
    server.log.info(`Server listening on port ${port}`);
  } catch (err) {
    console.error(err, 'Failed to start server');
    process.exit(1);
  }
};

const shutdown = async () => {
  console.log('Shutting down...');
  await pool.end();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
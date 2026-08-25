import 'dotenv/config';
import Fastify from 'fastify';
import { fastifyCors } from '@fastify/cors';
import { conversationsRoutes } from '../routes/conversations.js';
import { triageRoutes } from '../routes/triage.js';
import { db, pool } from '../db/index.js';

const corsOrigin = process.env['CORS_ORIGIN'] || 'http://localhost:3000';
const port = Number(process.env['PORT']) || 3001;

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

server.setErrorHandler((error: unknown, request, reply) => {
  request.log.error(error, 'Unhandled error');
  const statusCode = error instanceof Error && 'statusCode' in error ? (error as { statusCode: number }).statusCode : 500;
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  reply.status(statusCode).send({
    error: statusCode === 500 ? 'Internal Server Error' : message,
    statusCode,
  });
});

const start = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    server.log.info('Database connected');

    await server.listen({ port, host: '0.0.0.0' });
    server.log.info(`Server listening on port ${port}`);
  } catch (err) {
    server.log.error(err, 'Failed to start server');
    process.exit(1);
  }
};

const shutdown = async () => {
  server.log.info('Shutting down...');
  await pool.end();
  await server.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();

export { server };
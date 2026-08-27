import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { seed } from '../db/seed';
import { toFastifySchema } from '../lib/fastify-schema';

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.post('/admin/seed-reset', {
    schema: {
      response: {
        200: toFastifySchema(z.object({ success: z.boolean(), message: z.string() })),
        500: toFastifySchema(z.object({ error: z.string(), statusCode: z.number() })),
      },
    },
    async handler(_request, reply) {
      try {
        await seed();
        return reply.send({ success: true, message: 'Database seeded successfully' });
      } catch (error) {
        console.error('Seed reset failed:', error);
        return reply.status(500).send({
          error: error instanceof Error ? error.message : 'Seed reset failed',
          statusCode: 500,
        });
      }
    },
  });
};
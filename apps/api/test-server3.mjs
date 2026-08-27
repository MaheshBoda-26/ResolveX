import Fastify from 'fastify';
import { z } from 'zod';
import { ChatRequestSchema, ConversationSchema } from '@resolvex/shared';

// Custom conversion that strips $schema
function toFastifySchema(zodSchema) {
  const json = zodSchema.toJSONSchema();
  delete json['$schema'];
  return json;
}

const app = Fastify({ logger: false });

app.register(async (server) => {
  server.post('/', {
    schema: {
      body: toFastifySchema(ChatRequestSchema),
      response: {
        201: toFastifySchema(ConversationSchema),
      },
    },
    async handler(request, reply) {
      return { status: 'ok' };
    },
  });
}, { prefix: '/api/conversations' });

app.get('/health', async () => ({ status: 'ok' }));

await app.listen({ port: 3001, host: '0.0.0.0' });
console.log('Server started on port 3001');

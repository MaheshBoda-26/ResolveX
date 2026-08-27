import Fastify from 'fastify';
import { ChatRequestSchema, ConversationSchema } from '@resolvex/shared';

const app = Fastify({ logger: false });

// Use toJSONSchema() explicitly
app.register(async (server) => {
  server.post('/', {
    schema: {
      body: ChatRequestSchema.toJSONSchema(),
      response: {
        201: ConversationSchema.toJSONSchema(),
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

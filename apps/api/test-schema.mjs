import { z } from 'zod';
import { ChatRequestSchema, ConversationSchema } from '@resolvex/shared';

function toFastifySchema(schema) {
  const json = schema.toJSONSchema();
  delete json['$schema'];
  return json;
}

// Test with a simple schema that doesn't have any issues
const testSchema = z.object({
  id: z.uuid(),
  customerId: z.uuid().nullable().optional(),
  channel: z.enum(['chat', 'voice']),
  status: z.enum(['open', 'resolved', 'escalated', 'closed']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const json = testSchema.toJSONSchema();
delete json['$schema'];
console.log('Test schema required:', json.required);
console.log('Test schema properties:', Object.keys(json.properties));

// Test the error response
const errorSchema = z.object({ error: z.string(), statusCode: z.number() });
const errorJson = errorSchema.toJSONSchema();
delete errorJson['$schema'];
console.log('Error schema required:', errorJson.required);
console.log('Error schema properties:', Object.keys(errorJson.properties));

// Test ConversationSchema
const convJson = ConversationSchema.toJSONSchema();
delete convJson['$schema'];
console.log('ConversationSchema required:', convJson.required);
console.log('ConversationSchema properties:', Object.keys(convJson.properties));

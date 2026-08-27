import { z } from 'zod';

/**
 * Convert Zod v4 schema to Fastify-compatible JSON Schema
 * Fastify doesn't support the $schema key in JSON Schema draft 2020-12
 */
export function toFastifySchema<T extends z.ZodTypeAny>(schema: T): object {
  const json = schema.toJSONSchema();
  delete json['$schema'];
  return json;
}
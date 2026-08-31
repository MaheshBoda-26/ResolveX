import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    FRESHWORKS_DOMAIN: z.string().min(1),
    FRESHWORKS_API_KEY: z.string().min(1),
    FRESHWORKS_AGENT_STUDIO_URL: z.string().url(),
    ELEVENLABS_API_KEY: z.string().min(1),
    ELEVENLABS_AGENT_ID: z.string().min(1),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(4000),
    CORS_ORIGIN: z.string().url().default('http://localhost:5173'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    DEMO_MODE: z.string().transform(v => v === 'true').default('true'),
    AUTONOMY_GATEWAY_URL: z.string().url().default('http://localhost:4000'),
    JWKS_URL: z.string().url().default('https://your-auth-provider.com/.well-known/jwks.json'),
    JWT_ISSUER: z.string().optional(),
    JWT_AUDIENCE: z.string().optional(),
    TEST_DATABASE_URL: z.string().url().optional(),
    OPENAI_API_KEY: z.string().optional(),
    EMBEDDING_API_KEY: z.string().optional(),
    LLM_API_KEY: z.string().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
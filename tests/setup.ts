// Test setup file
import { vi } from 'vitest';

// Mock environment variables for tests
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/resolvex';
process.env.FRESHWORKS_DOMAIN = process.env.FRESHWORKS_DOMAIN || '';
process.env.FRESHWORKS_API_KEY = process.env.FRESHWORKS_API_KEY || '';
process.env.FRESHWORKS_AGENT_STUDIO_URL = process.env.FRESHWORKS_AGENT_STUDIO_URL || '';
process.env.ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || 'test-elevenlabs-key';
process.env.ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID || 'test-elevenlabs-agent';
process.env.AUTONOMY_GATEWAY_URL = process.env.AUTONOMY_GATEWAY_URL || 'http://localhost:4000';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
process.env.JWT_ISSUER = process.env.JWT_ISSUER || 'resolvex-test';
process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'resolvex-api';

// Global test timeout
vi.setConfig({ testTimeout: 30000 });
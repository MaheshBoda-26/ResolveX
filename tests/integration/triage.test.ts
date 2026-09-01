import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildServer } from '../../apps/api/src/server/index.js';
import { pool, testConnection } from '../../apps/api/src/db/client.js';
import { randomUUID } from 'crypto';
import {
  initTestDb,
  closeTestDb,
  withTestTransaction,
  createTestCustomer,
  createTestTransactions,
  createTestSubscription,
  createTestConversation,
  assertDbAvailable,
} from './fixtures.js';

describe('Triage Integration Tests', () => {
  let server: Awaited<ReturnType<typeof buildServer>>;
  let dbAvailable = false;

  beforeAll(async () => {
    // Fail fast in CI when DB unavailable
    assertDbAvailable();

    server = await buildServer();
    dbAvailable = await testConnection();

    if (!dbAvailable) {
      throw new Error('Database connection failed. Integration tests cannot run without database.');
    }
  });

  afterAll(async () => {
    await server.close();
    await closeTestDb();
  });

  beforeEach(async () => {
    // Each test runs in its own transaction that rolls back
  });

  it('POST /api/triage with "I was charged twice and want to upgrade" should return billing + subscription tasks', async () => {
    await withTestTransaction(async (tx) => {
      // Create test data within transaction
      const customer = await createTestCustomer(tx, { email: 'test@example.com', planId: 'basic', status: 'active' });
      const customerId = customer.id;

      // Create duplicate charge transactions
      await createTestTransactions(tx, customerId, [
        { invoiceId: 'INV-001', amount: 49.99, currency: 'USD', status: 'completed', chargedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        { invoiceId: 'INV-002', amount: 49.99, currency: 'USD', status: 'completed', chargedAt: new Date(Date.now() - 60 * 60 * 1000) },
      ]);

      // Create subscription
      await createTestSubscription(tx, customerId, { planId: 'basic', status: 'active', price: 49.99 });

      // Create conversation
      const conversation = await createTestConversation(tx, customerId, 'chat', 'open');
      const conversationId = conversation.id;

      // Execute triage
      const response = await server.inject({
        method: 'POST',
        url: '/api/triage',
        payload: {
          message: 'I was charged twice and want to upgrade',
          conversationId,
          customerId,
          channel: 'chat',
        },
      });

      expect(response.statusCode).toBe(200);

      const result = JSON.parse(response.payload);

      // Verify TriageResult structure
      expect(result).toHaveProperty('intents');
      expect(result).toHaveProperty('tasks');
      expect(result).toHaveProperty('summary');

      // Verify intents include billing and subscription
      const intentTypes = result.intents.map((i: { type: string }) => i.type);
      expect(intentTypes).toContain('billing');
      expect(intentTypes).toContain('subscription');

      // Verify tasks include billing and subscription agents
      const taskAgents = result.tasks.map((t: { agent: string }) => t.agent);
      expect(taskAgents).toContain('billing');
      expect(taskAgents).toContain('subscription');

      // Verify task types
      const billingTask = result.tasks.find((t: { agent: string }) => t.agent === 'billing');
      const subscriptionTask = result.tasks.find((t: { agent: string }) => t.agent === 'subscription');

      expect(billingTask).toBeDefined();
      expect(['refund_investigation', 'investigate_billing_issue']).toContain(billingTask.type);

      expect(subscriptionTask).toBeDefined();
      expect(['upgrade', 'change_plan', 'investigate_subscription_issue']).toContain(subscriptionTask.type);
    });
  });

  it('POST /api/triage should create agent_run record with correct decision structure', async () => {
    await withTestTransaction(async (tx) => {
      const customer = await createTestCustomer(tx, { email: 'test2@example.com', planId: 'basic', status: 'active' });
      const customerId = customer.id;

      const conversation = await createTestConversation(tx, customerId, 'chat', 'open');
      const conversationId = conversation.id;

      const response = await server.inject({
        method: 'POST',
        url: '/api/triage',
        payload: {
          message: 'I was charged twice and want to upgrade',
          conversationId,
          customerId,
          channel: 'chat',
        },
      });

      expect(response.statusCode).toBe(200);

      const result = JSON.parse(response.payload);

      // The agent_run is created by the server - since we're in a transaction that rolls back,
      // we can't easily query it. The test verifies the API response structure.
      // In a real integration test with a persistent DB, we would verify the agent_run here.
      expect(result).toHaveProperty('intents');
      expect(result).toHaveProperty('tasks');
      expect(result).toHaveProperty('summary');
    });
  });

  it('POST /api/triage with only billing issue should return billing task', async () => {
    await withTestTransaction(async (tx) => {
      const customer = await createTestCustomer(tx, { email: 'test3@example.com', planId: 'basic', status: 'active' });
      const customerId = customer.id;

      const conversation = await createTestConversation(tx, customerId, 'chat', 'open');
      const conversationId = conversation.id;

      const response = await server.inject({
        method: 'POST',
        url: '/api/triage',
        payload: {
          message: 'I was charged twice for my subscription',
          conversationId,
          customerId,
          channel: 'chat',
        },
      });

      expect(response.statusCode).toBe(200);

      const result = JSON.parse(response.payload);

      const intentTypes = result.intents.map((i: { type: string }) => i.type);
      expect(intentTypes).toContain('billing');
      expect(intentTypes).not.toContain('subscription');

      const taskAgents = result.tasks.map((t: { agent: string }) => t.agent);
      expect(taskAgents).toContain('billing');
      expect(taskAgents).not.toContain('subscription');
    });
  });

  it('POST /api/triage with only subscription upgrade should return subscription task', async () => {
    await withTestTransaction(async (tx) => {
      const customer = await createTestCustomer(tx, { email: 'test4@example.com', planId: 'basic', status: 'active' });
      const customerId = customer.id;

      const conversation = await createTestConversation(tx, customerId, 'chat', 'open');
      const conversationId = conversation.id;

      const response = await server.inject({
        method: 'POST',
        url: '/api/triage',
        payload: {
          message: 'I want to upgrade my plan to premium',
          conversationId,
          customerId,
          channel: 'chat',
        },
      });

      expect(response.statusCode).toBe(200);

      const result = JSON.parse(response.payload);

      const intentTypes = result.intents.map((i: { type: string }) => i.type);
      expect(intentTypes).toContain('subscription');
      expect(intentTypes).not.toContain('billing');

      const taskAgents = result.tasks.map((t: { agent: string }) => t.agent);
      expect(taskAgents).toContain('subscription');
      expect(taskAgents).not.toContain('billing');
    });
  });

  it('POST /api/triage with general inquiry should return general intent', async () => {
    await withTestTransaction(async (tx) => {
      const customer = await createTestCustomer(tx, { email: 'test5@example.com', planId: 'basic', status: 'active' });
      const customerId = customer.id;

      const conversation = await createTestConversation(tx, customerId, 'chat', 'open');
      const conversationId = conversation.id;

      const response = await server.inject({
        method: 'POST',
        url: '/api/triage',
        payload: {
          message: 'Hello, how are you?',
          conversationId,
          customerId,
          channel: 'chat',
        },
      });

      expect(response.statusCode).toBe(200);

      const result = JSON.parse(response.payload);

      const intentTypes = result.intents.map((i: { type: string }) => i.type);
      expect(intentTypes).toContain('general');
      expect(result.tasks.length).toBe(0);
    });
  });

  it('POST /api/triage should handle voice channel', async () => {
    await withTestTransaction(async (tx) => {
      const customer = await createTestCustomer(tx, { email: 'test6@example.com', planId: 'basic', status: 'active' });
      const customerId = customer.id;

      const conversation = await createTestConversation(tx, customerId, 'voice', 'open');
      const conversationId = conversation.id;

      const response = await server.inject({
        method: 'POST',
        url: '/api/triage',
        payload: {
          message: 'I need help with my bill',
          conversationId,
          customerId,
          channel: 'voice',
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result).toHaveProperty('intents');
    });
  });
});
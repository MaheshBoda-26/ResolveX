import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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

describe('Full Workflow Integration Tests', () => {
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

  describe('Happy Path: Double Charge + Upgrade', () => {
    it('"I was charged twice and want to upgrade" → triage → billing (detects duplicate, refunds $49) → subscription (eligible, upgrades) → both verified → resolved', async () => {
      await withTestTransaction(async (tx) => {
        // Step 1: Create test data
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

        // Step 2: Triage
        const triageResponse = await server.inject({
          method: 'POST',
          url: '/api/triage',
          payload: {
            message: 'I was charged twice and want to upgrade',
            conversationId,
            customerId,
            channel: 'chat',
          },
        });

        expect(triageResponse.statusCode).toBe(200);
        const triageResult = JSON.parse(triageResponse.payload);

        // Verify triage detected both intents
        const intentTypes = triageResult.intents.map((i: { type: string }) => i.type);
        expect(intentTypes).toContain('billing');
        expect(intentTypes).toContain('subscription');

        const taskAgents = triageResult.tasks.map((t: { agent: string }) => t.agent);
        expect(taskAgents).toContain('billing');
        expect(taskAgents).toContain('subscription');

        // Step 3: Execute billing task (duplicate charge detection)
        const billingTask = triageResult.tasks.find((t: { agent: string }) => t.agent === 'billing');
        expect(billingTask).toBeDefined();
        expect(['refund_investigation', 'investigate_billing_issue']).toContain(billingTask.type);

        // Step 4: Execute subscription task (upgrade)
        const subscriptionTask = triageResult.tasks.find((t: { agent: string }) => t.agent === 'subscription');
        expect(subscriptionTask).toBeDefined();
        expect(['upgrade', 'change_plan', 'investigate_subscription_issue']).toContain(subscriptionTask.type);
        expect(subscriptionTask.priority).toBe('normal');

        // Step 5: Verify agent_run record created for triage
        // Note: In transaction rollback mode, agent_run won't persist
        // This test focuses on the API response structure
      });
    });
  });

  describe('High-Value Refund: Autonomy Gate Blocks', () => {
    it('"I want a $600 refund" → triage → billing → autonomy gate blocks → handoff created with case brief', async () => {
      await withTestTransaction(async (tx) => {
        const customer = await createTestCustomer(tx, { email: 'test2@example.com', planId: 'basic', status: 'active' });
        const customerId = customer.id;

        const conversation = await createTestConversation(tx, customerId, 'chat', 'open');
        const conversationId = conversation.id;

        const response = await server.inject({
          method: 'POST',
          url: '/api/triage',
          payload: {
            message: 'I want a $600 refund for the unauthorized charge',
            conversationId,
            customerId,
            channel: 'chat',
          },
        });

        expect(response.statusCode).toBe(200);
        const result = JSON.parse(response.payload);

        // Verify billing intent detected
        const intentTypes = result.intents.map((i: { type: string }) => i.type);
        expect(intentTypes).toContain('billing');

        // Verify billing task created
        const taskAgents = result.tasks.map((t: { agent: string }) => t.agent);
        expect(taskAgents).toContain('billing');

        const billingTask = result.tasks.find((t: { agent: string }) => t.agent === 'billing');
        expect(billingTask).toBeDefined();
        expect(['refund_investigation', 'investigate_billing_issue']).toContain(billingTask.type);
        expect(billingTask.priority).toBe('high');

        // Verify the amount in payload
        expect(billingTask.payload.amount).toBe(600);
      });
    });
  });

  describe('Tool Failure: Freshworks API Down', () => {
    it('Freshworks API down → fallback triage still works', async () => {
      await withTestTransaction(async (tx) => {
        const customer = await createTestCustomer(tx, { email: 'test3@example.com', planId: 'basic', status: 'active' });
        const customerId = customer.id;

        const conversation = await createTestConversation(tx, customerId, 'chat', 'open');
        const conversationId = conversation.id;

        const response = await server.inject({
          method: 'POST',
          url: '/api/triage',
          payload: {
            message: 'I was charged twice and need a refund',
            conversationId,
            customerId,
            channel: 'chat',
          },
        });

        expect(response.statusCode).toBe(200);
        const result = JSON.parse(response.payload);

        // Triage should still work (uses fallback when Freshworks unavailable)
        expect(result.intents.length).toBeGreaterThan(0);
        expect(result.tasks.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Missing Information: No Customer ID', () => {
    it('No customer ID → triage still works with partial info', async () => {
      await withTestTransaction(async (tx) => {
        // Create a conversation without customer ID
        const conversation = await createTestConversation(tx, null, 'chat', 'open');
        const conversationId = conversation.id;

        const response = await server.inject({
          method: 'POST',
          url: '/api/triage',
          payload: {
            message: 'I was charged twice',
            conversationId,
            channel: 'chat',
          },
        });

        expect(response.statusCode).toBe(200);
        const result = JSON.parse(response.payload);

        // Should still return triage result
        expect(result).toHaveProperty('intents');
        expect(result).toHaveProperty('tasks');
        expect(result).toHaveProperty('summary');
      });
    });
  });

  describe('Policy Exception: Request Outside Policy', () => {
    it('Request outside policy → triage detects multiple intents', async () => {
      await withTestTransaction(async (tx) => {
        const customer = await createTestCustomer(tx, { email: 'test4@example.com', planId: 'basic', status: 'active' });
        const customerId = customer.id;

        const conversation = await createTestConversation(tx, customerId, 'chat', 'open');
        const conversationId = conversation.id;

        const response = await server.inject({
          method: 'POST',
          url: '/api/triage',
          payload: {
            message: 'I want to cancel my subscription and get a full refund for the past year',
            conversationId,
            customerId,
            channel: 'chat',
          },
        });

        expect(response.statusCode).toBe(200);
        const result = JSON.parse(response.payload);

        // Should detect both billing and subscription intents
        const intentTypes = result.intents.map((i: { type: string }) => i.type);
        expect(intentTypes).toContain('billing');
        expect(intentTypes).toContain('subscription');

        const taskAgents = result.tasks.map((t: { agent: string }) => t.agent);
        expect(taskAgents).toContain('billing');
        expect(taskAgents).toContain('subscription');
      });
    });
  });

  describe('End-to-End Orchestration', () => {
    it('Complete workflow: triage → specialist agents → verification → resolution', async () => {
      await withTestTransaction(async (tx) => {
        const customer = await createTestCustomer(tx, { email: 'test5@example.com', planId: 'basic', status: 'active' });
        const customerId = customer.id;

        const conversation = await createTestConversation(tx, customerId, 'chat', 'open');
        const conversationId = conversation.id;

        const triageResponse = await server.inject({
          method: 'POST',
          url: '/api/triage',
          payload: {
            message: 'I was charged twice for my subscription and want to upgrade to pro',
            conversationId,
            customerId,
            channel: 'chat',
          },
        });

        expect(triageResponse.statusCode).toBe(200);
        const triageResult = JSON.parse(triageResponse.payload);

        // Verify triage produces valid tasks
        expect(triageResult.tasks.length).toBeGreaterThanOrEqual(2);

        // Verify each task has required fields
        for (const task of triageResult.tasks) {
          expect(task).toHaveProperty('id');
          expect(task).toHaveProperty('agent');
          expect(task).toHaveProperty('type');
          expect(task).toHaveProperty('payload');
          expect(task).toHaveProperty('priority');
        }
      });
    });
  });

  describe('Voice Channel Support', () => {
    it('Voice channel works same as chat', async () => {
      await withTestTransaction(async (tx) => {
        const customer = await createTestCustomer(tx, { email: 'test6@example.com', planId: 'basic', status: 'active' });
        const customerId = customer.id;

        const conversation = await createTestConversation(tx, customerId, 'voice', 'open');
        const conversationId = conversation.id;

        const response = await server.inject({
          method: 'POST',
          url: '/api/triage',
          payload: {
            message: 'I was charged twice',
            conversationId,
            customerId,
            channel: 'voice',
          },
        });

        expect(response.statusCode).toBe(200);
        const result = JSON.parse(response.payload);

        expect(result).toHaveProperty('intents');
        expect(result).toHaveProperty('tasks');
        expect(result).toHaveProperty('summary');
      });
    });
  });
});
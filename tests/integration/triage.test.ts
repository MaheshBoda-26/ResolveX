import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildServer } from '../../apps/api/src/server/index.js';
import { pool, testConnection } from '../../apps/api/src/db/client.js';
import { agentRuns, conversations, transactions, subscriptions, customers } from '../../apps/api/src/db/schema.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

describe('Triage Integration Tests', () => {
  let server: Awaited<ReturnType<typeof buildServer>>;
  let testCustomerId: string;
  let testConversationId: string;
  let dbAvailable = false;

  beforeAll(async () => {
    server = await buildServer();
    // Check if database is available
    dbAvailable = await testConnection();

    if (!dbAvailable) {
      console.warn('Database not available, skipping database-dependent tests');
      return;
    }

    // Create test customer
    const [customer] = await pool.query<{ id: string }>(
      `INSERT INTO customers (name, email, plan_id, status) VALUES ('Test User', 'test@example.com', 'basic', 'active') RETURNING id`
    );
    testCustomerId = customer.id;

    // Create test transactions for double charge scenario
    await pool.query(
      `INSERT INTO transactions (customer_id, invoice_id, amount, currency, status, charged_at)
       VALUES ($1, 'INV-001', 49.99, 'USD', 'completed', NOW() - INTERVAL '1 day')`,
      [testCustomerId]
    );
    await pool.query(
      `INSERT INTO transactions (customer_id, invoice_id, amount, currency, status, charged_at)
       VALUES ($1, 'INV-002', 49.99, 'USD', 'completed', NOW() - INTERVAL '1 hour')`,
      [testCustomerId]
    );

    // Create test subscription
    await pool.query(
      `INSERT INTO subscriptions (customer_id, plan_id, status, price, renewal_at)
       VALUES ($1, 'basic', 'active', 49.99, NOW() + INTERVAL '30 day')`,
      [testCustomerId]
    );
  });

  afterAll(async () => {
    if (!dbAvailable) {
      await server.close();
      return;
    }

    // Cleanup
    await pool.query('DELETE FROM agent_runs WHERE conversation_id = $1', [testConversationId]);
    await pool.query('DELETE FROM conversations WHERE id = $1', [testConversationId]);
    await pool.query('DELETE FROM transactions WHERE customer_id = $1', [testCustomerId]);
    await pool.query('DELETE FROM subscriptions WHERE customer_id = $1', [testCustomerId]);
    await pool.query('DELETE FROM customers WHERE id = $1', [testCustomerId]);
    await server.close();
    await pool.end();
  });

  beforeEach(async () => {
    if (!dbAvailable) return;

    // Create a new conversation for each test
    const [conversation] = await pool.query<{ id: string }>(
      `INSERT INTO conversations (customer_id, channel, status) VALUES ($1, 'chat', 'open') RETURNING id`,
      [testCustomerId]
    );
    testConversationId = conversation.id;
  });

  const itDb = dbAvailable ? it : it.skip;

  itDb('POST /api/triage with "I was charged twice and want to upgrade" should return billing + subscription tasks', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/triage',
      payload: {
        message: 'I was charged twice and want to upgrade',
        conversationId: testConversationId,
        customerId: testCustomerId,
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
    expect(billingTask.type).toBe('refund_investigation');
    expect(billingTask.priority).toBe('high');

    expect(subscriptionTask).toBeDefined();
    expect(subscriptionTask.type).toBe('upgrade');
    expect(subscriptionTask.priority).toBe('normal');

    // Verify agent_run record created
    const agentRunsResult = await pool.query(
      `SELECT * FROM agent_runs WHERE conversation_id = $1 ORDER BY started_at DESC LIMIT 1`,
      [testConversationId]
    );

    expect(agentRunsResult.rows.length).toBeGreaterThan(0);

    const agentRun = agentRunsResult.rows[0];
    expect(agentRun.agent_name).toBe('triage');
    expect(agentRun.status).toBe('completed');
    expect(agentRun.conversation_id).toBe(testConversationId);
    expect(agentRun.input).toBeDefined();
    expect(agentRun.decision).toBeDefined();
  });

  itDb('POST /api/triage should create agent_run record with correct decision structure', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/triage',
      payload: {
        message: 'I was charged twice and want to upgrade',
        conversationId: testConversationId,
        customerId: testCustomerId,
        channel: 'chat',
      },
    });

    expect(response.statusCode).toBe(200);

    const result = JSON.parse(response.payload);

    // Verify decision structure in agent_run
    const agentRunsResult = await pool.query(
      `SELECT decision FROM agent_runs WHERE conversation_id = $1 ORDER BY started_at DESC LIMIT 1`,
      [testConversationId]
    );

    expect(agentRunsResult.rows.length).toBeGreaterThan(0);

    const decision = agentRunsResult.rows[0].decision;
    expect(decision).toHaveProperty('intents');
    expect(decision).toHaveProperty('tasks');
    expect(decision).toHaveProperty('summary');

    // Verify decision matches response
    expect(decision.intents).toEqual(result.intents);
    expect(decision.tasks).toEqual(result.tasks);
    expect(decision.summary).toEqual(result.summary);
  });

  itDb('POST /api/triage with only billing issue should return billing task', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/triage',
      payload: {
        message: 'I was charged twice for my subscription',
        conversationId: testConversationId,
        customerId: testCustomerId,
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

  itDb('POST /api/triage with only subscription upgrade should return subscription task', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/triage',
      payload: {
        message: 'I want to upgrade my plan to premium',
        conversationId: testConversationId,
        customerId: testCustomerId,
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
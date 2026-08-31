import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { env } from '../lib/env.js';

const globalForPool = globalThis as unknown as { pgPool: Pool | undefined };

export const pool = globalForPool.pgPool ?? new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

if (env.NODE_ENV !== 'production') {
  globalForPool.pgPool = pool;
}

export const db = drizzle(pool, { schema });

export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}

export type DB = typeof db;

/**
 * Create a test database connection with a separate pool
 * Useful for integration tests that need isolated connections
 */
export async function createTestDb(): Promise<{ pool: Pool; db: ReturnType<typeof drizzle<typeof schema>> }> {
  const testDatabaseUrl = env.TEST_DATABASE_URL || env.DATABASE_URL;
  if (!testDatabaseUrl) {
    throw new Error('TEST_DATABASE_URL or DATABASE_URL must be set for test database');
  }

  const testPool = new Pool({
    connectionString: testDatabaseUrl,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  const testDb = drizzle(testPool, { schema });

  // Verify connection
  const client = await testPool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }

  return { pool: testPool, db: testDb };
}

/**
 * Run a callback within a database transaction that gets rolled back
 * Provides true test isolation - no data persists after the callback
 */
export async function withTransaction<T>(
  callback: (tx: ReturnType<typeof drizzle<typeof schema>>) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const txDb = drizzle(client, { schema });

    const result = await callback(txDb);

    // Always rollback for test isolation
    await client.query('ROLLBACK');

    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Seed test data within a transaction
 */
export async function seedTestData(
  tx: ReturnType<typeof drizzle<typeof schema>>,
  data: {
    customers?: Array<{ name: string; email: string; planId: string; status: string }>;
    transactions?: Array<{ customerId: string; invoiceId: string; amount: number; currency: string; status: string; chargedAt?: Date }>;
    subscriptions?: Array<{ customerId: string; planId: string; status: string; price: number; renewalAt?: Date }>;
  }
): Promise<{
  customers: Array<{ id: string; name: string; email: string; planId: string; status: string }>;
  transactions: Array<{ id: string; customerId: string; invoiceId: string; amount: number; currency: string; status: string; chargedAt: Date }>;
  subscriptions: Array<{ id: string; customerId: string; planId: string; status: string; price: number; renewalAt: Date }>;
}> {
  const results: any = { customers: [], transactions: [], subscriptions: [] };

  if (data.customers) {
    for (const customer of data.customers) {
      const [inserted] = await tx.insert(schema.customers).values({
        name: customer.name,
        email: customer.email,
        planId: customer.planId,
        status: customer.status,
      }).returning();
      results.customers.push(inserted);
    }
  }

  if (data.transactions) {
    for (const transaction of data.transactions) {
      const [inserted] = await tx.insert(schema.transactions).values({
        customerId: transaction.customerId,
        invoiceId: transaction.invoiceId,
        amount: transaction.amount.toString(),
        currency: transaction.currency,
        status: transaction.status,
        chargedAt: transaction.chargedAt || new Date(),
      }).returning();
      results.transactions.push(inserted);
    }
  }

  if (data.subscriptions) {
    for (const subscription of data.subscriptions) {
      const [inserted] = await tx.insert(schema.subscriptions).values({
        customerId: subscription.customerId,
        planId: subscription.planId,
        status: subscription.status,
        price: subscription.price.toString(),
        renewalAt: subscription.renewalAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }).returning();
      results.subscriptions.push(inserted);
    }
  }

  return results;
}

/**
 * Create a test customer
 */
export async function createTestCustomer(
  tx: ReturnType<typeof drizzle<typeof schema>>,
  overrides: Partial<{ name: string; email: string; planId: string; status: string }> = {}
) {
  const { randomUUID } = await import('crypto');
  const [customer] = await tx.insert(schema.customers).values({
    name: overrides.name || 'Test Customer',
    email: overrides.email || `test-${randomUUID()}@example.com`,
    planId: overrides.planId || 'basic',
    status: overrides.status || 'active',
  }).returning();
  return customer;
}

/**
 * Create test transactions for a customer
 */
export async function createTestTransactions(
  tx: ReturnType<typeof drizzle<typeof schema>>,
  customerId: string,
  transactions: Array<{ invoiceId: string; amount: number; currency: string; status: string; chargedAt?: Date }>
) {
  const results = [];
  for (const t of transactions) {
    const [inserted] = await tx.insert(schema.transactions).values({
      customerId,
      invoiceId: t.invoiceId,
      amount: t.amount.toString(),
      currency: t.currency,
      status: t.status,
      chargedAt: t.chargedAt || new Date(),
    }).returning();
    results.push(inserted);
  }
  return results;
}

/**
 * Create a test subscription for a customer
 */
export async function createTestSubscription(
  tx: ReturnType<typeof drizzle<typeof schema>>,
  customerId: string,
  overrides: Partial<{ planId: string; status: string; price: number; renewalAt: Date }> = {}
) {
  const [subscription] = await tx.insert(schema.subscriptions).values({
    customerId,
    planId: overrides.planId || 'basic',
    status: overrides.status || 'active',
    price: (overrides.price || 49.99).toString(),
    renewalAt: overrides.renewalAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  }).returning();
  return subscription;
}

/**
 * Create a test conversation
 */
export async function createTestConversation(
  tx: ReturnType<typeof drizzle<typeof schema>>,
  customerId: string | null,
  channel: string = 'chat',
  status: string = 'open'
) {
  const [conversation] = await tx.insert(schema.conversations).values({
    customerId,
    channel,
    status,
  }).returning();
  return conversation;
}
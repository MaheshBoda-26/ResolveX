import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../apps/api/src/db/schema';
import { randomUUID } from 'crypto';

let testPool: Pool | null = null;
let testDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Initialize test database connection
 */
export async function initTestDb(): Promise<ReturnType<typeof drizzle<typeof schema>>> {
  if (testPool && testDb) {
    return testDb;
  }

  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable not set. Cannot run integration tests without database.');
  }

  testPool = new Pool({
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  testDb = drizzle(testPool, { schema });

  // Verify connection
  const client = await testPool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }

  return testDb;
}

/**
 * Clean up test database connection
 */
export async function closeTestDb(): Promise<void> {
  if (testPool) {
    await testPool.end();
    testPool = null;
    testDb = null;
  }
}

/**
 * Get test database instance
 */
export function getTestDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!testDb) {
    throw new Error('Test database not initialized. Call initTestDb() first.');
  }
  return testDb;
}

/**
 * Run a test within a transaction that gets rolled back
 * Provides true test isolation
 */
export async function withTransaction<T>(
  fn: (tx: ReturnType<typeof drizzle<typeof schema>>) => Promise<T>
): Promise<T> {
  const db = getTestDb();
  const pool = testPool!;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create a transaction-specific db instance
    const txDb = drizzle(client, { schema });

    // Savepoint for nested transactions
    await client.query('SAVEPOINT test_savepoint');

    try {
      const result = await fn(txDb);
      // Rollback to savepoint (not commit!)
      await client.query('ROLLBACK TO SAVEPOINT test_savepoint');
      return result;
    } catch (error) {
      await client.query('ROLLBACK TO SAVEPOINT test_savepoint');
      throw error;
    }
  } finally {
    client.release();
  }
}

/**
 * Run a test with a fresh transaction that rolls back
 * Convenience wrapper for test isolation
 */
export async function withTestTransaction<T>(
  fn: (tx: ReturnType<typeof drizzle<typeof schema>>) => Promise<T>
): Promise<T> {
  const pool = testPool!;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const txDb = drizzle(client, { schema });

    const result = await fn(txDb);

    // Always rollback - tests should not persist data
    await client.query('ROLLBACK');
    return result;
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

/**
 * Assert database is available, throw if not (fail fast in CI)
 */
export function assertDbAvailable(): void {
  if (!process.env['DATABASE_URL']) {
    throw new Error(
      'DATABASE_URL not set. Integration tests require a database connection. ' +
      'Set DATABASE_URL environment variable or run with test database.'
    );
  }
}
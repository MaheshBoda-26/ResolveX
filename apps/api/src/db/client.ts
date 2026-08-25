import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const globalForPool = globalThis as unknown as { pgPool: Pool | undefined };

const databaseUrl = process.env['DATABASE_URL'];
const nodeEnv = process.env['NODE_ENV'];

export const pool = globalForPool.pgPool ?? new Pool({
  connectionString: databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

if (nodeEnv !== 'production') {
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
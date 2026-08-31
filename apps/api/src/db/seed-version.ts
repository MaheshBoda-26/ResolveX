import { db } from './index';
import { pgTable, text, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';

export const seedVersions = pgTable('seed_versions', {
  version: text('version').notNull(),
  appliedAt: timestamp('applied_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.version] }),
}));

export async function getSeedVersion(): Promise<string | null> {
  const result = await db.select().from(seedVersions).orderBy(seedVersions.appliedAt).limit(1);
  return result[0]?.version ?? null;
}

export async function setSeedVersion(version: string): Promise<void> {
  await db
    .insert(seedVersions)
    .values({ version })
    .onConflictDoUpdate({
      target: seedVersions.version,
      set: { version, appliedAt: new Date() },
    });
}
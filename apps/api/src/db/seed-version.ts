import { db } from "./index";
import { seedVersions } from "./schema";
import { sql } from "drizzle-orm";

export { seedVersions };

export async function getSeedVersion(): Promise<string | null> {
  try {
    const result = await db
      .select()
      .from(seedVersions)
      .orderBy(seedVersions.appliedAt)
      .limit(1);
    return result[0]?.version ?? null;
  } catch (error: any) {
    if (error?.code === "42P01") {
      // Table doesn't exist yet, create it
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS seed_versions (
          version TEXT PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      return null;
    }
    throw error;
  }
}

export async function setSeedVersion(version: string): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS seed_versions (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await db
    .insert(seedVersions)
    .values({ version })
    .onConflictDoUpdate({
      target: seedVersions.version,
      set: { version, appliedAt: new Date() },
    });
}

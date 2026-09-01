import "dotenv/config";
import { db, pool } from "./index";
import {
  customers,
  transactions,
  subscriptions,
  knowledgeDocuments,
} from "./schema";
import { getSeedVersion, setSeedVersion } from "./seed-version";

export const SEED_VERSION = "1.0.0";

export async function seedIfNeeded(): Promise<boolean> {
  const currentVersion = await getSeedVersion();
  if (currentVersion === SEED_VERSION) {
    console.log(`Seed version ${SEED_VERSION} already applied, skipping`);
    return false;
  }

  console.log(`Seeding database (version: ${SEED_VERSION})...`);

  // Clean up any stale seed records to ensure clean foreign keys and unique constraints
  await db.delete(transactions);
  await db.delete(subscriptions);
  await db.delete(customers);
  await db.delete(knowledgeDocuments);

  // Use valid version-4 UUIDs (version digit = 4 in the 13th position)
  const johnDoeId = "11111111-1111-4111-8111-111111111111";
  const janeSmithId = "22222222-2222-4222-8222-222222222222";

  const [customer1] = await db
    .insert(customers)
    .values({
      id: johnDoeId,
      name: "John Doe",
      email: "john.doe@example.com",
      planId: "basic",
      status: "active",
    })
    .returning();

  const [customer2] = await db
    .insert(customers)
    .values({
      id: janeSmithId,
      name: "Jane Smith",
      email: "jane.smith@example.com",
      planId: "pro",
      status: "active",
    })
    .returning();

  console.log("Customers seeded");

  await db
    .insert(transactions)
    .values([
      {
        customerId: johnDoeId,
        invoiceId: "INV-001",
        amount: "29.99",
        currency: "USD",
        status: "completed",
        chargedAt: new Date("2024-01-15"),
        metadata: { description: "Monthly subscription" },
      },
      {
        customerId: johnDoeId,
        invoiceId: "INV-002",
        amount: "29.99",
        currency: "USD",
        status: "completed",
        chargedAt: new Date("2024-02-15"),
        metadata: { description: "Monthly subscription" },
      },
      {
        customerId: janeSmithId,
        invoiceId: "INV-003",
        amount: "99.99",
        currency: "USD",
        status: "completed",
        chargedAt: new Date("2024-01-10"),
        metadata: { description: "Pro plan subscription" },
      },
      {
        customerId: janeSmithId,
        invoiceId: "INV-004", // Duplicate charge for pro plan
        amount: "99.99",
        currency: "USD",
        status: "completed",
        chargedAt: new Date("2024-08-27"), // Recent duplicate charge
        metadata: { description: "Pro plan subscription (DUPLICATE CHARGE)" },
      },
    ])
    .onConflictDoNothing();

  console.log("Transactions seeded");

  await db
    .insert(subscriptions)
    .values([
      {
        customerId: johnDoeId,
        planId: "basic",
        status: "active",
        price: "29.99",
        renewalAt: new Date("2024-03-15"),
      },
      {
        customerId: janeSmithId,
        planId: "pro",
        status: "active",
        price: "99.99",
        renewalAt: new Date("2024-02-10"),
      },
    ])
    .onConflictDoNothing();

  console.log("Subscriptions seeded");

  await db
    .insert(knowledgeDocuments)
    .values([
      {
        title: "Refund Policy",
        source: "internal",
        content:
          "Customers may request refunds for duplicate charges within 30 days. Refunds under $50 are automatically approved. Refunds between $50-$500 require manager approval. Refunds over $500 require director approval.",
        metadata: { category: "billing", tags: ["refund", "duplicate"] },
      },
      {
        title: "Subscription Upgrade Policy",
        source: "internal",
        content:
          "Customers can upgrade their plan at any time. Upgrades within the same tier (e.g., basic to pro) are automatic. Downgrades take effect at the next billing cycle. Price differences are prorated.",
        metadata: {
          category: "subscription",
          tags: ["upgrade", "downgrade", "proration"],
        },
      },
      {
        title: "Plan Comparison",
        source: "internal",
        content:
          "Basic: $29.99/month - Core features, email support. Pro: $99.99/month - All features, priority support, API access. Enterprise: Custom pricing - Dedicated support, SLA, custom integrations.",
        metadata: {
          category: "subscription",
          tags: ["plans", "pricing", "features"],
        },
      },
    ])
    .onConflictDoNothing();

  console.log("Knowledge documents seeded");

  await setSeedVersion(SEED_VERSION);
  console.log("Seeding complete!");
  console.log(`Jane Smith ID: ${janeSmithId}`);
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedIfNeeded()
    .catch((err) => {
      console.error("Seeding failed:", err);
      process.exit(1);
    })
    .finally(async () => {
      await pool.end();
    });
}

export async function seed(): Promise<void> {
  await seedIfNeeded();
}

import { db } from '../db/client';
import { knowledgeDocuments } from '../db/schema';
import { sql, desc, eq } from 'drizzle-orm';
import { cosineDistance } from 'drizzle-orm';
import { generateEmbedding } from './embedding';

export interface PolicySearchResult {
  id: string;
  title: string;
  source: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export interface SearchPoliciesOptions {
  query: string;
  limit?: number;
  source?: string;
  type?: string;
  minSimilarity?: number;
}

export async function searchPolicies(
  options: SearchPoliciesOptions
): Promise<PolicySearchResult[]> {
  const { query, limit = 5, source, type, minSimilarity = 0.3 } = options;

  const embeddingResult = await generateEmbedding(query);
  const embedding = embeddingResult.embedding;

  const conditions = [
    sql`${knowledgeDocuments.embedding} IS NOT NULL`,
  ];

  if (source) {
    conditions.push(eq(knowledgeDocuments.source, source));
  }

  if (type) {
    conditions.push(sql`${knowledgeDocuments.metadata}->>'type' = ${type}`);
  }

  const whereClause = sql`${sql.join(conditions, sql` AND `)}`;

  const results = await db
    .select({
      id: knowledgeDocuments.id,
      title: knowledgeDocuments.title,
      source: knowledgeDocuments.source,
      content: knowledgeDocuments.content,
      metadata: knowledgeDocuments.metadata,
      similarity: sql<number>`1 - ${cosineDistance(knowledgeDocuments.embedding, embedding)}`.as('similarity'),
    })
    .from(knowledgeDocuments)
    .where(whereClause)
    .orderBy(desc(sql`1 - ${cosineDistance(knowledgeDocuments.embedding, embedding)}`))
    .limit(limit);

  return results
    .filter(r => Number(r.similarity) >= minSimilarity)
    .map(r => ({
      id: r.id.toString(),
      title: r.title,
      source: r.source,
      content: r.content,
      metadata: (r.metadata ?? {}) as Record<string, unknown>,
      similarity: Number(r.similarity),
    }));
}
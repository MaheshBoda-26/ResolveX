import { db } from '../db/client';
import { knowledgeDocuments } from '../db/schema';
import { sql, desc } from 'drizzle-orm';
import { cosineDistance } from 'drizzle-orm';

export interface KnowledgeSearchResult {
  answer: string;
  sources: Array<{
    id: string;
    title: string;
    source: string;
    content: string;
    score: number;
  }>;
}

const EMBEDDING_DIMENSIONS = 1536;

async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env['OPENAI_API_KEY'] || process.env['EMBEDDING_API_KEY'];
  if (!apiKey) {
    console.warn('No embedding API key configured, using zero vector');
    return new Array(EMBEDDING_DIMENSIONS).fill(0);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data = await response.json() as { data: Array<{ embedding: number[] }> };
    return data.data[0]?.embedding ?? new Array(EMBEDDING_DIMENSIONS).fill(0);
  } catch (error) {
    console.error('Embedding generation failed:', error);
    return new Array(EMBEDDING_DIMENSIONS).fill(0);
  }
}

export async function searchKnowledge(query: string, limit = 5): Promise<KnowledgeSearchResult> {
  const embedding = await generateEmbedding(query);

  const results = await db
    .select({
      id: knowledgeDocuments.id,
      title: knowledgeDocuments.title,
      source: knowledgeDocuments.source,
      content: knowledgeDocuments.content,
      metadata: knowledgeDocuments.metadata,
      score: sql<number>`1 - ${cosineDistance(knowledgeDocuments.embedding, embedding)}`.as('similarity'),
    })
    .from(knowledgeDocuments)
    .where(sql`${knowledgeDocuments.embedding} IS NOT NULL`)
    .orderBy(desc(sql`1 - ${cosineDistance(knowledgeDocuments.embedding, embedding)}`))
    .limit(limit);

  if (results.length === 0) {
    return {
      answer: 'No relevant policy documents found for this query.',
      sources: [],
    };
  }

  const sources = results.map(r => ({
    id: r.id.toString(),
    title: r.title,
    source: r.source,
    content: r.content.slice(0, 500),
    score: Number(r.score),
  }));

  const context = sources.map(s => `[${s.title}]: ${s.content}`).join('\n\n');

  const answer = await generateAnswer(query, context);

  return { answer, sources };
}

async function generateAnswer(query: string, context: string): Promise<string> {
  const apiKey = process.env['OPENAI_API_KEY'] || process.env['LLM_API_KEY'];
  if (!apiKey) {
    return `Based on the available policy documents:\n\n${context}\n\n(Configure LLM_API_KEY for synthesized answers)`;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a policy expert for a subscription billing company. Answer the user question based only on the provided context. If the context does not contain enough information, say so. Be concise and cite sources.',
          },
          {
            role: 'user',
            content: `Question: ${query}\n\nContext:\n${context}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content ?? 'Unable to generate answer';
  } catch (error) {
    console.error('Answer generation failed:', error);
    return `Based on the available policy documents:\n\n${context}\n\n(Error generating synthesized answer)`;
  }
}

export async function addKnowledgeDocument(
  title: string,
  source: string,
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const embedding = await generateEmbedding(content);

  await db.insert(knowledgeDocuments).values({
    title,
    source,
    content,
    metadata,
    embedding: embedding as any,
  } as any);
}
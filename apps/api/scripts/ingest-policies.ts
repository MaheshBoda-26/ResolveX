#!/usr/bin/env tsx
import 'dotenv/config';
import { readdir, readFile } from 'fs/promises';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { db } from '../db/client';
import { knowledgeDocuments } from '../db/schema';
import { generateEmbedding } from '../knowledge/embedding';
import { chunkText, TextChunk } from '../knowledge/chunk';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const POLICIES_DIR = join(__dirname, '..', 'data', 'policies');

interface PolicyDocument {
  title: string;
  source: string;
  content: string;
  metadata: Record<string, unknown>;
  chunks: TextChunk[];
}

async function loadPolicies(): Promise<PolicyDocument[]> {
  const files = await readdir(POLICIES_DIR);
  const markdownFiles = files.filter(f => f.endsWith('.md'));

  const policies: PolicyDocument[] = [];

  for (const file of markdownFiles) {
    const filePath = join(POLICIES_DIR, file);
    const content = await readFile(filePath, 'utf-8');

    const title = basename(file, '.md').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const chunks = chunkText(content, { maxTokens: 500, overlapTokens: 50 });

    policies.push({
      title,
      source: `policies/${file}`,
      content,
      metadata: {
        category: 'policy',
        file,
        chunkCount: chunks.length,
      },
      chunks,
    });

    console.log(`Loaded: ${file} (${chunks.length} chunks)`);
  }

  return policies;
}

async function generateChunkEmbeddings(policies: PolicyDocument[]): Promise<void> {
  for (const policy of policies) {
    for (const chunk of policy.chunks) {
      console.log(`  Generating embedding for "${policy.title}" chunk ${chunk.index + 1}/${policy.chunks.length}...`);
      const result = await generateEmbedding(chunk.text);
      (chunk as TextChunk & { embedding: number[] }).embedding = result.embedding;
    }
  }
}

async function ingestPolicies(): Promise<void> {
  console.log('Starting policy ingestion...');
  console.log(`Reading policies from: ${POLICIES_DIR}`);

  const policies = await loadPolicies();
  console.log(`Loaded ${policies.length} policy documents`);

  console.log('Generating embeddings...');
  await generateChunkEmbeddings(policies);

  console.log('Inserting into database...');
  let inserted = 0;

  for (const policy of policies) {
    for (const chunk of policy.chunks) {
      const chunkWithEmbedding = chunk as TextChunk & { embedding: number[] };

      await db.insert(knowledgeDocuments).values({
        title: `${policy.title} - Part ${chunk.index + 1}`,
        source: policy.source,
        content: chunk.text,
        metadata: {
          ...policy.metadata,
          chunkIndex: chunk.index,
          totalChunks: policy.chunks.length,
          startChar: chunk.startChar,
          endChar: chunk.endChar,
        },
        embedding: chunkWithEmbedding.embedding,
      }).onConflictDoNothing();

      inserted++;
    }
  }

  console.log(`Ingestion complete! Inserted ${inserted} chunks.`);
}

ingestPolicies()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Ingestion failed:', err);
    process.exit(1);
  });
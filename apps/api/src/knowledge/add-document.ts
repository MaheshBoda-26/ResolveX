import { db } from "../db/client";
import { knowledgeDocuments } from "../db/schema";
import { generateEmbedding } from "./embedding";
import { chunkText, TextChunk } from "./chunk";

export interface AddKnowledgeDocumentOptions {
  title: string;
  source: string;
  content: string;
  metadata?: Record<string, unknown>;
  chunk?: boolean;
  chunkOptions?: {
    maxTokens?: number;
    overlapTokens?: number;
  };
}

export async function addKnowledgeDocument(
  options: AddKnowledgeDocumentOptions,
): Promise<void> {
  const {
    title,
    source,
    content,
    metadata = {},
    chunk: shouldChunk = false,
    chunkOptions = {},
  } = options;

  if (shouldChunk) {
    const chunks: TextChunk[] = chunkText(content, {
      maxTokens: 500,
      overlapTokens: 50,
      ...chunkOptions,
    });
    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk.text);

      await db.insert(knowledgeDocuments).values({
        title: chunks.length > 1 ? `${title} (Part ${chunk.index + 1})` : title,
        source,
        content: chunk.text,
        metadata: {
          ...metadata,
          chunkIndex: chunk.index,
          totalChunks: chunks.length,
        },
        embedding: embedding.embedding as any,
      } as any);
    }
  } else {
    const embedding = await generateEmbedding(content);

    await db.insert(knowledgeDocuments).values({
      title,
      source,
      content,
      metadata,
      embedding: embedding.embedding as any,
    } as any);
  }
}

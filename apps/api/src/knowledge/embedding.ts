const EMBEDDING_DIMENSIONS = 1536;

export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
}

/**
 * Generate embeddings using OpenAI API or local model (Xenova/transformers.js)
 * Falls back to deterministic hash if neither is available
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const apiKey = process.env['OPENAI_API_KEY'] || process.env['EMBEDDING_API_KEY'];

  if (apiKey) {
    return generateOpenAIEmbedding(text, apiKey);
  }

  return generateLocalEmbedding(text);
}

async function generateOpenAIEmbedding(text: string, apiKey: string): Promise<EmbeddingResult> {
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
        encoding_format: 'float',
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data = await response.json() as { data: Array<{ embedding: number[] }>; usage: { total_tokens: number } };
    const embedding = data.data[0]?.embedding;
    return {
      embedding: embedding ?? new Array(EMBEDDING_DIMENSIONS).fill(0),
      tokens: data.usage?.total_tokens ?? estimateTokens(text),
    };
  } catch (error) {
    console.error('OpenAI embedding failed, falling back to local:', error);
    return generateLocalEmbedding(text);
  }
}

async function generateLocalEmbedding(text: string): Promise<EmbeddingResult> {
  try {
    const { pipeline } = await import('@xenova/transformers');

    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    const output = await extractor(text, { pooling: 'mean', normalize: true });

    const data = output.data;
    if (!data) {
      throw new Error('No embedding data returned');
    }

    return {
      embedding: Array.from(data) as number[],
      tokens: estimateTokens(text),
    };
  } catch (error) {
    console.warn('Local embedding failed, using hash fallback:', error);
    return hashEmbedding(text);
  }
}

function hashEmbedding(text: string): EmbeddingResult {
  const dim = 384;
  const embedding = new Float32Array(dim);

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }

  const rng = mulberry32(hash);
  for (let i = 0; i < dim; i++) {
    embedding[i] = (rng() - 0.5) * 2;
  }

  const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  const divisor = norm || 1;
  for (let i = 0; i < dim; i++) {
    embedding[i] = (embedding[i] ?? 0) / divisor;
  }

  return {
    embedding: Array.from(embedding),
    tokens: estimateTokens(text),
  };
}

function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have same dimensions');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    const v1 = vec1[i] ?? 0;
    const v2 = vec2[i] ?? 0;
    dotProduct += v1 * v2;
    norm1 += v1 * v1;
    norm2 += v2 * v2;
  }

  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}
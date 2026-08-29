import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchPolicies } from '../../../apps/api/src/knowledge/search';
import { db } from '../../../apps/api/src/db/client';
import { knowledgeDocuments } from '../../../apps/api/src/db/schema';

// Mock database with proper chaining
const createDbMock = () => {
  const mock = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  };
  return mock;
};

const mockDb = createDbMock();

vi.mock('../../../apps/api/src/db/client', () => ({
  db: mockDb,
  knowledgeDocuments: {},
}));

// Mock embedding for searchPolicies tests - use vi.hoisted for top-level access
const { mockGenerateEmbedding } = vi.hoisted(() => ({
  mockGenerateEmbedding: vi.fn(),
}));

vi.mock('../../../apps/api/src/knowledge/embedding', () => ({
  generateEmbedding: mockGenerateEmbedding,
}));

describe('Knowledge Search Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateEmbedding.mockReset();
    Object.assign(mockDb, createDbMock());
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('searchPolicies', () => {
    it('should call generateEmbedding with query', async () => {
      mockGenerateEmbedding.mockResolvedValue({
        embedding: [0.1, 0.2, 0.3],
        tokens: 10,
      });

      mockDb.limit.mockResolvedValue([]);

      await searchPolicies({ query: 'refund policy' });

      expect(mockGenerateEmbedding).toHaveBeenCalledWith('refund policy');
    });

    it('should filter by source when provided', async () => {
      mockGenerateEmbedding.mockResolvedValue({
        embedding: [0.1, 0.2, 0.3],
        tokens: 10,
      });

      mockDb.limit.mockResolvedValue([]);

      await searchPolicies({ query: 'refund', source: 'freshworks' });

      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should filter by type when provided', async () => {
      mockGenerateEmbedding.mockResolvedValue({
        embedding: [0.1, 0.2, 0.3],
        tokens: 10,
      });

      mockDb.limit.mockResolvedValue([]);

      await searchPolicies({ query: 'refund', type: 'policy' });

      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should filter results by minSimilarity', async () => {
      mockGenerateEmbedding.mockResolvedValue({
        embedding: [0.1, 0.2, 0.3],
        tokens: 10,
      });

      const mockResults = [
        { id: 1, title: 'Doc 1', source: 'freshworks', content: 'Content 1', metadata: { type: 'policy' }, similarity: 0.5 },
        { id: 2, title: 'Doc 2', source: 'freshworks', content: 'Content 2', metadata: { type: 'policy' }, similarity: 0.2 },
      ];

      mockDb.limit.mockResolvedValue(mockResults);

      const results = await searchPolicies({ query: 'refund', minSimilarity: 0.3 });

      expect(results.length).toBe(1);
      expect(results[0].similarity).toBe(0.5);
    });

    it('should respect limit parameter', async () => {
      mockGenerateEmbedding.mockResolvedValue({
        embedding: [0.1, 0.2, 0.3],
        tokens: 10,
      });

      const mockResults = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        title: `Doc ${i + 1}`,
        source: 'freshworks',
        content: `Content ${i + 1}`,
        metadata: { type: 'policy' },
        similarity: 0.5 + i * 0.01,
      }));

      mockDb.limit.mockResolvedValue(mockResults);

      const results = await searchPolicies({ query: 'refund', limit: 3 });

      expect(results.length).toBe(3);
      expect(mockDb.limit).toHaveBeenCalledWith(3);
    });

    it('should return empty array when no results', async () => {
      mockGenerateEmbedding.mockResolvedValue({
        embedding: [0.1, 0.2, 0.3],
        tokens: 10,
      });

      mockDb.limit.mockResolvedValue([]);

      const results = await searchPolicies({ query: 'nonexistent' });

      expect(results).toEqual([]);
    });

    it('should map results to PolicySearchResult format', async () => {
      mockGenerateEmbedding.mockResolvedValue({
        embedding: [0.1, 0.2, 0.3],
        tokens: 10,
      });

      const mockResults = [
        {
          id: 1,
          title: 'Refund Policy',
          source: 'freshworks',
          content: 'Refunds are processed within 5-7 days',
          metadata: { type: 'policy', version: '1.0' },
          similarity: 0.85,
        },
      ];

      mockDb.limit.mockResolvedValue(mockResults);

      const results = await searchPolicies({ query: 'refund' });

      expect(results[0]).toEqual({
        id: '1',
        title: 'Refund Policy',
        source: 'freshworks',
        content: 'Refunds are processed within 5-7 days',
        metadata: { type: 'policy', version: '1.0' },
        similarity: 0.85,
      });
    });
  });
});

// Test the actual embedding functions - no mocking
describe('Embedding Functions (Real Implementation)', () => {
  beforeEach(() => {
    vi.unmock('../../../apps/api/src/knowledge/embedding');
  });

  afterEach(() => {
    vi.doMock('../../../apps/api/src/knowledge/embedding', () => ({
      generateEmbedding: vi.fn(),
      cosineSimilarity: vi.fn(),
      clearEmbeddingCache: vi.fn(),
      getEmbeddingCacheStats: vi.fn(),
    }));
  });

  describe('generateEmbedding', () => {
    it('should use hash fallback when no API key', async () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.EMBEDDING_API_KEY;

      const { generateEmbedding } = await import('../../../apps/api/src/knowledge/embedding');
      const result = await generateEmbedding('test query');

      expect(result.embedding).toBeDefined();
      expect(result.embedding.length).toBe(384);
      expect(result.tokens).toBeGreaterThan(0);
    });

    it('should return normalized embeddings', async () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.EMBEDDING_API_KEY;

      const { generateEmbedding } = await import('../../../apps/api/src/knowledge/embedding');
      const result = await generateEmbedding('test query');

      // Check normalization (vector magnitude should be 1)
      const magnitude = Math.sqrt(result.embedding.reduce((sum, v) => sum + v * v, 0));
      expect(magnitude).toBeCloseTo(1, 5);
    });

    it('should cache results', async () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.EMBEDDING_API_KEY;

      const { generateEmbedding, getEmbeddingCacheStats, clearEmbeddingCache } = await import('../../../apps/api/src/knowledge/embedding');
      clearEmbeddingCache();

      await generateEmbedding('test query');
      const stats1 = getEmbeddingCacheStats();

      await generateEmbedding('test query'); // Second call should use cache
      const stats2 = getEmbeddingCacheStats();

      expect(stats2.size).toBe(stats1.size);
    });
  });

  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', async () => {
      const { cosineSimilarity } = await import('../../../apps/api/src/knowledge/embedding');
      const vec = [0.1, 0.2, 0.3, 0.4];
      const similarity = cosineSimilarity(vec, vec);
      expect(similarity).toBeCloseTo(1, 5);
    });

    it('should return -1 for opposite vectors', async () => {
      const { cosineSimilarity } = await import('../../../apps/api/src/knowledge/embedding');
      const vec1 = [1, 0, 0];
      const vec2 = [-1, 0, 0];
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(-1, 5);
    });

    it('should return 0 for orthogonal vectors', async () => {
      const { cosineSimilarity } = await import('../../../apps/api/src/knowledge/embedding');
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(0, 5);
    });

    it('should throw for mismatched dimensions', async () => {
      const { cosineSimilarity } = await import('../../../apps/api/src/knowledge/embedding');
      expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow('Vectors must have same dimensions');
    });

    it('should handle zero vectors', async () => {
      const { cosineSimilarity } = await import('../../../apps/api/src/knowledge/embedding');
      const vec1 = [0, 0, 0];
      const vec2 = [1, 2, 3];
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBe(0);
    });
  });

  describe('Cache utilities', () => {
    it('should clear cache', async () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.EMBEDDING_API_KEY;

      const { generateEmbedding, getEmbeddingCacheStats, clearEmbeddingCache } = await import('../../../apps/api/src/knowledge/embedding');
      clearEmbeddingCache();

      await generateEmbedding('test query');
      expect(getEmbeddingCacheStats().size).toBeGreaterThan(0);

      clearEmbeddingCache();
      expect(getEmbeddingCacheStats().size).toBe(0);
    });

    it('should return cache stats', async () => {
      const { getEmbeddingCacheStats } = await import('../../../apps/api/src/knowledge/embedding');
      const stats = getEmbeddingCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
    });
  });
});
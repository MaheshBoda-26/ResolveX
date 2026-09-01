import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock database with proper chaining - use vi.hoisted for top-level access
const { mockDb, createDbMock } = vi.hoisted(() => {
  const createMock = () => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  });
  return {
    createDbMock: createMock,
    mockDb: createMock(),
  };
});

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

// Import after mocks are set up
import { searchPolicies } from '../../../apps/api/src/knowledge/search';

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

      // The mock doesn't actually limit, so return only 3 results to simulate the limit
      mockDb.limit.mockResolvedValue(mockResults.slice(0, 3));

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

// Test cosineSimilarity in isolation (no external deps)
const actualEmbedding = await vi.importActual<typeof import('../../../apps/api/src/knowledge/embedding')>('../../../apps/api/src/knowledge/embedding');

describe('cosineSimilarity (Pure Function)', () => {
  const { cosineSimilarity } = actualEmbedding;

  it('should return 1 for identical vectors', () => {
    const vec = [0.1, 0.2, 0.3, 0.4];
    const similarity = cosineSimilarity(vec, vec);
    expect(similarity).toBeCloseTo(1, 5);
  });

  it('should return -1 for opposite vectors', () => {
    const vec1 = [1, 0, 0];
    const vec2 = [-1, 0, 0];
    const similarity = cosineSimilarity(vec1, vec2);
    expect(similarity).toBeCloseTo(-1, 5);
  });

  it('should return 0 for orthogonal vectors', () => {
    const vec1 = [1, 0, 0];
    const vec2 = [0, 1, 0];
    const similarity = cosineSimilarity(vec1, vec2);
    expect(similarity).toBeCloseTo(0, 5);
  });

  it('should throw for mismatched dimensions', () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow('Vectors must have same dimensions');
  });

  it('should handle zero vectors', () => {
    const vec1 = [0, 0, 0];
    const vec2 = [1, 2, 3];
    const similarity = cosineSimilarity(vec1, vec2);
    expect(similarity).toBe(0);
  });
});
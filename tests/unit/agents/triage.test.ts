import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatRequest, TriageResult, Intent, Task } from '@resolvex/shared';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Triage Agent Unit Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('fallbackTriage', () => {
    it('should detect billing intent from keywords', async () => {
      const { fallbackTriage } = await import('../../../apps/api/src/agents/triage');
      const result = fallbackTriage('I was charged twice for my subscription');

      expect(result.intents.length).toBeGreaterThanOrEqual(1);
      const billingIntent = result.intents.find((i: Intent) => i.type === 'billing');
      expect(billingIntent).toBeDefined();
      expect(billingIntent?.confidence).toBe(0.7);
    });

    it('should detect subscription intent from keywords', async () => {
      const { fallbackTriage } = await import('../../../apps/api/src/agents/triage');
      const result = fallbackTriage('I want to upgrade my plan to premium');

      expect(result.intents.length).toBeGreaterThanOrEqual(1);
      const subscriptionIntent = result.intents.find((i: Intent) => i.type === 'subscription');
      expect(subscriptionIntent).toBeDefined();
      expect(subscriptionIntent?.confidence).toBe(0.7);
    });

    it('should detect both billing and subscription intents', async () => {
      const { fallbackTriage } = await import('../../../apps/api/src/agents/triage');
      const result = fallbackTriage('I was charged twice and want to upgrade');

      const intentTypes = result.intents.map((i: Intent) => i.type);
      expect(intentTypes).toContain('billing');
      expect(intentTypes).toContain('subscription');
    });

    it('should create billing task with correct structure', async () => {
      const { fallbackTriage } = await import('../../../apps/api/src/agents/triage');
      const result = fallbackTriage('I was charged twice for my subscription');

      const billingTask = result.tasks.find((t: Task) => t.agent === 'billing');
      expect(billingTask).toBeDefined();
      expect(billingTask?.type).toBe('investigate_billing_issue');
      expect(billingTask?.payload).toEqual({ message: 'I was charged twice for my subscription' });
      expect(billingTask?.priority).toBe('normal');
      expect(billingTask?.id).toBeDefined();
    });

    it('should create subscription task with correct structure', async () => {
      const { fallbackTriage } = await import('../../../apps/api/src/agents/triage');
      const result = fallbackTriage('I want to upgrade my plan to premium');

      const subscriptionTask = result.tasks.find((t: Task) => t.agent === 'subscription');
      expect(subscriptionTask).toBeDefined();
      expect(subscriptionTask?.type).toBe('investigate_subscription_issue');
      expect(subscriptionTask?.payload).toEqual({ message: 'I want to upgrade my plan to premium' });
      expect(subscriptionTask?.priority).toBe('normal');
      expect(subscriptionTask?.id).toBeDefined();
    });

    it('should return general intent when no keywords match', async () => {
      const { fallbackTriage } = await import('../../../apps/api/src/agents/triage');
      const result = fallbackTriage('Hello, how are you?');

      expect(result.intents.length).toBe(1);
      expect(result.intents[0].type).toBe('general');
      expect(result.intents[0].confidence).toBe(0.5);
      expect(result.tasks.length).toBe(0);
    });

    it('should include summary in result', async () => {
      const { fallbackTriage } = await import('../../../apps/api/src/agents/triage');
      const result = fallbackTriage('Test message');
      expect(result.summary).toContain('Triage analysis for: Test message');
    });
  });

  describe('callFreshworksTriage', () => {
    it('should return null when credentials not configured', async () => {
      process.env.FRESHWORKS_DOMAIN = '';
      process.env.FRESHWORKS_API_KEY = '';
      process.env.FRESHWORKS_AGENT_STUDIO_URL = '';

      const { callFreshworksTriage } = await import('../../../apps/api/src/agents/triage');
      const result = await callFreshworksTriage('Test message');
      expect(result).toBeNull();
    });

    it('should call Freshworks API when credentials configured', async () => {
      process.env.FRESHWORKS_DOMAIN = 'test-domain';
      process.env.FRESHWORKS_API_KEY = 'test-key';
      process.env.FRESHWORKS_AGENT_STUDIO_URL = 'https://test.freshworks.com';

      const mockResponse = {
        intents: [{ name: 'billing', confidence: 0.9, entities: {} }],
        tasks: [{ agent: 'billing', type: 'refund', payload: {}, priority: 'high' }],
        summary: 'Test summary',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { callFreshworksTriage } = await import('../../../apps/api/src/agents/triage');
      const result = await callFreshworksTriage('Test message');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.freshworks.com/api/triage',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ message: 'Test message' }),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should return null on API error', async () => {
      process.env.FRESHWORKS_DOMAIN = 'test-domain';
      process.env.FRESHWORKS_API_KEY = 'test-key';
      process.env.FRESHWORKS_AGENT_STUDIO_URL = 'https://test.freshworks.com';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const { callFreshworksTriage } = await import('../../../apps/api/src/agents/triage');
      const result = await callFreshworksTriage('Test message');
      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      process.env.FRESHWORKS_DOMAIN = 'test-domain';
      process.env.FRESHWORKS_API_KEY = 'test-key';
      process.env.FRESHWORKS_AGENT_STUDIO_URL = 'https://test.freshworks.com';

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { callFreshworksTriage } = await import('../../../apps/api/src/agents/triage');
      const result = await callFreshworksTriage('Test message');
      expect(result).toBeNull();
    });

    it('should timeout after 10 seconds', async () => {
      process.env.FRESHWORKS_DOMAIN = 'test-domain';
      process.env.FRESHWORKS_API_KEY = 'test-key';
      process.env.FRESHWORKS_AGENT_STUDIO_URL = 'https://test.freshworks.com';

      mockFetch.mockImplementationOnce(() => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 11000);
      }));

      const { callFreshworksTriage } = await import('../../../apps/api/src/agents/triage');
      const result = await callFreshworksTriage('Test message');
      expect(result).toBeNull();
    });
  });

  describe('triageMessage', () => {
    const mockRequest: ChatRequest = {
      message: 'I was charged twice and want to upgrade',
      conversationId: 'conv-123',
      customerId: 'cust-123',
      channel: 'chat',
    };

    it('should use Freshworks when API returns valid response', async () => {
      process.env.FRESHWORKS_DOMAIN = 'test-domain';
      process.env.FRESHWORKS_API_KEY = 'test-key';
      process.env.FRESHWORKS_AGENT_STUDIO_URL = 'https://test.freshworks.com';

      const freshworksResponse = {
        intents: [
          { name: 'billing', confidence: 0.9, entities: {} },
          { name: 'subscription_upgrade', confidence: 0.85, entities: { plan: 'pro' } },
        ],
        tasks: [
          { agent: 'billing', type: 'refund_investigation', payload: { message: mockRequest.message }, priority: 'high' },
          { agent: 'subscription', type: 'upgrade', payload: { message: mockRequest.message, planId: 'pro' }, priority: 'normal' },
        ],
        summary: 'Billing and subscription detected',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => freshworksResponse,
      });

      const { triageMessage } = await import('../../../apps/api/src/agents/triage');
      const result = await triageMessage(mockRequest);

      expect(result.intents.length).toBe(2);
      expect(result.intents[0].type).toBe('billing');
      expect(result.intents[0].confidence).toBe(0.9);
      expect(result.intents[1].type).toBe('subscription');

      expect(result.tasks.length).toBe(2);
      expect(result.tasks[0].agent).toBe('billing');
      expect(result.tasks[1].agent).toBe('subscription');
    });

    it('should fallback to keyword-based triage when Freshworks unavailable', async () => {
      process.env.FRESHWORKS_DOMAIN = 'test-domain';
      process.env.FRESHWORKS_API_KEY = 'test-key';
      process.env.FRESHWORKS_AGENT_STUDIO_URL = 'https://test.freshworks.com';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const { triageMessage } = await import('../../../apps/api/src/agents/triage');
      const result = await triageMessage(mockRequest);

      // Should use fallback
      expect(result.intents.length).toBeGreaterThanOrEqual(2);
      const intentTypes = result.intents.map((i: Intent) => i.type);
      expect(intentTypes).toContain('billing');
      expect(intentTypes).toContain('subscription');
    });

    it('should map Freshworks intents to correct types', async () => {
      process.env.FRESHWORKS_DOMAIN = 'test-domain';
      process.env.FRESHWORKS_API_KEY = 'test-key';
      process.env.FRESHWORKS_AGENT_STUDIO_URL = 'https://test.freshworks.com';

      const freshworksResponse = {
        intents: [
          { name: 'payment_issue', confidence: 0.9, entities: {} },
          { name: 'plan_change', confidence: 0.8, entities: {} },
        ],
        tasks: [
          { agent: 'billing_agent', type: 'investigate', payload: {}, priority: 'high' },
          { agent: 'subscription_agent', type: 'modify', payload: {}, priority: 'normal' },
        ],
        summary: 'Test',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => freshworksResponse,
      });

      const { triageMessage } = await import('../../../apps/api/src/agents/triage');
      const result = await triageMessage(mockRequest);

      expect(result.intents[0].type).toBe('billing');
      expect(result.intents[1].type).toBe('subscription');
      expect(result.tasks[0].agent).toBe('billing');
      expect(result.tasks[1].agent).toBe('subscription');
      expect(result.tasks[0].priority).toBe('high');
      expect(result.tasks[1].priority).toBe('normal');
    });

    it('should generate unique task IDs', async () => {
      process.env.FRESHWORKS_DOMAIN = '';
      process.env.FRESHWORKS_API_KEY = '';
      process.env.FRESHWORKS_AGENT_STUDIO_URL = '';

      const { triageMessage } = await import('../../../apps/api/src/agents/triage');
      const result = await triageMessage(mockRequest);

      const taskIds = result.tasks.map((t: Task) => t.id);
      const uniqueIds = new Set(taskIds);
      expect(uniqueIds.size).toBe(taskIds.length);
    });
  });
});
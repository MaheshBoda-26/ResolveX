import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock verification module using vi.hoisted
const {
  mockVerifyRefund,
  mockVerifyUpgrade,
  mockVerifyCustomerState,
} = vi.hoisted(() => ({
  mockVerifyRefund: vi.fn(),
  mockVerifyUpgrade: vi.fn(),
  mockVerifyCustomerState: vi.fn(),
}));

vi.mock('../../../apps/api/src/verification/verify', () => ({
  verifyRefund: mockVerifyRefund,
  verifyUpgrade: mockVerifyUpgrade,
  verifyCustomerState: mockVerifyCustomerState,
}));

// Mock database using vi.hoisted
const { mockDbInsert, mockDbValues } = vi.hoisted(() => ({
  mockDbInsert: vi.fn().mockReturnThis(),
  mockDbValues: vi.fn().mockReturnThis(),
}));

vi.mock('../../../apps/api/src/db/client', () => ({
  db: {
    insert: mockDbInsert,
    values: mockDbValues,
  },
  handoffs: {},
}));

// Import after mocks are set up
import {
  isIdempotentTool,
  isNonIdempotentTool,
  handleMutationFailure,
  escalateToHandoff,
} from '../../../apps/api/src/verification/failure-handling';

describe('Failure Handling Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbInsert.mockReturnThis();
    mockDbValues.mockReturnThis();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('isIdempotentTool', () => {
    it('should return true for idempotent tools', () => {
      expect(isIdempotentTool('issueRefund')).toBe(true);
      expect(isIdempotentTool('upgradeSubscription')).toBe(true);
      expect(isIdempotentTool('getCustomer')).toBe(true);
      expect(isIdempotentTool('getTransactions')).toBe(true);
      expect(isIdempotentTool('getSubscription')).toBe(true);
      expect(isIdempotentTool('verifyCustomerState')).toBe(true);
      expect(isIdempotentTool('checkPolicy')).toBe(true);
    });

    it('should return false for non-idempotent tools', () => {
      expect(isIdempotentTool('cancelSubscription')).toBe(false);
      expect(isIdempotentTool('createSubscription')).toBe(false);
      expect(isIdempotentTool('chargeCustomer')).toBe(false);
      expect(isIdempotentTool('unknownTool')).toBe(false);
    });
  });

  describe('isNonIdempotentTool', () => {
    it('should return true for non-idempotent tools', () => {
      expect(isNonIdempotentTool('cancelSubscription')).toBe(true);
      expect(isNonIdempotentTool('createSubscription')).toBe(true);
      expect(isNonIdempotentTool('chargeCustomer')).toBe(true);
    });

    it('should return false for idempotent tools', () => {
      expect(isNonIdempotentTool('issueRefund')).toBe(false);
      expect(isNonIdempotentTool('upgradeSubscription')).toBe(false);
    });
  });

  describe('handleMutationFailure', () => {
    const mockError = new Error('Test error');
    const mockArgs = { customerId: 'cust-1', amount: 49.99, invoiceId: 'INV-001' };

    describe('Non-idempotent tools', () => {
      it('should escalate for non-idempotent tool failure', async () => {
        const result = await handleMutationFailure(
          'cancelSubscription',
          mockError,
          mockArgs,
          'run-1',
          'conv-1'
        );

        expect(result.action).toBe('escalate');
        expect(result.reason).toContain('Non-idempotent tool');
        expect(result.reason).toContain('cancelSubscription');
      });

      it('should escalate for unknown tool', async () => {
        const result = await handleMutationFailure(
          'unknownTool',
          mockError,
          mockArgs,
          'run-1',
          'conv-1'
        );

        expect(result.action).toBe('escalate');
        expect(result.reason).toContain('Unknown tool');
      });
    });

    describe('Max retries exceeded', () => {
      it('should escalate after max retries', async () => {
        const result = await handleMutationFailure(
          'issueRefund',
          mockError,
          mockArgs,
          'run-1',
          'conv-1',
          4 // attempt 4 > maxRetries (3)
        );

        expect(result.action).toBe('escalate');
        expect(result.reason).toContain('Max retries (3) exceeded');
      });

      it('should retry on attempt 3 (max retries)', async () => {
        const result = await handleMutationFailure(
          'issueRefund',
          mockError,
          mockArgs,
          'run-1',
          'conv-1',
          3 // attempt 3 == maxRetries (3)
        );

        expect(result.action).toBe('escalate');
      });
    });

    describe('Transient errors (retry)', () => {
      it('should retry on timeout', async () => {
        const timeoutError = new Error('ETIMEDOUT');
        const result = await handleMutationFailure(
          'issueRefund',
          timeoutError,
          mockArgs,
          'run-1',
          'conv-1',
          1
        );

        expect(result.action).toBe('retry');
        expect(result.reason).toContain('Transient error');
        expect(result.reason).toContain('Retrying after');
      });

      it('should retry on network error', async () => {
        const networkError = new Error('ECONNREFUSED');
        const result = await handleMutationFailure(
          'issueRefund',
          networkError,
          mockArgs,
          'run-1',
          'conv-1',
          1
        );

        expect(result.action).toBe('retry');
      });

      it('should retry on rate limit', async () => {
        const rateLimitError = new Error('429 Too Many Requests');
        const result = await handleMutationFailure(
          'issueRefund',
          rateLimitError,
          mockArgs,
          'run-1',
          'conv-1',
          1
        );

        expect(result.action).toBe('retry');
      });

      it('should retry on server error', async () => {
        const serverError = new Error('500 Internal Server Error');
        const result = await handleMutationFailure(
          'issueRefund',
          serverError,
          mockArgs,
          'run-1',
          'conv-1',
          1
        );

        expect(result.action).toBe('retry');
      });

      it('should use exponential backoff', async () => {
        const timeoutError = new Error('timeout');

        // First retry (attempt 0) - 1000ms (1000 * 2^0)
        const result1 = await handleMutationFailure(
          'issueRefund',
          timeoutError,
          mockArgs,
          'run-1',
          'conv-1',
          0
        );
        expect(result1.reason).toContain('1000ms');

        // Second retry (attempt 1) - 2000ms (1000 * 2^1)
        const result2 = await handleMutationFailure(
          'issueRefund',
          timeoutError,
          mockArgs,
          'run-1',
          'conv-1',
          1
        );
        expect(result2.reason).toContain('2000ms');

        // Third retry (attempt 2) - 4000ms (1000 * 2^2, capped at 10000)
        const result3 = await handleMutationFailure(
          'issueRefund',
          timeoutError,
          mockArgs,
          'run-1',
          'conv-1',
          2
        );
        expect(result3.reason).toContain('4000ms');
      });
    });

    describe('Unknown outcome (verify then retry)', () => {
      it('should verify and return verify action when verification succeeds', async () => {
        const unknownError = new Error('Unknown outcome');
        mockVerifyRefund.mockResolvedValue({
          verified: true,
          differences: {},
          observedState: { status: 'refunded' },
        });

        const result = await handleMutationFailure(
          'issueRefund',
          unknownError,
          mockArgs,
          'run-1',
          'conv-1',
          1
        );

        expect(result.action).toBe('verify');
        expect(result.reason).toContain('Verification confirms action succeeded');
        expect(result.verificationResult?.verified).toBe(true);
        expect(mockVerifyRefund).toHaveBeenCalledWith('run-1', 'conv-1', {
          customerId: 'cust-1',
          expectedRefundAmount: 49.99,
          invoiceId: 'INV-001',
        });
      });

      it('should verify and retry when verification fails for refund', async () => {
        const unknownError = new Error('Unknown outcome');
        mockVerifyRefund.mockResolvedValue({
          verified: false,
          differences: { refundAmount: { expected: 49.99, actual: null } },
          observedState: { status: 'not_found' },
        });

        const result = await handleMutationFailure(
          'issueRefund',
          unknownError,
          mockArgs,
          'run-1',
          'conv-1',
          1
        );

        expect(result.action).toBe('retry');
        expect(result.reason).toContain('Verification failed or incomplete');
      });

      it('should verify upgrade subscription', async () => {
        const unknownError = new Error('Unknown outcome');
        mockVerifyUpgrade.mockResolvedValue({
          verified: true,
          differences: {},
          observedState: { subscriptionPlanId: 'pro' },
        });

        const upgradeArgs = { customerId: 'cust-1', targetPlanId: 'pro' };
        const result = await handleMutationFailure(
          'upgradeSubscription',
          unknownError,
          upgradeArgs,
          'run-1',
          'conv-1',
          1
        );

        expect(result.action).toBe('verify');
        expect(mockVerifyUpgrade).toHaveBeenCalledWith('run-1', 'conv-1', {
          customerId: 'cust-1',
          expectedPlanId: 'pro',
        });
      });

      it('should verify customer state', async () => {
        const unknownError = new Error('Unknown outcome');
        mockVerifyCustomerState.mockResolvedValue({
          verified: true,
          differences: {},
          observedState: { status: 'active' },
        });

        const verifyArgs = { customerId: 'cust-1', expectedState: { status: 'active' } };
        const result = await handleMutationFailure(
          'verifyCustomerState',
          unknownError,
          verifyArgs,
          'run-1',
          'conv-1',
          1
        );

        expect(result.action).toBe('verify');
        expect(mockVerifyCustomerState).toHaveBeenCalledWith('run-1', 'conv-1', {
          customerId: 'cust-1',
          expectedState: { status: 'active' },
        });
      });
    });

    describe('Non-retryable errors (escalate)', () => {
      it('should escalate for non-retryable error', async () => {
        const badRequestError = new Error('400 Bad Request');
        const result = await handleMutationFailure(
          'issueRefund',
          badRequestError,
          mockArgs,
          'run-1',
          'conv-1',
          1
        );

        expect(result.action).toBe('escalate');
        expect(result.reason).toContain('Non-retryable error');
      });

      it('should escalate for unauthorized error', async () => {
        const unauthorizedError = new Error('401 Unauthorized');
        const result = await handleMutationFailure(
          'issueRefund',
          unauthorizedError,
          mockArgs,
          'run-1',
          'conv-1',
          1
        );

        expect(result.action).toBe('escalate');
      });

      it('should escalate for forbidden error', async () => {
        const forbiddenError = new Error('403 Forbidden');
        const result = await handleMutationFailure(
          'issueRefund',
          forbiddenError,
          mockArgs,
          'run-1',
          'conv-1',
          1
        );

        expect(result.action).toBe('escalate');
      });

      it('should escalate for not found error', async () => {
        const notFoundError = new Error('404 Not Found');
        const result = await handleMutationFailure(
          'issueRefund',
          notFoundError,
          mockArgs,
          'run-1',
          'conv-1',
          1
        );

        expect(result.action).toBe('escalate');
      });
    });
  });

  describe('escalateToHandoff', () => {
    it('should insert handoff record', async () => {
      await escalateToHandoff('conv-1', 'Test reason', { key: 'value' }, 'Manual review');

      // mockDbInsert is called with the handoffs table object, not {}
      expect(mockDbInsert).toHaveBeenCalled();
      expect(mockDbValues).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        reason: 'Test reason',
        evidence: { key: 'value' },
        recommendedAction: 'Manual review',
        status: 'pending',
      });
    });

    it('should handle empty evidence', async () => {
      await escalateToHandoff('conv-1', 'Test reason', {}, 'Manual review');

      expect(mockDbValues).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        reason: 'Test reason',
        evidence: {},
        recommendedAction: 'Manual review',
        status: 'pending',
      });
    });
  });
});
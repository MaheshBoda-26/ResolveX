import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyRefund, verifyUpgrade, verifyCustomerState, getVerificationHistory } from '../../../apps/api/src/verification/verify';

// Mock the database - declare mocks at top level for hoisting
const mockDbInsert = vi.fn().mockReturnThis();
const mockDbValues = vi.fn().mockReturnThis();
const mockDbSelect = vi.fn().mockReturnThis();
const mockDbFrom = vi.fn().mockReturnThis();
const mockDbWhere = vi.fn().mockReturnThis();
const mockDbOrderBy = vi.fn().mockReturnThis();

vi.mock('../../../apps/api/src/db/client', () => ({
  db: {
    insert: mockDbInsert,
    values: mockDbValues,
    select: mockDbSelect,
    from: mockDbFrom,
    where: mockDbWhere,
    orderBy: mockDbOrderBy,
  },
  verifications: {},
  toolCalls: {},
}));

// Mock Freshworks functions
vi.mock('../../../apps/api/src/actions/freshworks', () => ({
  getCustomer: vi.fn(),
  getTransactions: vi.fn(),
  getSubscription: vi.fn(),
  verifyCustomerState: vi.fn(),
}));

import { getCustomer, getTransactions, getSubscription, verifyCustomerState as freshworksVerifyCustomerState } from '../../../apps/api/src/actions/freshworks';

describe('Verification Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbInsert.mockReturnThis();
    mockDbValues.mockReturnThis();
    mockDbSelect.mockReturnThis();
    mockDbFrom.mockReturnThis();
    mockDbWhere.mockReturnThis();
    mockDbOrderBy.mockReturnThis();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('verifyRefund', () => {
    it('should return verified when refund transaction found with correct amount', async () => {
      const mockTransactions = [
        {
          id: 'tx-1',
          customerId: 'cust-1',
          invoiceId: 'INV-001',
          amount: 49.99,
          currency: 'USD',
          status: 'refunded',
          chargedAt: new Date().toISOString(),
          metadata: {},
        },
      ];

      (getTransactions as any).mockResolvedValue(mockTransactions);

      const result = await verifyRefund('run-1', 'conv-1', {
        customerId: 'cust-1',
        expectedRefundAmount: 49.99,
        invoiceId: 'INV-001',
      });

      expect(result.verified).toBe(true);
      expect(result.differences).toEqual({});
      expect(result.observedState).toMatchObject({
        invoiceId: 'INV-001',
        refundAmount: 49.99,
        status: 'refunded',
      });

      // Verify database insert was called
      expect(mockDbInsert).toHaveBeenCalled();
    });

    it('should return mismatch when refund amount differs', async () => {
      const mockTransactions = [
        {
          id: 'tx-1',
          customerId: 'cust-1',
          invoiceId: 'INV-001',
          amount: 39.99, // Different amount
          currency: 'USD',
          status: 'refunded',
          chargedAt: new Date().toISOString(),
          metadata: {},
        },
      ];

      (getTransactions as any).mockResolvedValue(mockTransactions);

      const result = await verifyRefund('run-1', 'conv-1', {
        customerId: 'cust-1',
        expectedRefundAmount: 49.99,
        invoiceId: 'INV-001',
      });

      expect(result.verified).toBe(false);
      expect(result.differences).toHaveProperty('refundAmount');
      expect(result.differences.refundAmount).toEqual({
        expected: 49.99,
        actual: 39.99,
      });
    });

    it('should return mismatch when refund status is not refunded', async () => {
      const mockTransactions = [
        {
          id: 'tx-1',
          customerId: 'cust-1',
          invoiceId: 'INV-001',
          amount: 49.99,
          currency: 'USD',
          status: 'completed', // Not refunded
          chargedAt: new Date().toISOString(),
          metadata: {},
        },
      ];

      (getTransactions as any).mockResolvedValue(mockTransactions);

      const result = await verifyRefund('run-1', 'conv-1', {
        customerId: 'cust-1',
        expectedRefundAmount: 49.99,
        invoiceId: 'INV-001',
      });

      expect(result.verified).toBe(false);
      expect(result.differences).toHaveProperty('status');
      expect(result.differences.status).toEqual({
        expected: 'refunded',
        actual: 'completed',
      });
    });

    it('should return mismatch when refund transaction not found', async () => {
      (getTransactions as any).mockResolvedValue([]);

      const result = await verifyRefund('run-1', 'conv-1', {
        customerId: 'cust-1',
        expectedRefundAmount: 49.99,
        invoiceId: 'INV-001',
      });

      expect(result.verified).toBe(false);
      expect(result.differences).toHaveProperty('refundAmount');
      expect(result.differences).toHaveProperty('status');
      expect(result.differences.refundAmount.actual).toBeNull();
      expect(result.differences.status.actual).toBe('not_found');
    });

    it('should throw and record failure on error', async () => {
      (getTransactions as any).mockRejectedValue(new Error('Database error'));

      await expect(verifyRefund('run-1', 'conv-1', {
        customerId: 'cust-1',
        expectedRefundAmount: 49.99,
        invoiceId: 'INV-001',
      })).rejects.toThrow('Database error');

      // Verify failure was recorded
      expect(mockDbInsert).toHaveBeenCalled();
    });
  });

  describe('verifyUpgrade', () => {
    it('should return verified when subscription and customer plan match', async () => {
      const mockSubscription = {
        id: 'sub-1',
        customerId: 'cust-1',
        planId: 'pro',
        status: 'active',
        price: 99.99,
        renewalAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockCustomer = {
        id: 'cust-1',
        name: 'Test User',
        email: 'test@example.com',
        planId: 'pro',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (getSubscription as any).mockResolvedValue(mockSubscription);
      (getCustomer as any).mockResolvedValue(mockCustomer);

      const result = await verifyUpgrade('run-1', 'conv-1', {
        customerId: 'cust-1',
        expectedPlanId: 'pro',
      });

      expect(result.verified).toBe(true);
      expect(result.differences).toEqual({});
      expect(result.observedState).toMatchObject({
        customerPlanId: 'pro',
        subscriptionPlanId: 'pro',
      });
    });

    it('should return mismatch when customer plan differs', async () => {
      const mockSubscription = {
        id: 'sub-1',
        customerId: 'cust-1',
        planId: 'pro',
        status: 'active',
        price: 99.99,
        renewalAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockCustomer = {
        id: 'cust-1',
        name: 'Test User',
        email: 'test@example.com',
        planId: 'basic', // Different plan
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (getSubscription as any).mockResolvedValue(mockSubscription);
      (getCustomer as any).mockResolvedValue(mockCustomer);

      const result = await verifyUpgrade('run-1', 'conv-1', {
        customerId: 'cust-1',
        expectedPlanId: 'pro',
      });

      expect(result.verified).toBe(false);
      expect(result.differences).toHaveProperty('customerPlanId');
      expect(result.differences.customerPlanId).toEqual({
        expected: 'pro',
        actual: 'basic',
      });
    });

    it('should return mismatch when subscription plan differs', async () => {
      const mockSubscription = {
        id: 'sub-1',
        customerId: 'cust-1',
        planId: 'basic', // Different plan
        status: 'active',
        price: 49.99,
        renewalAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockCustomer = {
        id: 'cust-1',
        name: 'Test User',
        email: 'test@example.com',
        planId: 'pro',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (getSubscription as any).mockResolvedValue(mockSubscription);
      (getCustomer as any).mockResolvedValue(mockCustomer);

      const result = await verifyUpgrade('run-1', 'conv-1', {
        customerId: 'cust-1',
        expectedPlanId: 'pro',
      });

      expect(result.verified).toBe(false);
      expect(result.differences).toHaveProperty('subscriptionPlanId');
      expect(result.differences.subscriptionPlanId).toEqual({
        expected: 'pro',
        actual: 'basic',
      });
    });

    it('should return mismatch when both plans differ', async () => {
      const mockSubscription = {
        id: 'sub-1',
        customerId: 'cust-1',
        planId: 'basic',
        status: 'active',
        price: 49.99,
        renewalAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockCustomer = {
        id: 'cust-1',
        name: 'Test User',
        email: 'test@example.com',
        planId: 'starter',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (getSubscription as any).mockResolvedValue(mockSubscription);
      (getCustomer as any).mockResolvedValue(mockCustomer);

      const result = await verifyUpgrade('run-1', 'conv-1', {
        customerId: 'cust-1',
        expectedPlanId: 'pro',
      });

      expect(result.verified).toBe(false);
      expect(result.differences).toHaveProperty('customerPlanId');
      expect(result.differences).toHaveProperty('subscriptionPlanId');
    });

    it('should throw and record failure on error', async () => {
      (getSubscription as any).mockRejectedValue(new Error('API error'));

      await expect(verifyUpgrade('run-1', 'conv-1', {
        customerId: 'cust-1',
        expectedPlanId: 'pro',
      })).rejects.toThrow('API error');

      expect(mockDbInsert).toHaveBeenCalled();
    });
  });

  describe('verifyCustomerState', () => {
    it('should delegate to freshworks verifyCustomerState', async () => {
      const mockResult = {
        verified: true,
        differences: {},
        observedState: { status: 'active', planId: 'pro' },
      };

      (freshworksVerifyCustomerState as any).mockResolvedValue(mockResult);

      const result = await verifyCustomerState('run-1', 'conv-1', {
        customerId: 'cust-1',
        expectedState: { status: 'active', planId: 'pro' },
      });

      expect(result).toEqual(mockResult);
      expect(freshworksVerifyCustomerState).toHaveBeenCalledWith('run-1', {
        customerId: 'cust-1',
        expectedState: { status: 'active', planId: 'pro' },
      });
    });

    it('should throw and record failure on error', async () => {
      (freshworksVerifyCustomerState as any).mockRejectedValue(new Error('Network error'));

      await expect(verifyCustomerState('run-1', 'conv-1', {
        customerId: 'cust-1',
        expectedState: { status: 'active' },
      })).rejects.toThrow('Network error');

      expect(mockDbInsert).toHaveBeenCalled();
    });
  });

  describe('getVerificationHistory', () => {
    it('should return verification history ordered by createdAt', async () => {
      const mockHistory = [
        {
          id: 'ver-1',
          actionType: 'refund',
          expectedState: { amount: 49.99 },
          observedState: { amount: 49.99 },
          status: 'verified',
          createdAt: new Date('2024-01-15'),
        },
        {
          id: 'ver-2',
          actionType: 'upgrade',
          expectedState: { planId: 'pro' },
          observedState: { planId: 'pro' },
          status: 'verified',
          createdAt: new Date('2024-01-16'),
        },
      ];

      mockDbSelect.mockReturnThis();
      mockDbFrom.mockReturnThis();
      mockDbWhere.mockReturnThis();
      mockDbOrderBy.mockResolvedValue(mockHistory);

      const result = await getVerificationHistory('conv-1');

      expect(result).toEqual(mockHistory);
      expect(mockDbFrom).toHaveBeenCalled();
    });
  });
});
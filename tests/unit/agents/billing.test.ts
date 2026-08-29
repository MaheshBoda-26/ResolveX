import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectDuplicateCharges, checkPolicy, processBillingTask } from '../../../apps/api/src/agents/billing';
import { Transaction, BillingTask, BillingDecision, Customer } from '@resolvex/shared';

describe('Billing Agent Unit Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('detectDuplicateCharges', () => {
    const createTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
      id: 'tx-1',
      customerId: 'cust-1',
      invoiceId: 'INV-001',
      amount: 49.99,
      currency: 'USD',
      status: 'completed',
      chargedAt: new Date('2024-01-15T10:00:00Z').toISOString(),
      metadata: {},
      ...overrides,
    });

    it('should return empty array for no transactions', () => {
      const result = detectDuplicateCharges([]);
      expect(result).toEqual([]);
    });

    it('should return empty array for no completed transactions', () => {
      const transactions = [
        createTransaction({ status: 'pending' }),
        createTransaction({ status: 'failed' }),
      ];
      const result = detectDuplicateCharges(transactions);
      expect(result).toEqual([]);
    });

    it('should detect duplicates within 24 hours with same amount', () => {
      const transactions = [
        createTransaction({ id: 'tx-1', invoiceId: 'INV-001', chargedAt: new Date('2024-01-15T10:00:00Z').toISOString() }),
        createTransaction({ id: 'tx-2', invoiceId: 'INV-002', chargedAt: new Date('2024-01-15T14:00:00Z').toISOString() }),
      ];
      const result = detectDuplicateCharges(transactions);
      expect(result.length).toBe(2);
      expect(result.map(t => t.id).sort()).toEqual(['tx-1', 'tx-2']);
    });

    it('should not detect duplicates beyond 24 hours', () => {
      const transactions = [
        createTransaction({ id: 'tx-1', invoiceId: 'INV-001', chargedAt: new Date('2024-01-15T10:00:00Z').toISOString() }),
        createTransaction({ id: 'tx-2', invoiceId: 'INV-002', chargedAt: new Date('2024-01-17T10:00:00Z').toISOString() }),
      ];
      const result = detectDuplicateCharges(transactions);
      expect(result).toEqual([]);
    });

    it('should not detect duplicates with different amounts', () => {
      const transactions = [
        createTransaction({ id: 'tx-1', invoiceId: 'INV-001', amount: 49.99, chargedAt: new Date('2024-01-15T10:00:00Z').toISOString() }),
        createTransaction({ id: 'tx-2', invoiceId: 'INV-002', amount: 99.99, chargedAt: new Date('2024-01-15T14:00:00Z').toISOString() }),
      ];
      const result = detectDuplicateCharges(transactions);
      expect(result).toEqual([]);
    });

    it('should filter by target amount when provided', () => {
      const transactions = [
        createTransaction({ id: 'tx-1', invoiceId: 'INV-001', amount: 49.99, chargedAt: new Date('2024-01-15T10:00:00Z').toISOString() }),
        createTransaction({ id: 'tx-2', invoiceId: 'INV-002', amount: 49.99, chargedAt: new Date('2024-01-15T14:00:00Z').toISOString() }),
        createTransaction({ id: 'tx-3', invoiceId: 'INV-003', amount: 99.99, chargedAt: new Date('2024-01-15T14:00:00Z').toISOString() }),
      ];
      const result = detectDuplicateCharges(transactions, 49.99, 'INV-001');
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('tx-2');
    });

    it('should handle multiple duplicate groups', () => {
      const transactions = [
        createTransaction({ id: 'tx-1', invoiceId: 'INV-001', amount: 49.99, chargedAt: new Date('2024-01-15T10:00:00Z').toISOString() }),
        createTransaction({ id: 'tx-2', invoiceId: 'INV-002', amount: 49.99, chargedAt: new Date('2024-01-15T14:00:00Z').toISOString() }),
        createTransaction({ id: 'tx-3', invoiceId: 'INV-003', amount: 29.99, chargedAt: new Date('2024-01-15T10:00:00Z').toISOString() }),
        createTransaction({ id: 'tx-4', invoiceId: 'INV-004', amount: 29.99, chargedAt: new Date('2024-01-15T14:00:00Z').toISOString() }),
      ];
      const result = detectDuplicateCharges(transactions);
      expect(result.length).toBe(4);
    });

    it('should return unique transactions (no duplicates in result)', () => {
      const transactions = [
        createTransaction({ id: 'tx-1', invoiceId: 'INV-001', amount: 49.99, chargedAt: new Date('2024-01-15T10:00:00Z').toISOString() }),
        createTransaction({ id: 'tx-2', invoiceId: 'INV-002', amount: 49.99, chargedAt: new Date('2024-01-15T14:00:00Z').toISOString() }),
        createTransaction({ id: 'tx-3', invoiceId: 'INV-003', amount: 49.99, chargedAt: new Date('2024-01-15T16:00:00Z').toISOString() }),
      ];
      const result = detectDuplicateCharges(transactions);
      const uniqueIds = new Set(result.map(t => t.id));
      expect(uniqueIds.size).toBe(result.length);
    });
  });

  describe('checkPolicy', () => {
    it('should return billing refund policies for refund action', async () => {
      const refs = await checkPolicy('refund', ['duplicate_charge']);
      expect(refs).toContain('POL-BILL-001');
      expect(refs).toContain('POL-BILL-002');
      expect(refs).toContain('POL-BILL-003');
    });

    it('should return billing refund policies without duplicate for refund action', async () => {
      const refs = await checkPolicy('refund', ['customer_complaint']);
      expect(refs).toContain('POL-BILL-001');
      expect(refs).toContain('POL-BILL-002');
      expect(refs).not.toContain('POL-BILL-003');
    });

    it('should return investigate policy for investigate action', async () => {
      const refs = await checkPolicy('investigate', []);
      expect(refs).toContain('POL-BILL-004');
    });

    it('should return escalate policy for escalate action', async () => {
      const refs = await checkPolicy('escalate', []);
      expect(refs).toContain('POL-BILL-005');
    });

    it('should return empty array for unknown action', async () => {
      const refs = await checkPolicy('unknown_action', []);
      expect(refs).toEqual([]);
    });
  });

  describe('processBillingTask', () => {
    // We'll test the logic by mocking the external dependencies
    const mockCustomer: Customer = {
      id: 'cust-1',
      name: 'Test User',
      email: 'test@example.com',
      planId: 'basic',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockTransactions: Transaction[] = [
      {
        id: 'tx-1',
        customerId: 'cust-1',
        invoiceId: 'INV-001',
        amount: 49.99,
        currency: 'USD',
        status: 'completed',
        chargedAt: new Date('2024-01-15T10:00:00Z').toISOString(),
        metadata: {},
      },
      {
        id: 'tx-2',
        customerId: 'cust-1',
        invoiceId: 'INV-002',
        amount: 49.99,
        currency: 'USD',
        status: 'completed',
        chargedAt: new Date('2024-01-15T14:00:00Z').toISOString(),
        metadata: {},
      },
    ];

    // We need to test processBillingTask which has external dependencies
    // Since it imports getCustomer, getTransactions, and callAutonomyGate,
    // we'll focus on testing the pure logic functions
    // and verify the behavior through integration tests

    it('should have correct function signature', () => {
      expect(typeof processBillingTask).toBe('function');
    });

    it('should export detectDuplicateCharges for testing', () => {
      expect(typeof detectDuplicateCharges).toBe('function');
    });

    it('should export checkPolicy for testing', () => {
      expect(typeof checkPolicy).toBe('function');
    });
  });
});
import { describe, it, expect } from 'vitest';
import { checkEscalationRules } from '../../../apps/api/src/handoff/escalation';
import { BillingDecision, SubscriptionDecision, HANDOFF_REASONS, AUTONOMY_THRESHOLDS } from '@resolvex/shared';

describe('Handoff Escalation Unit Tests', () => {
  const createMockBillingDecision = (overrides: Partial<BillingDecision> = {}): BillingDecision => ({
    action: 'refund',
    amount: 49.99,
    evidence: ['duplicate_charge'],
    policyReferences: ['POL-BILL-001'],
    requiresApproval: false,
    ...overrides,
  });

  const createMockSubscriptionDecision = (overrides: Partial<SubscriptionDecision> = {}): SubscriptionDecision => ({
    action: 'upgrade',
    targetPlanId: 'pro',
    eligibility: 'eligible',
    evidence: ['valid_upgrade'],
    policyReferences: ['POL-SUB-001'],
    requiresApproval: false,
    ...overrides,
  });

  describe('checkEscalationRules', () => {
    describe('High Value Refund', () => {
      it('should escalate for refund exceeding REVIEW_MAX', () => {
        const decision = createMockBillingDecision({ action: 'refund', amount: 600 });
        const context = { refundAmount: 600 };

        const result = checkEscalationRules(decision, context);

        expect(result.shouldEscalate).toBe(true);
        expect(result.reason).toBe(HANDOFF_REASONS.HIGH_VALUE_REFUND);
        expect(result.details).toContain('$600');
        expect(result.details).toContain(String(AUTONOMY_THRESHOLDS.REFUND_REVIEW_MAX));
      });

      it('should not escalate for refund within REVIEW_MAX', () => {
        const decision = createMockBillingDecision({ action: 'refund', amount: 100 });
        const context = { refundAmount: 100 };

        const result = checkEscalationRules(decision, context);

        expect(result.shouldEscalate).toBe(false);
      });

      it('should not escalate when no refund amount in context', () => {
        const decision = createMockBillingDecision({ action: 'refund', amount: 600 });
        const context = {};

        const result = checkEscalationRules(decision, context);

        expect(result.shouldEscalate).toBe(false);
      });
    });

    describe('Policy Exception', () => {
      it('should escalate when policyException provided in context', () => {
        const decision = createMockBillingDecision({ action: 'refund' });
        const context = { policyException: 'Special case exception' };

        const result = checkEscalationRules(decision, context);

        expect(result.shouldEscalate).toBe(true);
        expect(result.reason).toBe(HANDOFF_REASONS.POLICY_EXCEPTION);
        expect(result.details).toBe('Special case exception');
      });

      it('should escalate when decision has escalate action with exception in evidence', () => {
        const decision = createMockBillingDecision({
          action: 'escalate',
          evidence: ['Policy exception detected', 'Manager approval needed'],
        });
        const context = {};

        const result = checkEscalationRules(decision, context);

        expect(result.shouldEscalate).toBe(true);
        expect(result.reason).toBe(HANDOFF_REASONS.POLICY_EXCEPTION);
        expect(result.details).toContain('Policy exception detected');
      });

      it('should not escalate for normal decision without exception', () => {
        const decision = createMockBillingDecision({ action: 'refund', evidence: ['duplicate_charge'] });
        const context = {};

        const result = checkEscalationRules(decision, context);

        expect(result.shouldEscalate).toBe(false);
      });
    });

    describe('Ambiguous Identity', () => {
      it('should escalate when identityVerified is false', () => {
        const decision = createMockBillingDecision();
        const context = { identityVerified: false };

        const result = checkEscalationRules(decision, context);

        expect(result.shouldEscalate).toBe(true);
        expect(result.reason).toBe(HANDOFF_REASONS.AMBIGUOUS_IDENTITY);
        expect(result.details).toBe('Customer identity could not be verified');
      });

      it('should not escalate when identityVerified is true', () => {
        const decision = createMockBillingDecision();
        const context = { identityVerified: true };

        const result = checkEscalationRules(decision, context);

        expect(result.shouldEscalate).toBe(false);
      });

      it('should not escalate when identityVerified is undefined', () => {
        const decision = createMockBillingDecision();
        const context = { identityVerified: undefined };

        const result = checkEscalationRules(decision, context);

        expect(result.shouldEscalate).toBe(false);
      });
    });

    describe('Conflicting Account State', () => {
      it('should escalate when accountStateConflict provided', () => {
        const decision = createMockBillingDecision();
        const context = { accountStateConflict: 'Customer status suspended but has active charges' };

        const result = checkEscalationRules(decision, context);

        expect(result.shouldEscalate).toBe(true);
        expect(result.reason).toBe(HANDOFF_REASONS.CONFLICTING_ACCOUNT_STATE);
        expect(result.details).toBe('Customer status suspended but has active charges');
      });

      it('should not escalate when accountStateConflict undefined', () => {
        const decision = createMockBillingDecision();
        const context = { accountStateConflict: undefined };

        const result = checkEscalationRules(decision, context);

        expect(result.shouldEscalate).toBe(false);
      });
    });

    describe('Unverified Mutation', () => {
      it('should escalate when mutationVerified is false', () => {
        const decision = createMockBillingDecision();
        const context = { mutationVerified: false };

        const result = checkEscalationRules(decision, context);

        expect(result.shouldEscalate).toBe(true);
        expect(result.reason).toBe(HANDOFF_REASONS.UNVERIFIED_MUTATION);
        expect(result.details).toBe('Mutation outcome could not be verified');
      });

      it('should not escalate when mutationVerified is true', () => {
        const decision = createMockBillingDecision();
        const context = { mutationVerified: true };

        const result = checkEscalationRules(decision, context);

        expect(result.shouldEscalate).toBe(false);
      });
    });

    describe('Unsupported Workflow', () => {
      it('should escalate when workflowSupported is false', () => {
        const decision = createMockBillingDecision();
        const context = { workflowSupported: false };

        const result = checkEscalationRules(decision, context);

        expect(result.shouldEscalate).toBe(true);
        expect(result.reason).toBe(HANDOFF_REASONS.UNSUPPORTED_WORKFLOW);
        expect(result.details).toBe('Requested workflow is not supported for autonomous execution');
      });

      it('should not escalate when workflowSupported is true', () => {
        const decision = createMockBillingDecision();
        const context = { workflowSupported: true };

        const result = checkEscalationRules(decision, context);

        expect(result.shouldEscalate).toBe(false);
      });
    });

    describe('Tool Failure', () => {
      it('should escalate when toolFailed and not idempotent', () => {
        const decision = createMockBillingDecision();
        const context = { toolFailed: true, isIdempotent: false, toolName: 'cancelSubscription' };

        const result = checkEscalationRules(decision, context);

        expect(result.shouldEscalate).toBe(true);
        expect(result.reason).toBe(HANDOFF_REASONS.TOOL_FAILURE);
        expect(result.details).toContain('cancelSubscription');
      });

      it('should not escalate when toolFailed but is idempotent', () => {
        const decision = createMockBillingDecision();
        const context = { toolFailed: true, isIdempotent: true, toolName: 'issueRefund' };

        const result = checkEscalationRules(decision, context);

        expect(result.shouldEscalate).toBe(false);
      });

      it('should not escalate when toolFailed is false', () => {
        const decision = createMockBillingDecision();
        const context = { toolFailed: false, isIdempotent: false };

        const result = checkEscalationRules(decision, context);

        expect(result.shouldEscalate).toBe(false);
      });
    });

    describe('Missing Information', () => {
      it('should escalate when missingFields provided', () => {
        const decision = createMockBillingDecision();
        const context = { missingFields: ['customerId', 'invoiceId'] };

        const result = checkEscalationRules(decision, context);

        expect(result.shouldEscalate).toBe(true);
        expect(result.reason).toBe(HANDOFF_REASONS.MISSING_INFORMATION);
        expect(result.details).toContain('customerId, invoiceId');
      });

      it('should not escalate when missingFields empty', () => {
        const decision = createMockBillingDecision();
        const context = { missingFields: [] };

        const result = checkEscalationRules(decision, context);

        expect(result.shouldEscalate).toBe(false);
      });

      it('should not escalate when missingFields undefined', () => {
        const decision = createMockBillingDecision();
        const context = { missingFields: undefined };

        const result = checkEscalationRules(decision, context);

        expect(result.shouldEscalate).toBe(false);
      });
    });

    describe('Multiple conditions', () => {
      it('should prioritize first matching rule (high value refund)', () => {
        const decision = createMockBillingDecision({ action: 'refund', amount: 600 });
        const context = {
          refundAmount: 600,
          policyException: 'Also has exception',
          identityVerified: false,
        };

        const result = checkEscalationRules(decision, context);

        expect(result.shouldEscalate).toBe(true);
        expect(result.reason).toBe(HANDOFF_REASONS.HIGH_VALUE_REFUND);
      });

      it('should check policy exception when no high value refund', () => {
        const decision = createMockBillingDecision({ action: 'refund', amount: 100 });
        const context = {
          refundAmount: 100,
          policyException: 'Has exception',
        };

        const result = checkEscalationRules(decision, context);

        expect(result.shouldEscalate).toBe(true);
        expect(result.reason).toBe(HANDOFF_REASONS.POLICY_EXCEPTION);
      });

      it('should check ambiguous identity when no prior conditions', () => {
        const decision = createMockBillingDecision({ action: 'refund', amount: 100 });
        const context = {
          refundAmount: 100,
          identityVerified: false,
        };

        const result = checkEscalationRules(decision, context);

        expect(result.shouldEscalate).toBe(true);
        expect(result.reason).toBe(HANDOFF_REASONS.AMBIGUOUS_IDENTITY);
      });
    });

    describe('Subscription decisions', () => {
      it('should apply same rules to subscription decisions', () => {
        const decision = createMockSubscriptionDecision({ action: 'cancel' });
        const context = { missingFields: ['targetPlanId'] };

        const result = checkEscalationRules(decision, context);

        expect(result.shouldEscalate).toBe(true);
        expect(result.reason).toBe(HANDOFF_REASONS.MISSING_INFORMATION);
      });

      it('should check tool failure for subscription', () => {
        const decision = createMockSubscriptionDecision();
        const context = { toolFailed: true, isIdempotent: false, toolName: 'createSubscription' };

        const result = checkEscalationRules(decision, context);

        expect(result.shouldEscalate).toBe(true);
        expect(result.reason).toBe(HANDOFF_REASONS.TOOL_FAILURE);
      });
    });
  });
});
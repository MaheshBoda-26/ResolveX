import { describe, it, expect } from 'vitest';
import { checkAutonomyGate, determineRiskLevel } from '../../apps/api/src/verification/autonomyGate';
import {
  AutonomyGateInput,
  AutonomyGateResult,
  RiskLevel,
  AGENT_NAMES,
  RISK_LEVELS,
  AUTONOMY_THRESHOLDS,
} from '@resolvex/shared';

describe('Autonomy Gate Evaluation', () => {
  // ============================================
  // LOW RISK SCENARIOS
  // ============================================

  it('Low risk + evidence + policy + permission → allowed', () => {
    const input: AutonomyGateInput = {
      agent: AGENT_NAMES.TRIAGE,
      action: 'investigate',
      evidence: ['customer_complaint', 'transaction_logs'],
      policyReferences: ['billing_policy_v1'],
      permission: 'customer_owns_account',
      risk: RISK_LEVELS.LOW,
    };

    const result: AutonomyGateResult = checkAutonomyGate(input);

    expect(result.allowed).toBe(true);
    expect(result.reason).toContain('Low risk action');
    expect(result.requiredApprovals).toHaveLength(0);
  });

  it('Low risk + missing evidence → escalate', () => {
    const input: AutonomyGateInput = {
      agent: AGENT_NAMES.TRIAGE,
      action: 'investigate',
      evidence: [],
      policyReferences: ['billing_policy_v1'],
      permission: 'customer_owns_account',
      risk: RISK_LEVELS.LOW,
    };

    const result: AutonomyGateResult = checkAutonomyGate(input);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Missing evidence');
    expect(result.requiredApprovals).toContain('evidence_required');
  });

  it('Low risk + missing policy → escalate', () => {
    const input: AutonomyGateInput = {
      agent: AGENT_NAMES.TRIAGE,
      action: 'investigate',
      evidence: ['customer_complaint'],
      policyReferences: [],
      permission: 'customer_owns_account',
      risk: RISK_LEVELS.LOW,
    };

    const result: AutonomyGateResult = checkAutonomyGate(input);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Missing policy references');
    expect(result.requiredApprovals).toContain('policy_required');
  });

  it('Low risk + missing permission → escalate', () => {
    const input: AutonomyGateInput = {
      agent: AGENT_NAMES.TRIAGE,
      action: 'investigate',
      evidence: ['customer_complaint'],
      policyReferences: ['billing_policy_v1'],
      permission: '',
      risk: RISK_LEVELS.LOW,
    };

    const result: AutonomyGateResult = checkAutonomyGate(input);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Missing permission check');
    expect(result.requiredApprovals).toContain('permission_required');
  });

  // ============================================
  // MEDIUM RISK SCENARIOS
  // ============================================

  it('Low risk + evidence + policy + permission (refund ≤$50) → allowed', () => {
    const input: AutonomyGateInput = {
      agent: AGENT_NAMES.BILLING,
      action: 'refund',
      evidence: ['duplicate_charge_evidence', 'invoice_INV-001', 'invoice_INV-002'],
      policyReferences: ['refund_policy_auto_50'],
      permission: 'customer_owns_account',
      risk: RISK_LEVELS.LOW,
    };

    const result: AutonomyGateResult = checkAutonomyGate(input);

    expect(result.allowed).toBe(true);
    expect(result.reason).toContain('Low risk action');
    expect(result.requiredApprovals).toHaveLength(0);
  });

  it('Medium risk + evidence + policy + permission (upgrade same tier) → allowed', () => {
    const input: AutonomyGateInput = {
      agent: AGENT_NAMES.SUBSCRIPTION,
      action: 'upgrade',
      evidence: ['current_plan_basic', 'requested_plan_pro'],
      policyReferences: ['subscription_change_same_tier'],
      permission: 'active_subscription',
      risk: RISK_LEVELS.MEDIUM,
    };

    const result: AutonomyGateResult = checkAutonomyGate(input);

    expect(result.allowed).toBe(true);
    expect(result.reason).toContain('Medium risk subscription upgrade allowed');
    expect(result.requiredApprovals).toHaveLength(0);
  });

  it('Medium risk + high amount refund ($50-$500) → requiresApproval', () => {
    const input: AutonomyGateInput = {
      agent: AGENT_NAMES.BILLING,
      action: 'refund',
      evidence: ['partial_service_outage', 'customer_complaint'],
      policyReferences: ['refund_policy_review_500'],
      permission: 'customer_owns_account',
      risk: RISK_LEVELS.MEDIUM,
    };

    const result: AutonomyGateResult = checkAutonomyGate(input);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('requires approval');
    expect(result.requiredApprovals).toContain('medium_risk_approval');
  });

  it('Medium risk + downgrade → requiresApproval', () => {
    const input: AutonomyGateInput = {
      agent: AGENT_NAMES.SUBSCRIPTION,
      action: 'downgrade',
      evidence: ['customer_request', 'current_plan_premium'],
      policyReferences: ['subscription_change_cross_tier'],
      permission: 'active_subscription',
      risk: RISK_LEVELS.MEDIUM,
    };

    const result: AutonomyGateResult = checkAutonomyGate(input);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('requires approval');
    expect(result.requiredApprovals).toContain('medium_risk_approval');
  });

  // ============================================
  // HIGH RISK SCENARIOS
  // ============================================

  it('High risk (refund >$500) → requiresApproval', () => {
    const input: AutonomyGateInput = {
      agent: AGENT_NAMES.BILLING,
      action: 'refund',
      evidence: ['major_service_failure', 'customer_escalation'],
      policyReferences: ['refund_policy_high_value'],
      permission: 'customer_owns_account',
      risk: RISK_LEVELS.HIGH,
    };

    const result: AutonomyGateResult = checkAutonomyGate(input);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('High risk action requires human approval');
    expect(result.requiredApprovals).toContain('human_approval');
  });

  it('High risk (account deletion) → requiresApproval', () => {
    const input: AutonomyGateInput = {
      agent: AGENT_NAMES.SUBSCRIPTION,
      action: 'delete_account',
      evidence: ['customer_request', 'gdpr_compliance'],
      policyReferences: ['account_deletion_policy'],
      permission: 'customer_owns_account',
      risk: RISK_LEVELS.HIGH,
    };

    const result: AutonomyGateResult = checkAutonomyGate(input);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('High risk action requires human approval');
    expect(result.requiredApprovals).toContain('human_approval');
  });

  it('High risk (policy exception) → requiresApproval', () => {
    const input: AutonomyGateInput = {
      agent: AGENT_NAMES.BILLING,
      action: 'policy_exception_refund',
      evidence: ['unique_circumstance', 'manager_approval_requested'],
      policyReferences: ['exception_policy'],
      permission: 'customer_owns_account',
      risk: RISK_LEVELS.HIGH,
    };

    const result: AutonomyGateResult = checkAutonomyGate(input);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('High risk action requires human approval');
    expect(result.requiredApprovals).toContain('human_approval');
  });

  it('High risk (cancel subscription) → requiresApproval', () => {
    const input: AutonomyGateInput = {
      agent: AGENT_NAMES.SUBSCRIPTION,
      action: 'cancel',
      evidence: ['customer_request', 'churn_risk_high'],
      policyReferences: ['cancellation_policy'],
      permission: 'active_subscription',
      risk: RISK_LEVELS.HIGH,
    };

    const result: AutonomyGateResult = checkAutonomyGate(input);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('High risk action requires human approval');
    expect(result.requiredApprovals).toContain('human_approval');
  });

  // ============================================
  // PERMISSION FAILURE SCENARIOS
  // ============================================

  it('Missing permission (not account owner) → escalate', () => {
    const input: AutonomyGateInput = {
      agent: AGENT_NAMES.BILLING,
      action: 'refund',
      evidence: ['duplicate_charge'],
      policyReferences: ['refund_policy'],
      permission: 'third_party_request',
      risk: RISK_LEVELS.LOW,
    };

    const result: AutonomyGateResult = checkAutonomyGate(input);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Permission denied');
    expect(result.requiredApprovals).toContain('permission_check_failed');
  });

  it('Conflicting account state → escalate', () => {
    const input: AutonomyGateInput = {
      agent: AGENT_NAMES.BILLING,
      action: 'refund',
      evidence: ['account_suspended', 'recent_charge'],
      policyReferences: ['refund_policy'],
      permission: 'conflicting_state_detected',
      risk: RISK_LEVELS.MEDIUM,
    };

    const result: AutonomyGateResult = checkAutonomyGate(input);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Permission denied');
    expect(result.requiredApprovals).toContain('permission_check_failed');
  });

  // ============================================
  // TOOL FAILURE / UNKNOWN OUTCOME SCENARIOS
  // ============================================

  it('Tool failure on mutation → verify before retry (treated as high risk)', () => {
    const input: AutonomyGateInput = {
      agent: AGENT_NAMES.BILLING,
      action: 'refund',
      evidence: ['tool_failure_on_refund_attempt', 'retry_requested'],
      policyReferences: ['refund_policy', 'mutation_verification_policy'],
      permission: 'customer_owns_account',
      risk: RISK_LEVELS.HIGH,
    };

    const result: AutonomyGateResult = checkAutonomyGate(input);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('High risk action requires human approval');
    expect(result.requiredApprovals).toContain('human_approval');
  });

  it('Unknown mutation outcome → verify before retry (treated as high risk)', () => {
    const input: AutonomyGateInput = {
      agent: AGENT_NAMES.SUBSCRIPTION,
      action: 'upgrade',
      evidence: ['api_timeout_on_upgrade', 'state_unknown'],
      policyReferences: ['subscription_policy', 'mutation_verification_policy'],
      permission: 'active_subscription',
      risk: RISK_LEVELS.HIGH,
    };

    const result: AutonomyGateResult = checkAutonomyGate(input);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('High risk action requires human approval');
    expect(result.requiredApprovals).toContain('human_approval');
  });

  // ============================================
  // SUBSCRIPTION SPECIFIC SCENARIOS
  // ============================================

  it('Subscription downgrade/cancel → requiresApproval', () => {
    const input: AutonomyGateInput = {
      agent: AGENT_NAMES.SUBSCRIPTION,
      action: 'downgrade',
      evidence: ['customer_request_downgrade', 'current_plan_enterprise'],
      policyReferences: ['downgrade_policy_enterprise'],
      permission: 'active_subscription',
      risk: RISK_LEVELS.HIGH,
    };

    const result: AutonomyGateResult = checkAutonomyGate(input);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('High risk action requires human approval');
    expect(result.requiredApprovals).toContain('human_approval');
  });

  it('Subscription cancel → requiresApproval', () => {
    const input: AutonomyGateInput = {
      agent: AGENT_NAMES.SUBSCRIPTION,
      action: 'cancel',
      evidence: ['customer_request_cancel', 'no_outstanding_balance'],
      policyReferences: ['cancellation_policy'],
      permission: 'active_subscription',
      risk: RISK_LEVELS.HIGH,
    };

    const result: AutonomyGateResult = checkAutonomyGate(input);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('High risk action requires human approval');
    expect(result.requiredApprovals).toContain('human_approval');
  });

  // ============================================
  // DETERMINE RISK LEVEL TESTS
  // ============================================

  describe('determineRiskLevel', () => {
    it('refund ≤$50 → low risk', () => {
      expect(determineRiskLevel(AGENT_NAMES.BILLING, 'refund', 25)).toBe(RISK_LEVELS.LOW);
      expect(determineRiskLevel(AGENT_NAMES.BILLING, 'refund', 50)).toBe(RISK_LEVELS.LOW);
    });

    it('refund $50-$500 → medium risk', () => {
      expect(determineRiskLevel(AGENT_NAMES.BILLING, 'refund', 51)).toBe(RISK_LEVELS.MEDIUM);
      expect(determineRiskLevel(AGENT_NAMES.BILLING, 'refund', 100)).toBe(RISK_LEVELS.MEDIUM);
      expect(determineRiskLevel(AGENT_NAMES.BILLING, 'refund', 500)).toBe(RISK_LEVELS.MEDIUM);
    });

    it('refund >$500 → high risk', () => {
      expect(determineRiskLevel(AGENT_NAMES.BILLING, 'refund', 501)).toBe(RISK_LEVELS.HIGH);
      expect(determineRiskLevel(AGENT_NAMES.BILLING, 'refund', 1000)).toBe(RISK_LEVELS.HIGH);
    });

    it('refund without amount → medium risk', () => {
      expect(determineRiskLevel(AGENT_NAMES.BILLING, 'refund')).toBe(RISK_LEVELS.MEDIUM);
    });

    it('upgrade/downgrade → medium risk', () => {
      expect(determineRiskLevel(AGENT_NAMES.SUBSCRIPTION, 'upgrade')).toBe(RISK_LEVELS.MEDIUM);
      expect(determineRiskLevel(AGENT_NAMES.SUBSCRIPTION, 'downgrade')).toBe(RISK_LEVELS.MEDIUM);
    });

    it('cancel → high risk', () => {
      expect(determineRiskLevel(AGENT_NAMES.SUBSCRIPTION, 'cancel')).toBe(RISK_LEVELS.HIGH);
    });

    it('investigate/verify → low risk', () => {
      expect(determineRiskLevel(AGENT_NAMES.BILLING, 'investigate')).toBe(RISK_LEVELS.LOW);
      expect(determineRiskLevel(AGENT_NAMES.BILLING, 'verify')).toBe(RISK_LEVELS.LOW);
    });

    it('triage agent → low risk', () => {
      expect(determineRiskLevel(AGENT_NAMES.TRIAGE, 'classify')).toBe(RISK_LEVELS.LOW);
    });

    it('unknown action → medium risk (default)', () => {
      expect(determineRiskLevel(AGENT_NAMES.BILLING, 'unknown_action')).toBe(RISK_LEVELS.MEDIUM);
    });
  });
});
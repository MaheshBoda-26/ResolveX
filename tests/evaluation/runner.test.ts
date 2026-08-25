import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { checkAutonomyGate, determineRiskLevel } from '../../apps/api/src/verification/autonomyGate';
import {
  AutonomyGateInput,
  AutonomyGateResult,
  RiskLevel,
  AGENT_NAMES,
  RISK_LEVELS,
  AUTONOMY_THRESHOLDS,
} from '@resolvex/shared';

// Test case type for evaluation
interface EvaluationCase {
  name: string;
  input: AutonomyGateInput;
  expected: AutonomyGateResult;
  category: string;
}

// ============================================
// EVALUATION TEST CASES
// ============================================

const evaluationCases: EvaluationCase[] = [
  // LOW RISK SCENARIOS
  {
    name: 'Low risk + evidence + policy + permission → allowed',
    input: {
      agent: AGENT_NAMES.TRIAGE,
      action: 'investigate',
      evidence: ['customer_complaint', 'transaction_logs'],
      policyReferences: ['billing_policy_v1'],
      permission: 'customer_owns_account',
      risk: RISK_LEVELS.LOW,
    },
    expected: {
      allowed: true,
      reason: 'Low risk action with evidence, policy, and permission',
      requiredApprovals: [],
    },
    category: 'LOW_RISK',
  },
  {
    name: 'Low risk + missing evidence → escalate',
    input: {
      agent: AGENT_NAMES.TRIAGE,
      action: 'investigate',
      evidence: [],
      policyReferences: ['billing_policy_v1'],
      permission: 'customer_owns_account',
      risk: RISK_LEVELS.LOW,
    },
    expected: {
      allowed: false,
      reason: 'Missing evidence for action',
      requiredApprovals: ['evidence_required'],
    },
    category: 'LOW_RISK',
  },
  {
    name: 'Low risk + missing policy → escalate',
    input: {
      agent: AGENT_NAMES.TRIAGE,
      action: 'investigate',
      evidence: ['customer_complaint'],
      policyReferences: [],
      permission: 'customer_owns_account',
      risk: RISK_LEVELS.LOW,
    },
    expected: {
      allowed: false,
      reason: 'Missing policy references for action',
      requiredApprovals: ['policy_required'],
    },
    category: 'LOW_RISK',
  },
  {
    name: 'Low risk + missing permission → escalate',
    input: {
      agent: AGENT_NAMES.TRIAGE,
      action: 'investigate',
      evidence: ['customer_complaint'],
      policyReferences: ['billing_policy_v1'],
      permission: '',
      risk: RISK_LEVELS.LOW,
    },
    expected: {
      allowed: false,
      reason: 'Missing permission check',
      requiredApprovals: ['permission_required'],
    },
    category: 'LOW_RISK',
  },

  // MEDIUM RISK SCENARIOS
  {
    name: 'Low risk + evidence + policy + permission (refund ≤$50) → allowed',
    input: {
      agent: AGENT_NAMES.BILLING,
      action: 'refund',
      evidence: ['duplicate_charge_evidence', 'invoice_INV-001', 'invoice_INV-002'],
      policyReferences: ['refund_policy_auto_50'],
      permission: 'customer_owns_account',
      risk: RISK_LEVELS.LOW,
    },
    expected: {
      allowed: true,
      reason: 'Low risk action with evidence, policy, and permission',
      requiredApprovals: [],
    },
    category: 'LOW_RISK',
  },
  {
    name: 'Medium risk + evidence + policy + permission (upgrade same tier) → allowed',
    input: {
      agent: AGENT_NAMES.SUBSCRIPTION,
      action: 'upgrade',
      evidence: ['current_plan_basic', 'requested_plan_pro'],
      policyReferences: ['subscription_change_same_tier'],
      permission: 'active_subscription',
      risk: RISK_LEVELS.MEDIUM,
    },
    expected: {
      allowed: true,
      reason: 'Medium risk subscription upgrade allowed within same tier',
      requiredApprovals: [],
    },
    category: 'MEDIUM_RISK',
  },
  {
    name: 'Medium risk + high amount refund ($50-$500) → requiresApproval',
    input: {
      agent: AGENT_NAMES.BILLING,
      action: 'refund',
      evidence: ['partial_service_outage', 'customer_complaint'],
      policyReferences: ['refund_policy_review_500'],
      permission: 'customer_owns_account',
      risk: RISK_LEVELS.MEDIUM,
    },
    expected: {
      allowed: false,
      reason: 'Medium risk refund requires approval (amount exceeds auto threshold)',
      requiredApprovals: ['medium_risk_approval'],
    },
    category: 'MEDIUM_RISK',
  },
  {
    name: 'Medium risk + downgrade → requiresApproval',
    input: {
      agent: AGENT_NAMES.SUBSCRIPTION,
      action: 'downgrade',
      evidence: ['customer_request', 'current_plan_premium'],
      policyReferences: ['subscription_change_cross_tier'],
      permission: 'active_subscription',
      risk: RISK_LEVELS.MEDIUM,
    },
    expected: {
      allowed: false,
      reason: 'Medium risk subscription downgrade/cancel requires approval',
      requiredApprovals: ['medium_risk_approval'],
    },
    category: 'MEDIUM_RISK',
  },

  // HIGH RISK SCENARIOS
  {
    name: 'High risk (refund >$500) → requiresApproval',
    input: {
      agent: AGENT_NAMES.BILLING,
      action: 'refund',
      evidence: ['major_service_failure', 'customer_escalation'],
      policyReferences: ['refund_policy_high_value'],
      permission: 'customer_owns_account',
      risk: RISK_LEVELS.HIGH,
    },
    expected: {
      allowed: false,
      reason: 'High risk action requires human approval',
      requiredApprovals: ['human_approval'],
    },
    category: 'HIGH_RISK',
  },
  {
    name: 'High risk (account deletion) → requiresApproval',
    input: {
      agent: AGENT_NAMES.SUBSCRIPTION,
      action: 'delete_account',
      evidence: ['customer_request', 'gdpr_compliance'],
      policyReferences: ['account_deletion_policy'],
      permission: 'customer_owns_account',
      risk: RISK_LEVELS.HIGH,
    },
    expected: {
      allowed: false,
      reason: 'High risk action requires human approval',
      requiredApprovals: ['human_approval'],
    },
    category: 'HIGH_RISK',
  },
  {
    name: 'High risk (policy exception) → requiresApproval',
    input: {
      agent: AGENT_NAMES.BILLING,
      action: 'policy_exception_refund',
      evidence: ['unique_circumstance', 'manager_approval_requested'],
      policyReferences: ['exception_policy'],
      permission: 'customer_owns_account',
      risk: RISK_LEVELS.HIGH,
    },
    expected: {
      allowed: false,
      reason: 'High risk action requires human approval',
      requiredApprovals: ['human_approval'],
    },
    category: 'HIGH_RISK',
  },
  {
    name: 'High risk (cancel subscription) → requiresApproval',
    input: {
      agent: AGENT_NAMES.SUBSCRIPTION,
      action: 'cancel',
      evidence: ['customer_request', 'churn_risk_high'],
      policyReferences: ['cancellation_policy'],
      permission: 'active_subscription',
      risk: RISK_LEVELS.HIGH,
    },
    expected: {
      allowed: false,
      reason: 'High risk action requires human approval',
      requiredApprovals: ['human_approval'],
    },
    category: 'HIGH_RISK',
  },

  // PERMISSION FAILURE SCENARIOS
  {
    name: 'Missing permission (not account owner) → escalate',
    input: {
      agent: AGENT_NAMES.BILLING,
      action: 'refund',
      evidence: ['duplicate_charge'],
      policyReferences: ['refund_policy'],
      permission: 'third_party_request',
      risk: RISK_LEVELS.LOW,
    },
    expected: {
      allowed: false,
      reason: 'Permission denied: third_party_request',
      requiredApprovals: ['permission_check_failed'],
    },
    category: 'PERMISSION_FAILURE',
  },
  {
    name: 'Conflicting account state → escalate',
    input: {
      agent: AGENT_NAMES.BILLING,
      action: 'refund',
      evidence: ['account_suspended', 'recent_charge'],
      policyReferences: ['refund_policy'],
      permission: 'conflicting_state_detected',
      risk: RISK_LEVELS.MEDIUM,
    },
    expected: {
      allowed: false,
      reason: 'Permission denied: conflicting_state_detected',
      requiredApprovals: ['permission_check_failed'],
    },
    category: 'PERMISSION_FAILURE',
  },

  // TOOL FAILURE / UNKNOWN OUTCOME SCENARIOS
  {
    name: 'Tool failure on mutation → verify before retry',
    input: {
      agent: AGENT_NAMES.BILLING,
      action: 'refund',
      evidence: ['tool_failure_on_refund_attempt', 'retry_requested'],
      policyReferences: ['refund_policy', 'mutation_verification_policy'],
      permission: 'customer_owns_account',
      risk: RISK_LEVELS.HIGH,
    },
    expected: {
      allowed: false,
      reason: 'High risk action requires human approval',
      requiredApprovals: ['human_approval'],
    },
    category: 'TOOL_FAILURE',
  },
  {
    name: 'Unknown mutation outcome → verify before retry',
    input: {
      agent: AGENT_NAMES.SUBSCRIPTION,
      action: 'upgrade',
      evidence: ['api_timeout_on_upgrade', 'state_unknown'],
      policyReferences: ['subscription_policy', 'mutation_verification_policy'],
      permission: 'active_subscription',
      risk: RISK_LEVELS.HIGH,
    },
    expected: {
      allowed: false,
      reason: 'High risk action requires human approval',
      requiredApprovals: ['human_approval'],
    },
    category: 'TOOL_FAILURE',
  },

  // SUBSCRIPTION SPECIFIC SCENARIOS
  {
    name: 'Subscription downgrade/cancel → requiresApproval',
    input: {
      agent: AGENT_NAMES.SUBSCRIPTION,
      action: 'downgrade',
      evidence: ['customer_request_downgrade', 'current_plan_enterprise'],
      policyReferences: ['downgrade_policy_enterprise'],
      permission: 'active_subscription',
      risk: RISK_LEVELS.HIGH,
    },
    expected: {
      allowed: false,
      reason: 'High risk action requires human approval',
      requiredApprovals: ['human_approval'],
    },
    category: 'SUBSCRIPTION',
  },
  {
    name: 'Subscription cancel → requiresApproval',
    input: {
      agent: AGENT_NAMES.SUBSCRIPTION,
      action: 'cancel',
      evidence: ['customer_request_cancel', 'no_outstanding_balance'],
      policyReferences: ['cancellation_policy'],
      permission: 'active_subscription',
      risk: RISK_LEVELS.HIGH,
    },
    expected: {
      allowed: false,
      reason: 'High risk action requires human approval',
      requiredApprovals: ['human_approval'],
    },
    category: 'SUBSCRIPTION',
  },
];

// Risk level determination test cases
interface RiskLevelCase {
  name: string;
  agent: string;
  action: string;
  amount?: number;
  expected: RiskLevel;
}

const riskLevelCases: RiskLevelCase[] = [
  { name: 'refund $25 → low', agent: AGENT_NAMES.BILLING, action: 'refund', amount: 25, expected: RISK_LEVELS.LOW },
  { name: 'refund $50 → low', agent: AGENT_NAMES.BILLING, action: 'refund', amount: 50, expected: RISK_LEVELS.LOW },
  { name: 'refund $51 → medium', agent: AGENT_NAMES.BILLING, action: 'refund', amount: 51, expected: RISK_LEVELS.MEDIUM },
  { name: 'refund $100 → medium', agent: AGENT_NAMES.BILLING, action: 'refund', amount: 100, expected: RISK_LEVELS.MEDIUM },
  { name: 'refund $500 → medium', agent: AGENT_NAMES.BILLING, action: 'refund', amount: 500, expected: RISK_LEVELS.MEDIUM },
  { name: 'refund $501 → high', agent: AGENT_NAMES.BILLING, action: 'refund', amount: 501, expected: RISK_LEVELS.HIGH },
  { name: 'refund $1000 → high', agent: AGENT_NAMES.BILLING, action: 'refund', amount: 1000, expected: RISK_LEVELS.HIGH },
  { name: 'refund (no amount) → medium', agent: AGENT_NAMES.BILLING, action: 'refund', expected: RISK_LEVELS.MEDIUM },
  { name: 'upgrade → medium', agent: AGENT_NAMES.SUBSCRIPTION, action: 'upgrade', expected: RISK_LEVELS.MEDIUM },
  { name: 'downgrade → medium', agent: AGENT_NAMES.SUBSCRIPTION, action: 'downgrade', expected: RISK_LEVELS.MEDIUM },
  { name: 'cancel → high', agent: AGENT_NAMES.SUBSCRIPTION, action: 'cancel', expected: RISK_LEVELS.HIGH },
  { name: 'investigate → low', agent: AGENT_NAMES.BILLING, action: 'investigate', expected: RISK_LEVELS.LOW },
  { name: 'verify → low', agent: AGENT_NAMES.BILLING, action: 'verify', expected: RISK_LEVELS.LOW },
  { name: 'triage → low', agent: AGENT_NAMES.TRIAGE, action: 'classify', expected: RISK_LEVELS.LOW },
  { name: 'unknown → medium', agent: AGENT_NAMES.BILLING, action: 'unknown_action', expected: RISK_LEVELS.MEDIUM },
];

// ============================================
// EVALUATION RUNNER
// ============================================

describe('Autonomy Gate Evaluation Runner', () => {
  let results: {
    passed: number;
    failed: number;
    total: number;
    failures: Array<{ name: string; expected: AutonomyGateResult; actual: AutonomyGateResult }>;
    byCategory: Record<string, { passed: number; failed: number }>;
  };

  beforeAll(() => {
    results = {
      passed: 0,
      failed: 0,
      total: 0,
      failures: [],
      byCategory: {},
    };
  });

  afterAll(() => {
    // Print summary
    console.log('\n==========================================');
    console.log('AUTONOMY GATE EVALUATION SUMMARY');
    console.log('==========================================');
    console.log(`Total: ${results.total}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Accuracy: ${((results.passed / results.total) * 100).toFixed(1)}%`);
    console.log('\nBy Category:');
    for (const [category, stats] of Object.entries(results.byCategory)) {
      const total = stats.passed + stats.failed;
      console.log(`  ${category}: ${stats.passed}/${total} (${((stats.passed / total) * 100).toFixed(1)}%)`);
    }

    if (results.failures.length > 0) {
      console.log('\nFailures:');
      for (const failure of results.failures) {
        console.log(`  - ${failure.name}`);
        console.log(`    Expected: ${JSON.stringify(failure.expected)}`);
        console.log(`    Actual:   ${JSON.stringify(failure.actual)}`);
      }
    }

    const targetAccuracy = 90;
    const actualAccuracy = (results.passed / results.total) * 100;
    console.log(`\nTarget: ${targetAccuracy}%+ | Actual: ${actualAccuracy.toFixed(1)}%`);
    console.log(actualAccuracy >= targetAccuracy ? '✅ TARGET MET' : '❌ TARGET NOT MET');
    console.log('==========================================\n');
  });

  it('evaluates all autonomy gate cases', () => {
    for (const testCase of evaluationCases) {
      results.total++;
      const category = testCase.category;
      if (!results.byCategory[category]) {
        results.byCategory[category] = { passed: 0, failed: 0 };
      }

      const actual = checkAutonomyGate(testCase.input);
      const passed =
        actual.allowed === testCase.expected.allowed &&
        actual.reason === testCase.expected.reason &&
        JSON.stringify(actual.requiredApprovals) === JSON.stringify(testCase.expected.requiredApprovals);

      if (passed) {
        results.passed++;
        results.byCategory[category].passed++;
      } else {
        results.failed++;
        results.byCategory[category].failed++;
        results.failures.push({
          name: testCase.name,
          expected: testCase.expected,
          actual,
        });
      }

      expect(passed).toBe(true);
    }
  });

  it('evaluates all risk level determination cases', () => {
    for (const testCase of riskLevelCases) {
      results.total++;
      const category = 'RISK_DETERMINATION';
      if (!results.byCategory[category]) {
        results.byCategory[category] = { passed: 0, failed: 0 };
      }

      const actual = determineRiskLevel(testCase.agent, testCase.action, testCase.amount);
      const passed = actual === testCase.expected;

      if (passed) {
        results.passed++;
        results.byCategory[category].passed++;
      } else {
        results.failed++;
        results.byCategory[category].failed++;
        results.failures.push({
          name: testCase.name,
          expected: { allowed: false, reason: testCase.expected, requiredApprovals: [] },
          actual: { allowed: false, reason: actual, requiredApprovals: [] },
        });
      }

      expect(passed).toBe(true);
    }
  });
});

// Export for direct execution
export { evaluationCases, riskLevelCases };
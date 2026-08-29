import { describe, it, expect } from 'vitest';
import { checkAutonomyGate, determineRiskLevel } from '../../../apps/api/src/verification/autonomyGate';
import {
  AutonomyGateInput,
  AGENT_NAMES,
  RISK_LEVELS,
} from '@resolvex/shared';

describe('Autonomy Gate Unit Tests', () => {
  describe('checkAutonomyGate', () => {
    describe('LOW RISK', () => {
      it('should allow valid low risk action', () => {
        const result = checkAutonomyGate({
          agent: AGENT_NAMES.TRIAGE,
          action: 'investigate',
          evidence: ['customer_complaint'],
          policyReferences: ['policy_v1'],
          permission: 'customer_owns_account',
          risk: RISK_LEVELS.LOW,
        });

        expect(result.allowed).toBe(true);
        expect(result.requiredApprovals).toEqual([]);
      });

      it('should deny when evidence missing', () => {
        const result = checkAutonomyGate({
          agent: AGENT_NAMES.TRIAGE,
          action: 'investigate',
          evidence: [],
          policyReferences: ['policy_v1'],
          permission: 'customer_owns_account',
          risk: RISK_LEVELS.LOW,
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Missing evidence');
        expect(result.requiredApprovals).toContain('evidence_required');
      });

      it('should deny when policy missing', () => {
        const result = checkAutonomyGate({
          agent: AGENT_NAMES.TRIAGE,
          action: 'investigate',
          evidence: ['customer_complaint'],
          policyReferences: [],
          permission: 'customer_owns_account',
          risk: RISK_LEVELS.LOW,
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Missing policy references');
        expect(result.requiredApprovals).toContain('policy_required');
      });

      it('should deny when permission missing', () => {
        const result = checkAutonomyGate({
          agent: AGENT_NAMES.TRIAGE,
          action: 'investigate',
          evidence: ['customer_complaint'],
          policyReferences: ['policy_v1'],
          permission: '',
          risk: RISK_LEVELS.LOW,
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Missing permission');
        expect(result.requiredApprovals).toContain('permission_required');
      });

      it('should deny when permission invalid', () => {
        const result = checkAutonomyGate({
          agent: AGENT_NAMES.BILLING,
          action: 'refund',
          evidence: ['duplicate_charge'],
          policyReferences: ['policy_v1'],
          permission: 'invalid_permission',
          risk: RISK_LEVELS.LOW,
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Permission denied');
        expect(result.requiredApprovals).toContain('permission_check_failed');
      });
    });

    describe('MEDIUM RISK', () => {
      it('should deny medium risk refund requiring approval', () => {
        const result = checkAutonomyGate({
          agent: AGENT_NAMES.BILLING,
          action: 'refund',
          evidence: ['partial_service_outage'],
          policyReferences: ['policy_v1'],
          permission: 'customer_owns_account',
          risk: RISK_LEVELS.MEDIUM,
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Medium risk refund');
        expect(result.requiredApprovals).toContain('medium_risk_approval');
      });

      it('should allow medium risk subscription upgrade', () => {
        const result = checkAutonomyGate({
          agent: AGENT_NAMES.SUBSCRIPTION,
          action: 'upgrade',
          evidence: ['current_plan_basic'],
          policyReferences: ['policy_v1'],
          permission: 'active_subscription',
          risk: RISK_LEVELS.MEDIUM,
        });

        expect(result.allowed).toBe(true);
        expect(result.reason).toContain('Medium risk subscription upgrade');
      });

      it('should deny medium risk subscription downgrade', () => {
        const result = checkAutonomyGate({
          agent: AGENT_NAMES.SUBSCRIPTION,
          action: 'downgrade',
          evidence: ['customer_request'],
          policyReferences: ['policy_v1'],
          permission: 'active_subscription',
          risk: RISK_LEVELS.MEDIUM,
        });

        expect(result.allowed).toBe(false);
        expect(result.requiredApprovals).toContain('medium_risk_approval');
      });

      it('should deny medium risk subscription cancel', () => {
        const result = checkAutonomyGate({
          agent: AGENT_NAMES.SUBSCRIPTION,
          action: 'cancel',
          evidence: ['customer_request'],
          policyReferences: ['policy_v1'],
          permission: 'active_subscription',
          risk: RISK_LEVELS.MEDIUM,
        });

        expect(result.allowed).toBe(false);
        expect(result.requiredApprovals).toContain('medium_risk_approval');
      });
    });

    describe('HIGH RISK', () => {
      it('should deny high risk action requiring human approval', () => {
        const result = checkAutonomyGate({
          agent: AGENT_NAMES.BILLING,
          action: 'refund',
          evidence: ['major_service_failure'],
          policyReferences: ['policy_v1'],
          permission: 'customer_owns_account',
          risk: RISK_LEVELS.HIGH,
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('High risk action requires human approval');
        expect(result.requiredApprovals).toContain('human_approval');
      });

      it('should deny high risk subscription downgrade', () => {
        const result = checkAutonomyGate({
          agent: AGENT_NAMES.SUBSCRIPTION,
          action: 'downgrade',
          evidence: ['enterprise_customer'],
          policyReferences: ['policy_v1'],
          permission: 'active_subscription',
          risk: RISK_LEVELS.HIGH,
        });

        expect(result.allowed).toBe(false);
        expect(result.requiredApprovals).toContain('human_approval');
      });

      it('should deny high risk subscription cancel', () => {
        const result = checkAutonomyGate({
          agent: AGENT_NAMES.SUBSCRIPTION,
          action: 'cancel',
          evidence: ['customer_request'],
          policyReferences: ['policy_v1'],
          permission: 'active_subscription',
          risk: RISK_LEVELS.HIGH,
        });

        expect(result.allowed).toBe(false);
        expect(result.requiredApprovals).toContain('human_approval');
      });
    });

    describe('Unknown Risk', () => {
      it('should deny unknown risk level', () => {
        const result = checkAutonomyGate({
          agent: AGENT_NAMES.BILLING,
          action: 'refund',
          evidence: ['customer_complaint'],
          policyReferences: ['policy_v1'],
          permission: 'customer_owns_account',
          risk: 'unknown' as any,
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Unknown risk level');
        expect(result.requiredApprovals).toContain('unknown_risk');
      });
    });
  });

  describe('determineRiskLevel', () => {
    describe('Refund actions', () => {
      it('should return low risk for refund ≤ $50', () => {
        expect(determineRiskLevel(AGENT_NAMES.BILLING, 'refund', 25)).toBe(RISK_LEVELS.LOW);
        expect(determineRiskLevel(AGENT_NAMES.BILLING, 'refund', 50)).toBe(RISK_LEVELS.LOW);
        expect(determineRiskLevel(AGENT_NAMES.BILLING, 'refund', 0)).toBe(RISK_LEVELS.LOW);
      });

      it('should return medium risk for refund $51-$500', () => {
        expect(determineRiskLevel(AGENT_NAMES.BILLING, 'refund', 51)).toBe(RISK_LEVELS.MEDIUM);
        expect(determineRiskLevel(AGENT_NAMES.BILLING, 'refund', 100)).toBe(RISK_LEVELS.MEDIUM);
        expect(determineRiskLevel(AGENT_NAMES.BILLING, 'refund', 500)).toBe(RISK_LEVELS.MEDIUM);
      });

      it('should return high risk for refund > $500', () => {
        expect(determineRiskLevel(AGENT_NAMES.BILLING, 'refund', 501)).toBe(RISK_LEVELS.HIGH);
        expect(determineRiskLevel(AGENT_NAMES.BILLING, 'refund', 1000)).toBe(RISK_LEVELS.HIGH);
        expect(determineRiskLevel(AGENT_NAMES.BILLING, 'refund', 10000)).toBe(RISK_LEVELS.HIGH);
      });

      it('should return medium risk for refund without amount', () => {
        expect(determineRiskLevel(AGENT_NAMES.BILLING, 'refund')).toBe(RISK_LEVELS.MEDIUM);
      });

      it('should handle issue_refund as refund', () => {
        expect(determineRiskLevel(AGENT_NAMES.BILLING, 'issue_refund', 25)).toBe(RISK_LEVELS.LOW);
        expect(determineRiskLevel(AGENT_NAMES.BILLING, 'issue_refund', 1000)).toBe(RISK_LEVELS.HIGH);
      });

      it('should be case insensitive', () => {
        expect(determineRiskLevel(AGENT_NAMES.BILLING, 'REFUND', 25)).toBe(RISK_LEVELS.LOW);
      });
    });

    describe('Subscription actions', () => {
      it('should return medium risk for upgrade', () => {
        expect(determineRiskLevel(AGENT_NAMES.SUBSCRIPTION, 'upgrade')).toBe(RISK_LEVELS.MEDIUM);
      });

      it('should return medium risk for downgrade', () => {
        expect(determineRiskLevel(AGENT_NAMES.SUBSCRIPTION, 'downgrade')).toBe(RISK_LEVELS.MEDIUM);
      });

      it('should return high risk for cancel', () => {
        expect(determineRiskLevel(AGENT_NAMES.SUBSCRIPTION, 'cancel')).toBe(RISK_LEVELS.HIGH);
      });
    });

    describe('Other actions', () => {
      it('should return low risk for investigate', () => {
        expect(determineRiskLevel(AGENT_NAMES.BILLING, 'investigate')).toBe(RISK_LEVELS.LOW);
      });

      it('should return low risk for verify', () => {
        expect(determineRiskLevel(AGENT_NAMES.BILLING, 'verify')).toBe(RISK_LEVELS.LOW);
      });

      it('should return low risk for triage agent', () => {
        expect(determineRiskLevel(AGENT_NAMES.TRIAGE, 'classify')).toBe(RISK_LEVELS.LOW);
        expect(determineRiskLevel(AGENT_NAMES.TRIAGE, 'unknown')).toBe(RISK_LEVELS.LOW);
      });

      it('should return medium risk for unknown action', () => {
        expect(determineRiskLevel(AGENT_NAMES.BILLING, 'unknown_action')).toBe(RISK_LEVELS.MEDIUM);
      });
    });
  });
});
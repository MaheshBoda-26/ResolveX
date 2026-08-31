import { AutonomyGateInput, AutonomyGateResult, RiskLevel } from '@resolvex/shared';
import { AUTONOMY_THRESHOLDS, RISK_LEVELS, AGENT_NAMES } from '@resolvex/shared';

export function checkAutonomyGate(input: AutonomyGateInput): AutonomyGateResult {
  const { agent, action, evidence, policyReferences, permission, risk } = input;

  if (!evidence || evidence.length === 0) {
    return {
      allowed: false,
      reason: 'Missing evidence for action',
      requiredApprovals: ['evidence_required'],
    };
  }

  if (!policyReferences || policyReferences.length === 0) {
    return {
      allowed: false,
      reason: 'Missing policy references for action',
      requiredApprovals: ['policy_required'],
    };
  }

  if (!permission || permission.trim() === '') {
    return {
      allowed: false,
      reason: 'Missing permission check',
      requiredApprovals: ['permission_required'],
    };
  }

  const hasPermission = checkPermission(permission, agent);
  if (!hasPermission) {
    return {
      allowed: false,
      reason: `Permission denied: ${permission}`,
      requiredApprovals: ['permission_check_failed'],
    };
  }

  switch (risk) {
    case RISK_LEVELS.LOW: {
      return {
        allowed: true,
        reason: 'Low risk action with evidence, policy, and permission',
        requiredApprovals: [],
      };
    }

    case RISK_LEVELS.MEDIUM: {
      const isRefund = action === 'refund' || action === 'issue_refund';
      const isUpgrade = action === 'upgrade';
      const isDowngrade = action === 'downgrade';
      const isCancel = action === 'cancel';

      if (isRefund) {
        // Medium risk refund means amount > $50 (determined by determineRiskLevel)
        return {
          allowed: false,
          reason: 'Medium risk refund requires approval (amount exceeds auto threshold)',
          requiredApprovals: ['medium_risk_approval'],
        };
      }

      if (isUpgrade && AUTONOMY_THRESHOLDS.SUBSCRIPTION_CHANGE_AUTO) {
        return {
          allowed: true,
          reason: 'Medium risk subscription upgrade allowed within same tier',
          requiredApprovals: [],
        };
      }

      if (isDowngrade || isCancel) {
        return {
          allowed: false,
          reason: 'Medium risk subscription downgrade/cancel requires approval',
          requiredApprovals: ['medium_risk_approval'],
        };
      }

      return {
        allowed: false,
        reason: 'Medium risk action requires approval for this action type',
        requiredApprovals: ['medium_risk_approval'],
      };
    }

    case RISK_LEVELS.HIGH: {
      return {
        allowed: false,
        reason: 'High risk action requires human approval',
        requiredApprovals: ['human_approval'],
      };
    }

    default: {
      return {
        allowed: false,
        reason: `Unknown risk level: ${risk}`,
        requiredApprovals: ['unknown_risk'],
      };
    }
  }
}

function checkPermission(permission: string, agent: string): boolean {
  const lowerPermission = permission.toLowerCase();
  const lowerAgent = agent.toLowerCase();

  if (lowerPermission.includes('customer_owns_account')) return true;
  if (lowerPermission.includes('active_subscription')) return true;
  if (lowerPermission.includes('billing') && lowerAgent === AGENT_NAMES.BILLING) return true;
  if (lowerPermission.includes('subscription') && lowerAgent === AGENT_NAMES.SUBSCRIPTION) return true;

  return false;
}

export function determineRiskLevel(agent: string, action: string, amount?: number): RiskLevel {
  const lowerAction = action.toLowerCase();
  const lowerAgent = agent.toLowerCase();

  if (lowerAction === 'refund' || lowerAction === 'issue_refund') {
    if (amount !== undefined) {
      if (amount <= AUTONOMY_THRESHOLDS.REFUND_AUTO_MAX) return RISK_LEVELS.LOW;
      if (amount <= AUTONOMY_THRESHOLDS.REFUND_REVIEW_MAX) return RISK_LEVELS.MEDIUM;
      return RISK_LEVELS.HIGH;
    }
    return RISK_LEVELS.MEDIUM;
  }

  if (lowerAction === 'upgrade' || lowerAction === 'downgrade') {
    return RISK_LEVELS.MEDIUM;
  }

  if (lowerAction === 'cancel') {
    return RISK_LEVELS.HIGH;
  }

  if (lowerAction.startsWith('investigate') || lowerAction.startsWith('verify')) {
    return RISK_LEVELS.LOW;
  }

  if (lowerAgent === AGENT_NAMES.TRIAGE) {
    return RISK_LEVELS.LOW;
  }

  return RISK_LEVELS.MEDIUM;
}
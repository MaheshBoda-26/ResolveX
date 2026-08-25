import {
  SubscriptionDecision,
  SubscriptionDecisionSchema,
  Subscription,
  Customer,
  AutonomyGateInput,
  AutonomyGateResult,
} from '@resolvex/shared';

const FRESHWORKS_DOMAIN = process.env['FRESHWORKS_DOMAIN'];
const FRESHWORKS_API_KEY = process.env['FRESHWORKS_API_KEY'];
const FRESHWORKS_BASE_URL = process.env['FRESHWORKS_BASE_URL'] || `https://${FRESHWORKS_DOMAIN}.freshworks.com/crm/sales/api`;

interface FreshworksCustomer {
  id: string;
  name: string;
  email: string;
  plan_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface FreshworksSubscription {
  id: string;
  customer_id: string;
  plan_id: string;
  status: string;
  price: number;
  renewal_at: string;
  updated_at: string;
}

interface SubscriptionTask {
  type: 'upgrade' | 'downgrade' | 'cancel';
  payload: {
    customerId: string;
    targetPlanId?: string;
    message?: string;
  };
}

async function freshworksGet<T>(endpoint: string): Promise<T | null> {
  if (!FRESHWORKS_DOMAIN || !FRESHWORKS_API_KEY) {
    console.warn('Freshworks credentials not configured');
    return null;
  }

  try {
    const response = await fetch(`${FRESHWORKS_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${FRESHWORKS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`Freshworks API error: ${response.status} ${response.statusText}`);
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error('Freshworks API call failed:', error);
    return null;
  }
}

export async function getCustomer(customerId: string): Promise<Customer | null> {
  const data = await freshworksGet<FreshworksCustomer>(`/customers/${customerId}`);
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    planId: data.plan_id,
    status: data.status as Customer['status'],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getSubscription(customerId: string): Promise<Subscription | null> {
  const data = await freshworksGet<FreshworksSubscription>(`/subscriptions?customer_id=${customerId}`);
  if (!data) return null;

  return {
    id: data.id,
    customerId: data.customer_id,
    planId: data.plan_id,
    status: data.status as Subscription['status'],
    price: data.price,
    renewalAt: data.renewal_at,
    updatedAt: data.updated_at,
  };
}

async function callAutonomyGate(input: AutonomyGateInput): Promise<AutonomyGateResult> {
  const gatewayUrl = process.env['AUTONOMY_GATEWAY_URL'] || 'http://localhost:3002';
  try {
    const response = await fetch(`${gatewayUrl}/api/autonomy/gate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error(`Autonomy gate error: ${response.status}`);
      return { allowed: false, reason: 'Autonomy gate unavailable', requiredApprovals: [] };
    }
    return (await response.json()) as AutonomyGateResult;
  } catch (error) {
    console.error('Autonomy gate call failed:', error);
    return { allowed: false, reason: 'Autonomy gate call failed', requiredApprovals: [] };
  }
}

function checkPlanExists(planId: string): boolean {
  const validPlans = ['starter', 'professional', 'enterprise', 'pro', 'basic'];
  return validPlans.includes(planId.toLowerCase());
}

function getPlanTier(planId: string): number {
  const tiers: Record<string, number> = {
    basic: 1,
    starter: 1,
    pro: 2,
    professional: 2,
    enterprise: 3,
  };
  return tiers[planId.toLowerCase()] || 0;
}

export async function processSubscriptionTask(task: SubscriptionTask): Promise<SubscriptionDecision> {
  const { customerId, targetPlanId } = task.payload;
  const evidence: string[] = [];
  const policyReferences: string[] = [];

  const customer = await getCustomer(customerId);
  if (!customer) {
    return SubscriptionDecisionSchema.parse({
      action: 'investigate',
      eligibility: 'ineligible',
      evidence: ['Customer not found in Freshworks'],
      policyReferences: ['POL-CUST-001'],
      requiresApproval: false,
    });
  }
  evidence.push(`Customer found: ${customer.name} (${customer.email})`);

  if (customer.status !== 'active') {
    return SubscriptionDecisionSchema.parse({
      action: 'investigate',
      eligibility: 'ineligible',
      evidence: [...evidence, `Customer status is ${customer.status}, not active`],
      policyReferences: ['POL-CUST-002', 'POL-SUB-001'],
      requiresApproval: false,
    });
  }
  evidence.push('Customer status is active');

  const subscription = await getSubscription(customerId);
  if (!subscription) {
    return SubscriptionDecisionSchema.parse({
      action: 'investigate',
      eligibility: 'ineligible',
      evidence: [...evidence, 'No active subscription found'],
      policyReferences: ['POL-SUB-002'],
      requiresApproval: false,
    });
  }
  evidence.push(`Current subscription: ${subscription.planId} (${subscription.status})`);

  if (subscription.status === 'past_due') {
    return SubscriptionDecisionSchema.parse({
      action: 'investigate',
      eligibility: 'ineligible',
      evidence: [...evidence, 'Subscription is past_due'],
      policyReferences: ['POL-SUB-003', 'POL-BILL-001'],
      requiresApproval: false,
    });
  }
  evidence.push('Subscription is not past_due');

  let action: SubscriptionDecision['action'] = 'none';
  let eligibility: SubscriptionDecision['eligibility'] = 'eligible';
  let requiresApproval = false;

  switch (task.type) {
    case 'upgrade': {
      if (!targetPlanId) {
        action = 'investigate';
        eligibility = 'requires_review';
        evidence.push('No target plan specified for upgrade');
        policyReferences.push('POL-SUB-004');
        break;
      }
      if (!checkPlanExists(targetPlanId)) {
        action = 'investigate';
        eligibility = 'ineligible';
        evidence.push(`Target plan ${targetPlanId} does not exist`);
        policyReferences.push('POL-SUB-005');
        break;
      }
      const currentTier = getPlanTier(subscription.planId);
      const targetTier = getPlanTier(targetPlanId);
      if (targetTier <= currentTier) {
        action = 'investigate';
        eligibility = 'requires_review';
        evidence.push(`Target plan ${targetPlanId} is not an upgrade from ${subscription.planId}`);
        policyReferences.push('POL-SUB-006');
        break;
      }
      action = 'upgrade';
      evidence.push(`Upgrade from ${subscription.planId} to ${targetPlanId} is valid`);
      policyReferences.push('POL-SUB-007', 'POL-SUB-008');
      requiresApproval = false;
      break;
    }
    case 'downgrade': {
      if (!targetPlanId) {
        action = 'investigate';
        eligibility = 'requires_review';
        evidence.push('No target plan specified for downgrade');
        policyReferences.push('POL-SUB-004');
        break;
      }
      if (!checkPlanExists(targetPlanId)) {
        action = 'investigate';
        eligibility = 'ineligible';
        evidence.push(`Target plan ${targetPlanId} does not exist`);
        policyReferences.push('POL-SUB-005');
        break;
      }
      const currentTier = getPlanTier(subscription.planId);
      const targetTier = getPlanTier(targetPlanId);
      if (targetTier >= currentTier) {
        action = 'investigate';
        eligibility = 'requires_review';
        evidence.push(`Target plan ${targetPlanId} is not a downgrade from ${subscription.planId}`);
        policyReferences.push('POL-SUB-006');
        break;
      }
      action = 'downgrade';
      evidence.push(`Downgrade from ${subscription.planId} to ${targetPlanId} is valid`);
      policyReferences.push('POL-SUB-009', 'POL-SUB-010');
      requiresApproval = true;
      break;
    }
    case 'cancel': {
      action = 'cancel';
      evidence.push('Cancellation requested');
      policyReferences.push('POL-SUB-011', 'POL-SUB-012');
      requiresApproval = true;
      break;
    }
  }

  if (action === 'upgrade' || action === 'downgrade') {
    const gateInput: AutonomyGateInput = {
      agent: 'subscription',
      action: task.type,
      evidence,
      policyReferences,
      permission: `subscription.${task.type}`,
      risk: action === 'downgrade' ? 'medium' : 'low',
    };
    const gateResult = await callAutonomyGate(gateInput);
    if (!gateResult.allowed) {
      return SubscriptionDecisionSchema.parse({
        action: 'escalate',
        targetPlanId,
        eligibility: 'requires_review',
        evidence: [...evidence, `Autonomy gate denied: ${gateResult.reason}`],
        policyReferences,
        requiresApproval: true,
      });
    }
    evidence.push(`Autonomy gate approved: ${gateResult.reason}`);
  }

  return SubscriptionDecisionSchema.parse({
    action,
    targetPlanId: task.type !== 'cancel' ? targetPlanId : undefined,
    eligibility,
    evidence,
    policyReferences,
    requiresApproval,
  });
}
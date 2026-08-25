import {
  BillingDecision,
  BillingDecisionSchema,
  Customer,
  Transaction,
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

interface FreshworksTransaction {
  id: string;
  customer_id: string;
  invoice_id: string;
  amount: number;
  currency: string;
  status: string;
  charged_at: string;
  metadata: Record<string, unknown>;
}

interface BillingTask {
  type: 'duplicate_charge' | 'refund_inquiry';
  payload: {
    customerId: string;
    amount?: number;
    invoiceId?: string;
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

export async function getTransactions(customerId: string): Promise<Transaction[]> {
  const data = await freshworksGet<FreshworksTransaction[]>(`/transactions?customer_id=${customerId}`);
  if (!data) return [];

  return data.map(t => ({
    id: t.id,
    customerId: t.customer_id,
    invoiceId: t.invoice_id,
    amount: t.amount,
    currency: t.currency,
    status: t.status as Transaction['status'],
    chargedAt: t.charged_at,
    metadata: t.metadata,
  }));
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

function detectDuplicateCharges(transactions: Transaction[], targetAmount?: number, targetInvoiceId?: string): Transaction[] {
  const candidates = transactions.filter(t => t.status === 'completed');
  if (targetAmount !== undefined) {
    return candidates.filter(t => t.amount === targetAmount && t.invoiceId !== targetInvoiceId);
  }
  const byAmount: Map<number, Transaction[]> = new Map();
  for (const t of candidates) {
    const list = byAmount.get(t.amount) || [];
    list.push(t);
    byAmount.set(t.amount, list);
  }
  const duplicates: Transaction[] = [];
  for (const [, list] of byAmount) {
    if (list.length > 1) {
      for (let i = 0; i < list.length; i++) {
        const tx1 = list[i];
        if (!tx1) continue;
        for (let j = i + 1; j < list.length; j++) {
          const tx2 = list[j];
          if (!tx2) continue;
          const diffMs = Math.abs(new Date(tx1.chargedAt).getTime() - new Date(tx2.chargedAt).getTime());
          if (diffMs <= 24 * 60 * 60 * 1000) {
            duplicates.push(tx1, tx2);
          }
        }
      }
    }
  }
  const uniqueIds = [...new Set(duplicates.map(t => t.id))];
  const result: Transaction[] = [];
  for (const id of uniqueIds) {
    const found = duplicates.find(t => t.id === id);
    if (found) result.push(found);
  }
  return result;
}

async function checkPolicy(action: string, evidence: string[]): Promise<string[]> {
  const refs: string[] = [];
  if (action === 'refund') {
    refs.push('POL-BILL-001', 'POL-BILL-002');
    if (evidence.some(e => e.includes('duplicate'))) {
      refs.push('POL-BILL-003');
    }
  }
  if (action === 'investigate') {
    refs.push('POL-BILL-004');
  }
  if (action === 'escalate') {
    refs.push('POL-BILL-005');
  }
  return refs;
}

export async function processBillingTask(task: BillingTask): Promise<BillingDecision> {
  const { customerId, amount, invoiceId } = task.payload;
  const evidence: string[] = [];
  const policyReferences: string[] = [];

  const customer = await getCustomer(customerId);
  if (!customer) {
    return BillingDecisionSchema.parse({
      action: 'investigate',
      evidence: ['Customer not found in Freshworks'],
      policyReferences: ['POL-CUST-001'],
      requiresApproval: false,
    });
  }
  evidence.push(`Customer found: ${customer.name} (${customer.email})`);

  const transactions = await getTransactions(customerId);
  evidence.push(`Found ${transactions.length} transactions for customer`);

  let action: BillingDecision['action'] = 'none';
  let refundAmount: number | undefined;

  if (task.type === 'duplicate_charge') {
    const duplicates = detectDuplicateCharges(transactions, amount, invoiceId);
    if (duplicates.length === 0) {
      action = 'none';
      evidence.push('No duplicate charges detected within 24 hours');
      policyReferences.push('POL-BILL-006');
    } else {
      action = 'refund';
      const firstDuplicate = duplicates[0];
      if (firstDuplicate) {
        refundAmount = firstDuplicate.amount;
      }
      evidence.push(`Duplicate charge detected: ${duplicates.length} transactions with amount $${refundAmount} within 24h`);
      evidence.push(`Invoice IDs: ${duplicates.map(d => d.invoiceId).join(', ')}`);
      policyReferences.push('POL-BILL-001', 'POL-BILL-003');
    }
  } else if (task.type === 'refund_inquiry') {
    if (amount === undefined) {
      action = 'investigate';
      evidence.push('Refund inquiry without specific amount');
      policyReferences.push('POL-BILL-004');
    } else {
      const matchingTx = transactions.find(t => t.amount === amount && t.invoiceId === invoiceId && t.status === 'completed');
      if (!matchingTx) {
        action = 'investigate';
        evidence.push(`No matching completed transaction for amount $${amount}`);
        policyReferences.push('POL-BILL-004');
      } else {
        action = 'refund';
        refundAmount = amount;
        evidence.push(`Valid refund request for transaction ${matchingTx.invoiceId} ($${amount})`);
        policyReferences.push('POL-BILL-001', 'POL-BILL-002');
      }
    }
  }

  const policyRefs = await checkPolicy(action, evidence);
  policyReferences.push(...policyRefs);

  const requiresApproval = refundAmount !== undefined && refundAmount > 50;
  const risk = refundAmount !== undefined && refundAmount > 500 ? 'high' : refundAmount !== undefined && refundAmount > 50 ? 'medium' : 'low';

  if (action === 'refund') {
    const gateInput: AutonomyGateInput = {
      agent: 'billing',
      action: 'refund',
      evidence,
      policyReferences,
      permission: 'billing.refund',
      risk,
    };
    const gateResult = await callAutonomyGate(gateInput);
    if (!gateResult.allowed) {
      return BillingDecisionSchema.parse({
        action: 'escalate',
        amount: refundAmount,
        evidence: [...evidence, `Autonomy gate denied: ${gateResult.reason}`],
        policyReferences,
        requiresApproval: true,
      });
    }
    evidence.push(`Autonomy gate approved: ${gateResult.reason}`);
  }

  return BillingDecisionSchema.parse({
    action,
    amount: refundAmount,
    evidence,
    policyReferences,
    requiresApproval,
  });
}
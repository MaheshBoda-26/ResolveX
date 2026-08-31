import { db } from '../db/client';
import { verifications, toolCalls } from '../db/schema';
import { eq } from 'drizzle-orm';
import {
  getCustomer,
  getTransactions,
  getSubscription,
  verifyCustomerState as freshworksVerifyCustomerState,
} from '../actions/freshworks';
import type { Customer, Transaction, Subscription } from '@resolvex/shared';

export interface RefundVerificationInput {
  customerId: string;
  expectedRefundAmount: number;
  invoiceId: string;
}

export interface UpgradeVerificationInput {
  customerId: string;
  expectedPlanId: string;
}

export interface CustomerStateVerificationInput {
  customerId: string;
  expectedState: Record<string, unknown>;
}

export interface VerificationResult {
  verified: boolean;
  differences: Record<string, { expected: unknown; actual: unknown }>;
  observedState?: Record<string, unknown>;
}

async function createVerificationRecord(
  agentRunId: string,
  conversationId: string,
  actionType: string,
  expectedState: Record<string, unknown>,
  observedState: Record<string, unknown> | null,
  status: 'verified' | 'mismatch' | 'failed'
): Promise<void> {
  await db.insert(verifications).values({
    conversationId: conversationId as any,
    actionType,
    expectedState: expectedState as any,
    observedState: observedState as any,
    status,
  } as any);
}

export async function verifyRefund(
  agentRunId: string,
  conversationId: string,
  input: RefundVerificationInput
): Promise<VerificationResult> {
  const startTime = Date.now();

  try {
    const transactions = await getTransactions(agentRunId, { customerId: input.customerId });

    const refundTx = transactions.find(t =>
      t.invoiceId === input.invoiceId &&
      t.status === 'refunded'
    );

    const expectedState = {
      invoiceId: input.invoiceId,
      refundAmount: input.expectedRefundAmount,
      status: 'refunded',
    };

    let observedState: Record<string, unknown> = {
      invoiceId: input.invoiceId,
      status: 'not_found',
    };

    if (refundTx) {
      observedState = {
        invoiceId: refundTx.invoiceId,
        refundAmount: Number(refundTx.amount),
        status: refundTx.status,
        chargedAt: refundTx.chargedAt,
        transactionId: refundTx.id,
      };
    }

    const differences: Record<string, { expected: unknown; actual: unknown }> = {};

    if (refundTx) {
      if (Number(refundTx.amount) !== input.expectedRefundAmount) {
        differences['refundAmount'] = {
          expected: input.expectedRefundAmount,
          actual: Number(refundTx.amount)
        };
      }
      if (refundTx.status !== 'refunded') {
        differences['status'] = {
          expected: 'refunded',
          actual: refundTx.status
        };
      }
    } else {
      differences['refundAmount'] = {
        expected: input.expectedRefundAmount,
        actual: null
      };
      differences['status'] = {
        expected: 'refunded',
        actual: 'not_found'
      };
    }

    const verified = Object.keys(differences).length === 0;
    const status = verified ? 'verified' : 'mismatch';

    await createVerificationRecord(
      agentRunId,
      conversationId,
      'refund',
      expectedState,
      observedState,
      status
    );

    return { verified, differences, observedState };
  } catch (error) {
    await createVerificationRecord(
      agentRunId,
      conversationId,
      'refund',
      { invoiceId: input.invoiceId, refundAmount: input.expectedRefundAmount },
      null,
      'failed'
    );
    throw error;
  }
}

export async function verifyUpgrade(
  agentRunId: string,
  conversationId: string,
  input: UpgradeVerificationInput
): Promise<VerificationResult> {
  try {
    const customer = await getCustomer(agentRunId, { customerId: input.customerId });
    const subscription = await getSubscription(agentRunId, { customerId: input.customerId });

    const expectedState = {
      customerPlanId: input.expectedPlanId,
      subscriptionPlanId: input.expectedPlanId,
    };

    const observedState: Record<string, unknown> = {
      customerPlanId: customer?.planId ?? null,
      subscriptionPlanId: subscription?.planId ?? null,
      subscriptionStatus: subscription?.status ?? null,
      subscriptionId: subscription?.id ?? null,
    };

    const differences: Record<string, { expected: unknown; actual: unknown }> = {};

    if (customer?.planId !== input.expectedPlanId) {
      differences['customerPlanId'] = {
        expected: input.expectedPlanId,
        actual: customer?.planId ?? null
      };
    }

    if (subscription?.planId !== input.expectedPlanId) {
      differences['subscriptionPlanId'] = {
        expected: input.expectedPlanId,
        actual: subscription?.planId ?? null
      };
    }

    const verified = Object.keys(differences).length === 0;
    const status = verified ? 'verified' : 'mismatch';

    await createVerificationRecord(
      agentRunId,
      conversationId,
      'upgrade',
      expectedState,
      observedState,
      status
    );

    return { verified, differences, observedState };
  } catch (error) {
    await createVerificationRecord(
      agentRunId,
      conversationId,
      'upgrade',
      { expectedPlanId: input.expectedPlanId },
      null,
      'failed'
    );
    throw error;
  }
}

export async function verifyCustomerState(
  agentRunId: string,
  conversationId: string,
  input: CustomerStateVerificationInput
): Promise<VerificationResult> {
  try {
    // Delegate to Freshworks verifyCustomerState which already does the comparison
    const result = await freshworksVerifyCustomerState(agentRunId, {
      customerId: input.customerId,
      expectedState: input.expectedState,
    });

    const status = result.verified ? 'verified' : 'mismatch';

    await createVerificationRecord(
      agentRunId,
      conversationId,
      'customer_state',
      input.expectedState,
      result.observedState,
      status
    );

    return {
      verified: result.verified,
      differences: result.differences,
      observedState: result.observedState,
    };
  } catch (error) {
    await createVerificationRecord(
      agentRunId,
      conversationId,
      'customer_state',
      input.expectedState,
      null,
      'failed'
    );
    throw error;
  }
}

export async function getVerificationHistory(
  conversationId: string
): Promise<Array<{
  id: string;
  actionType: string;
  expectedState: Record<string, unknown>;
  observedState: Record<string, unknown> | null;
  status: string;
  createdAt: Date;
}>> {
  const results = await db
    .select()
    .from(verifications)
    .where(eq(verifications.conversationId, conversationId as any))
    .orderBy(verifications.createdAt);

  return results.map(r => ({
    id: r.id,
    actionType: r.actionType,
    expectedState: r.expectedState as Record<string, unknown>,
    observedState: r.observedState as Record<string, unknown> | null,
    status: r.status,
    createdAt: r.createdAt,
  }));
}
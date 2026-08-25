import { db } from '../db/client';
import { toolCalls, customers, transactions, subscriptions } from '../db/schema';
import { eq } from 'drizzle-orm';
import {
  CustomerSchema,
  TransactionSchema,
  SubscriptionSchema,
  type Customer,
  type Transaction,
  type Subscription,
  type ToolCall,
} from '@resolvex/shared';
import z from 'zod';
import { searchPolicies } from '../knowledge';

const FRESHWORKS_DOMAIN = process.env['FRESHWORKS_DOMAIN'];
const FRESHWORKS_API_KEY = process.env['FRESHWORKS_API_KEY'];

if (!FRESHWORKS_DOMAIN || !FRESHWORKS_API_KEY) {
  console.warn('Freshworks credentials not configured');
}

const FRESHWORKS_BASE_URL = `https://${FRESHWORKS_DOMAIN}`;

const GetCustomerInputSchema = z.object({
  customerId: z.uuid(),
});

const GetTransactionsInputSchema = z.object({
  customerId: z.uuid(),
});

const GetSubscriptionInputSchema = z.object({
  customerId: z.uuid(),
});

const CheckPolicyInputSchema = z.object({
  query: z.string().min(1).max(2000),
});

const IssueRefundInputSchema = z.object({
  customerId: z.uuid(),
  amount: z.number().positive(),
  invoiceId: z.string().min(1).max(100),
  reason: z.string().min(1).max(500),
});

const UpgradeSubscriptionInputSchema = z.object({
  customerId: z.uuid(),
  targetPlanId: z.string().min(1).max(100),
});

const VerifyCustomerStateInputSchema = z.object({
  customerId: z.uuid(),
  expectedState: z.record(z.string(), z.unknown()),
});

interface FreshworksCustomerResponse {
  customer: {
    id: string;
    name: string;
    email: string;
    plan_id: string;
    status: string;
    created_at: string;
    updated_at: string;
  };
}

interface FreshworksTransactionsResponse {
  transactions: Array<{
    id: string;
    customer_id: string;
    invoice_id: string;
    amount: number;
    currency: string;
    status: string;
    charged_at: string;
    metadata: Record<string, unknown>;
  }>;
}

interface FreshworksSubscriptionResponse {
  subscription: {
    id: string;
    customer_id: string;
    plan_id: string;
    status: string;
    price: number;
    renewal_at: string;
    updated_at: string;
  };
}

interface FreshworksRefundResponse {
  refund: {
    id: string;
    amount: number;
    invoice_id: string;
    status: string;
    created_at: string;
  };
}

interface FreshworksUpgradeResponse {
  subscription: {
    id: string;
    plan_id: string;
    status: string;
    price: number;
    renewal_at: string;
    updated_at: string;
  };
}

interface FreshworksVerifyResponse {
  customer: {
    id: string;
    name: string;
    email: string;
    plan_id: string;
    status: string;
    updated_at: string;
  };
  subscription?: {
    id: string;
    plan_id: string;
    status: string;
    price: number;
    renewal_at: string;
  };
}

async function freshworksFetch<T>(
  path: string,
  options: RequestInit = {},
  retries = 0
): Promise<T | null> {
  if (!FRESHWORKS_DOMAIN || !FRESHWORKS_API_KEY) {
    throw new Error('Freshworks credentials not configured');
  }

  const url = `${FRESHWORKS_BASE_URL}${path}`;
  const headers = {
    'Authorization': `Bearer ${FRESHWORKS_API_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Freshworks API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json() as T;
  } catch (error) {
    if (retries > 0 && options.method !== 'GET' && error instanceof Error) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
      return freshworksFetch<T>(path, options, retries - 1);
    }
    throw error;
  }
}

async function recordToolCall(
  agentRunId: string,
  toolName: string,
  args: Record<string, unknown>,
  result: Record<string, unknown> | null,
  status: 'success' | 'failed',
  latencyMs: number
): Promise<void> {
  await db.insert(toolCalls).values({
    agentRunId: agentRunId as any,
    toolName,
    arguments: args,
    result: result ?? null,
    status,
    latencyMs: latencyMs.toString(),
  } as any);
}

export async function getCustomer(
  agentRunId: string,
  input: z.infer<typeof GetCustomerInputSchema>
): Promise<Customer | null> {
  const startTime = Date.now();
  const validatedInput = GetCustomerInputSchema.parse(input);

  try {
    const response = await freshworksFetch<FreshworksCustomerResponse>(
      `/crm/sales/api/contacts/${validatedInput.customerId}`,
      { method: 'GET' },
      2
    );

    if (!response?.customer) {
      const result = { error: 'Customer not found', customerId: validatedInput.customerId };
      await recordToolCall(agentRunId, 'getCustomer', validatedInput, result, 'failed', Date.now() - startTime);
      return null;
    }

    const customer = CustomerSchema.parse({
      id: response.customer.id,
      name: response.customer.name,
      email: response.customer.email,
      planId: response.customer.plan_id,
      status: response.customer.status,
      createdAt: response.customer.created_at,
      updatedAt: response.customer.updated_at,
    });

    await recordToolCall(agentRunId, 'getCustomer', validatedInput, customer, 'success', Date.now() - startTime);
    return customer;
  } catch (error) {
    const result = { error: error instanceof Error ? error.message : 'Unknown error', customerId: validatedInput.customerId };
    await recordToolCall(agentRunId, 'getCustomer', validatedInput, result, 'failed', Date.now() - startTime);
    throw error;
  }
}

export async function getTransactions(
  agentRunId: string,
  input: z.infer<typeof GetTransactionsInputSchema>
): Promise<Transaction[]> {
  const startTime = Date.now();
  const validatedInput = GetTransactionsInputSchema.parse(input);

  try {
    const response = await freshworksFetch<FreshworksTransactionsResponse>(
      `/crm/sales/api/contacts/${validatedInput.customerId}/transactions`,
      { method: 'GET' },
      2
    );

    if (!response?.transactions) {
      const result = { error: 'No transactions found', customerId: validatedInput.customerId, transactions: [] };
      await recordToolCall(agentRunId, 'getTransactions', validatedInput, result, 'failed', Date.now() - startTime);
      return [];
    }

    const transactionsList = response.transactions.map(t =>
      TransactionSchema.parse({
        id: t.id,
        customerId: t.customer_id,
        invoiceId: t.invoice_id,
        amount: t.amount,
        currency: t.currency,
        status: t.status,
        chargedAt: t.charged_at,
        metadata: t.metadata,
      })
    );

    const result = { transactions: transactionsList, count: transactionsList.length };
    await recordToolCall(agentRunId, 'getTransactions', validatedInput, result, 'success', Date.now() - startTime);
    return transactionsList;
  } catch (error) {
    const result = { error: error instanceof Error ? error.message : 'Unknown error', customerId: validatedInput.customerId };
    await recordToolCall(agentRunId, 'getTransactions', validatedInput, result, 'failed', Date.now() - startTime);
    throw error;
  }
}

export async function getSubscription(
  agentRunId: string,
  input: z.infer<typeof GetSubscriptionInputSchema>
): Promise<Subscription | null> {
  const startTime = Date.now();
  const validatedInput = GetSubscriptionInputSchema.parse(input);

  try {
    const response = await freshworksFetch<FreshworksSubscriptionResponse>(
      `/crm/sales/api/contacts/${validatedInput.customerId}/subscriptions`,
      { method: 'GET' },
      2
    );

    if (!response?.subscription) {
      const result = { error: 'Subscription not found', customerId: validatedInput.customerId };
      await recordToolCall(agentRunId, 'getSubscription', validatedInput, result, 'failed', Date.now() - startTime);
      return null;
    }

    const subscription = SubscriptionSchema.parse({
      id: response.subscription.id,
      customerId: response.subscription.customer_id,
      planId: response.subscription.plan_id,
      status: response.subscription.status,
      price: response.subscription.price,
      renewalAt: response.subscription.renewal_at,
      updatedAt: response.subscription.updated_at,
    });

    await recordToolCall(agentRunId, 'getSubscription', validatedInput, subscription, 'success', Date.now() - startTime);
    return subscription;
  } catch (error) {
    const result = { error: error instanceof Error ? error.message : 'Unknown error', customerId: validatedInput.customerId };
    await recordToolCall(agentRunId, 'getSubscription', validatedInput, result, 'failed', Date.now() - startTime);
    throw error;
  }
}

export async function checkPolicy(
  agentRunId: string,
  input: z.infer<typeof CheckPolicyInputSchema>
): Promise<{ answer: string; sources: Array<{ title: string; source: string; relevance: number }> }> {
  const startTime = Date.now();
  const validatedInput = CheckPolicyInputSchema.parse(input);

  try {
    const results = await searchPolicies({ query: validatedInput.query, limit: 5 });

    if (results.length === 0) {
      const formattedResult = {
        answer: 'No relevant policy documents found for this query.',
        sources: [],
      };
      await recordToolCall(agentRunId, 'checkPolicy', validatedInput, formattedResult, 'success', Date.now() - startTime);
      return formattedResult;
    }

    const context = results.map(r => `[${r.title}]: ${r.content.slice(0, 500)}`).join('\n\n');
    const answer = await generateAnswer(validatedInput.query, context);

    const formattedResult = {
      answer,
      sources: results.map(r => ({
        title: r.title,
        source: r.source,
        relevance: r.similarity,
      })),
    };

    await recordToolCall(agentRunId, 'checkPolicy', validatedInput, formattedResult, 'success', Date.now() - startTime);
    return formattedResult;
  } catch (error) {
    const result = { error: error instanceof Error ? error.message : 'Unknown error', query: validatedInput.query };
    await recordToolCall(agentRunId, 'checkPolicy', validatedInput, result, 'failed', Date.now() - startTime);
    throw error;
  }
}

async function generateAnswer(query: string, context: string): Promise<string> {
  const apiKey = process.env['OPENAI_API_KEY'] || process.env['LLM_API_KEY'];
  if (!apiKey) {
    return `Based on the available policy documents:\n\n${context}\n\n(Configure LLM_API_KEY for synthesized answers)`;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a policy expert for a subscription billing company. Answer the user question based only on the provided context. If the context does not contain enough information, say so. Be concise and cite sources.',
          },
          {
            role: 'user',
            content: `Question: ${query}\n\nContext:\n${context}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content ?? 'Unable to generate answer';
  } catch (error) {
    console.error('Answer generation failed:', error);
    return `Based on the available policy documents:\n\n${context}\n\n(Error generating synthesized answer)`;
  }
}

export async function issueRefund(
  agentRunId: string,
  input: z.infer<typeof IssueRefundInputSchema>
): Promise<{ refundId: string; amount: number; status: string }> {
  const startTime = Date.now();
  const validatedInput = IssueRefundInputSchema.parse(input);

  try {
    const response = await freshworksFetch<FreshworksRefundResponse>(
      `/crm/sales/api/transactions/${validatedInput.invoiceId}/refund`,
      {
        method: 'POST',
        body: JSON.stringify({
          amount: validatedInput.amount,
          reason: validatedInput.reason,
        }),
      },
      3
    );

    if (!response?.refund) {
      const result = { error: 'Refund failed', invoiceId: validatedInput.invoiceId };
      await recordToolCall(agentRunId, 'issueRefund', validatedInput, result, 'failed', Date.now() - startTime);
      throw new Error('Refund failed: No refund returned from API');
    }

    const refundResult = {
      refundId: response.refund.id,
      amount: response.refund.amount,
      status: response.refund.status,
    };

    await recordToolCall(agentRunId, 'issueRefund', validatedInput, refundResult, 'success', Date.now() - startTime);
    return refundResult;
  } catch (error) {
    const result = { error: error instanceof Error ? error.message : 'Unknown error', invoiceId: validatedInput.invoiceId };
    await recordToolCall(agentRunId, 'issueRefund', validatedInput, result, 'failed', Date.now() - startTime);
    throw error;
  }
}

export async function upgradeSubscription(
  agentRunId: string,
  input: z.infer<typeof UpgradeSubscriptionInputSchema>
): Promise<{ subscriptionId: string; planId: string; status: string; price: number }> {
  const startTime = Date.now();
  const validatedInput = UpgradeSubscriptionInputSchema.parse(input);

  try {
    const response = await freshworksFetch<FreshworksUpgradeResponse>(
      `/crm/sales/api/contacts/${validatedInput.customerId}/subscriptions/upgrade`,
      {
        method: 'POST',
        body: JSON.stringify({
          target_plan_id: validatedInput.targetPlanId,
        }),
      },
      3
    );

    if (!response?.subscription) {
      const result = { error: 'Upgrade failed', customerId: validatedInput.customerId, targetPlanId: validatedInput.targetPlanId };
      await recordToolCall(agentRunId, 'upgradeSubscription', validatedInput, result, 'failed', Date.now() - startTime);
      throw new Error('Upgrade failed: No subscription returned from API');
    }

    const upgradeResult = {
      subscriptionId: response.subscription.id,
      planId: response.subscription.plan_id,
      status: response.subscription.status,
      price: response.subscription.price,
    };

    await recordToolCall(agentRunId, 'upgradeSubscription', validatedInput, upgradeResult, 'success', Date.now() - startTime);
    return upgradeResult;
  } catch (error) {
    const result = { error: error instanceof Error ? error.message : 'Unknown error', customerId: validatedInput.customerId, targetPlanId: validatedInput.targetPlanId };
    await recordToolCall(agentRunId, 'upgradeSubscription', validatedInput, result, 'failed', Date.now() - startTime);
    throw error;
  }
}

export async function verifyCustomerState(
  agentRunId: string,
  input: z.infer<typeof VerifyCustomerStateInputSchema>
): Promise<{ verified: boolean; differences: Record<string, { expected: unknown; actual: unknown }>; observedState: Record<string, unknown> }> {
  const startTime = Date.now();
  const validatedInput = VerifyCustomerStateInputSchema.parse(input);

  try {
    const customer = await getCustomer(agentRunId, { customerId: validatedInput.customerId });
    if (!customer) {
      const result = { error: 'Customer not found for verification', customerId: validatedInput.customerId };
      await recordToolCall(agentRunId, 'verifyCustomerState', validatedInput, result, 'failed', Date.now() - startTime);
      return { verified: false, differences: { customer: { expected: validatedInput.expectedState, actual: null } }, observedState: {} };
    }

    const subscription = await getSubscription(agentRunId, { customerId: validatedInput.customerId });

    const observedState: Record<string, unknown> = {
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        planId: customer.planId,
        status: customer.status,
        updatedAt: customer.updatedAt,
      },
      subscription: subscription ? {
        id: subscription.id,
        planId: subscription.planId,
        status: subscription.status,
        price: subscription.price,
        renewalAt: subscription.renewalAt,
      } : null,
    };

    const differences: Record<string, { expected: unknown; actual: unknown }> = {};

    for (const [key, expectedValue] of Object.entries(validatedInput.expectedState)) {
      const actualValue = observedState[key];
      if (JSON.stringify(expectedValue) !== JSON.stringify(actualValue)) {
        differences[key] = { expected: expectedValue, actual: actualValue };
      }
    }

    const verified = Object.keys(differences).length === 0;

    const result = { verified, differences, observedState };
    await recordToolCall(agentRunId, 'verifyCustomerState', validatedInput, result, 'success', Date.now() - startTime);
    return { verified, differences, observedState };
  } catch (error) {
    const result = { error: error instanceof Error ? error.message : 'Unknown error', customerId: validatedInput.customerId };
    await recordToolCall(agentRunId, 'verifyCustomerState', validatedInput, result, 'failed', Date.now() - startTime);
    return { verified: false, differences: { error: { expected: 'success', actual: error instanceof Error ? error.message : 'Unknown error' } }, observedState: {} };
  }
}
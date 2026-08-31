import { TriageResult, Intent, Task, ChatRequest } from '@resolvex/shared';
import { withTracing, addSpanEvent } from '../lib/telemetry.js';
import { createAgentLogger, logAgentOperation } from '../lib/logging.js';

const FRESHWORKS_DOMAIN = process.env['FRESHWORKS_DOMAIN'];
const FRESHWORKS_API_KEY = process.env['FRESHWORKS_API_KEY'];
const FRESHWORKS_AGENT_STUDIO_URL = process.env['FRESHWORKS_AGENT_STUDIO_URL'];

export interface FreshworksTriageResponse {
  intents: Array<{
    name: string;
    confidence: number;
    entities: Record<string, unknown>;
  }>;
  tasks: Array<{
    agent: string;
    type: string;
    payload: Record<string, unknown>;
    priority: 'high' | 'normal' | 'low';
  }>;
  summary: string;
}

function mapIntentType(name: string): Intent['type'] {
  const lower = name.toLowerCase();
  if (lower.includes('billing') || lower.includes('payment') || lower.includes('invoice') || lower.includes('refund')) {
    return 'billing';
  }
  if (lower.includes('subscription') || lower.includes('plan') || lower.includes('upgrade') || lower.includes('downgrade') || lower.includes('cancel')) {
    return 'subscription';
  }
  return 'general';
}

function mapAgentType(agent: string): Task['agent'] {
  const lower = agent.toLowerCase();
  if (lower.includes('billing')) return 'billing';
  if (lower.includes('subscription')) return 'subscription';
  return 'triage';
}

function mapPriority(priority: string): Task['priority'] {
  const lower = priority.toLowerCase();
  if (lower === 'high' || lower === 'urgent' || lower === 'critical') return 'high';
  if (lower === 'low') return 'low';
  return 'normal';
}

async function callFreshworksTriage(message: string): Promise<FreshworksTriageResponse | null> {
  return withTracing('callFreshworksTriage', async (span) => {
    span.setAttribute('message.length', message.length);

    if (!FRESHWORKS_DOMAIN || !FRESHWORKS_API_KEY || !FRESHWORKS_AGENT_STUDIO_URL) {
      addSpanEvent('credentials_not_configured');
      console.warn('Freshworks credentials not configured, skipping intent detection');
      return null;
    }

    try {
      const response = await fetch(`${FRESHWORKS_AGENT_STUDIO_URL}/api/triage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FRESHWORKS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        addSpanEvent('api_error', { status: response.status, statusText: response.statusText });
        console.error(`Freshworks API error: ${response.status} ${response.statusText}`);
        return null;
      }

      addSpanEvent('api_response_received');
      return await response.json() as FreshworksTriageResponse;
    } catch (error) {
      addSpanEvent('fetch_error', { error: error instanceof Error ? error.message : 'Unknown' });
      console.error('Freshworks triage call failed:', error);
      return null;
    }
  });
}

function extractTargetPlan(message: string): string | undefined {
  const lower = message.toLowerCase();
  const plans = ['enterprise', 'pro', 'professional', 'basic', 'starter'];
  for (const plan of plans) {
    if (lower.includes(plan)) {
      // Check if it's a target plan (e.g., "upgrade to enterprise" or "plan to pro")
      const upgradePattern = new RegExp(`(?:upgrade|change|switch|move).*\\b${plan}\\b`, 'i');
      const planPattern = new RegExp(`\\bplan\\s+is\\s+${plan}\\b`, 'i');
      const toPattern = new RegExp(`\\bto\\s+${plan}\\b`, 'i');
      if (upgradePattern.test(lower) || planPattern.test(lower) || toPattern.test(lower)) {
        return plan;
      }
    }
  }
  return undefined;
}

function fallbackTriage(message: string): TriageResult {
  const lower = message.toLowerCase();
  const intents: Intent[] = [];
  const tasks: Task[] = [];

  if (lower.includes('bill') || lower.includes('payment') || lower.includes('invoice') || lower.includes('refund') || lower.includes('charge')) {
    intents.push({ type: 'billing', confidence: 0.7, entities: {} });
    tasks.push({
      id: crypto.randomUUID(),
      agent: 'billing',
      type: 'investigate_billing_issue',
      payload: { message },
      priority: 'normal',
    });
  }

  if (lower.includes('subscript') || lower.includes('plan') || lower.includes('upgrade') || lower.includes('downgrade') || lower.includes('cancel')) {
    intents.push({ type: 'subscription', confidence: 0.7, entities: {} });
    const targetPlanId = extractTargetPlan(message);
    tasks.push({
      id: crypto.randomUUID(),
      agent: 'subscription',
      type: targetPlanId ? 'change_plan' : 'investigate_subscription_issue',
      payload: { message, targetPlanId },
      priority: 'normal',
    });
  }

  if (intents.length === 0) {
    intents.push({ type: 'general', confidence: 0.5, entities: {} });
  }

  return {
    intents,
    tasks,
    summary: `Triage analysis for: ${message.slice(0, 100)}`,
  };
}

export async function triageMessage(request: ChatRequest): Promise<TriageResult> {
  return withTracing('triageMessage', async (span) => {
    span.setAttribute('message.length', request.message.length);
    span.setAttribute('customerId', request.customerId ?? 'unknown');
    span.setAttribute('channel', request.channel);

    const logger = createAgentLogger('triage', crypto.randomUUID());
    logAgentOperation(logger, 'triageMessage', 'started', { messageLength: request.message.length });

    const freshworksResult = await callFreshworksTriage(request.message);

    if (freshworksResult) {
      addSpanEvent('freshworks_result_received', { intentCount: freshworksResult.intents.length, taskCount: freshworksResult.tasks.length });
      const result = {
        intents: freshworksResult.intents.map(i => ({
          type: mapIntentType(i.name),
          confidence: i.confidence,
          entities: i.entities,
        })),
        tasks: freshworksResult.tasks.map(t => ({
          id: crypto.randomUUID(),
          agent: mapAgentType(t.agent),
          type: t.type,
          payload: t.payload,
          priority: mapPriority(t.priority),
        })),
        summary: freshworksResult.summary,
      };
      logAgentOperation(logger, 'triageMessage', 'completed', {
        intentCount: result.intents.length,
        taskCount: result.tasks.length,
        source: 'freshworks'
      });
      return result;
    }

    const result = fallbackTriage(request.message);
    addSpanEvent('fallback_triage_used');
    logAgentOperation(logger, 'triageMessage', 'completed', {
      intentCount: result.intents.length,
      taskCount: result.tasks.length,
      source: 'fallback'
    });
    return result;
  });
}
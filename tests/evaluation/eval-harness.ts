import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatRequest, TriageResult, Task, Intent, BillingDecision, SubscriptionDecision, OrchestratorResult } from '@resolvex/shared';
import { triageMessage } from '../../apps/api/src/agents/triage';
import { processBillingTask } from '../../apps/api/src/agents/billing';
import { processSubscriptionTask } from '../../apps/api/src/agents/subscription';
import { orchestrateWorkflow, createAgentContext, messageBus } from '../../apps/api/src/agents/orchestrator';

export interface EvaluationCase {
  id: string;
  category: string;
  input: ChatRequest;
  expected: {
    intents: Intent['type'][];
    tasks: Task['agent'][];
    finalState: OrchestratorResult['status'];
    handoffReason?: string;
  };
}

export interface CaseMetrics {
  caseId: string;
  category: string;
  passed: boolean;
  latencyMs: number;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  actualResult: OrchestratorResult;
  expectedResult: EvaluationCase['expected'];
}

export interface EvaluationReport {
  total: number;
  passed: number;
  failed: number;
  accuracy: number;
  avgLatencyMs: number;
  totalTokens: number;
  byCategory: Record<string, {
    total: number;
    passed: number;
    failed: number;
    accuracy: number;
    avgLatencyMs: number;
  }>;
  caseResults: CaseMetrics[];
}

function createMockRequest(message: string, customerId?: string, channel: 'chat' | 'voice' = 'chat'): ChatRequest {
  return {
    message,
    customerId: customerId ?? '00000000-0000-0000-0000-000000000001',
    channel,
  };
}

async function runSingleCase(testCase: EvaluationCase): Promise<CaseMetrics> {
  const startTime = Date.now();
  const conversationId = crypto.randomUUID();
  const traceId = crypto.randomUUID();

  let triageResult: TriageResult;
  let orchestratorResult: OrchestratorResult;

  try {
    triageResult = await triageMessage(testCase.input);
    const context = createAgentContext(testCase.input, conversationId, traceId);
    orchestratorResult = await orchestrateWorkflow(triageResult, testCase.input, context);
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return {
      caseId: testCase.id,
      category: testCase.category,
      passed: false,
      latencyMs,
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      actualResult: {
        status: 'error',
        decisions: [],
        traceId,
        conversationId,
      },
      expectedResult: testCase.expected,
    };
  }

  const latencyMs = Date.now() - startTime;

  const intentMatch = testCase.expected.intents.every(expectedIntent =>
    triageResult.intents.some(i => i.type === expectedIntent)
  );
  const taskMatch = testCase.expected.tasks.every(expectedTask =>
    triageResult.tasks.some(t => t.agent === expectedTask)
  );
  const stateMatch = orchestratorResult.status === testCase.expected.finalState;

  const passed = intentMatch && taskMatch && stateMatch;

  const tokenUsage = {
    promptTokens: Math.ceil(testCase.input.message.length / 4),
    completionTokens: Math.ceil(JSON.stringify(orchestratorResult).length / 4),
    totalTokens: 0,
  };
  tokenUsage.totalTokens = tokenUsage.promptTokens + tokenUsage.completionTokens;

  return {
    caseId: testCase.id,
    category: testCase.category,
    passed,
    latencyMs,
    tokenUsage,
    actualResult: orchestratorResult,
    expectedResult: testCase.expected,
  };
}

export async function runEvaluationSuite(cases: EvaluationCase[]): Promise<EvaluationReport> {
  const caseResults: CaseMetrics[] = [];

  for (const testCase of cases) {
    const result = await runSingleCase(testCase);
    caseResults.push(result);
  }

  const passed = caseResults.filter(r => r.passed).length;
  const failed = caseResults.filter(r => !r.passed).length;
  const total = cases.length;
  const accuracy = total > 0 ? (passed / total) * 100 : 0;

  const totalLatency = caseResults.reduce((sum, r) => sum + r.latencyMs, 0);
  const avgLatencyMs = total > 0 ? totalLatency / total : 0;
  const totalTokens = caseResults.reduce((sum, r) => sum + r.tokenUsage.totalTokens, 0);

  const byCategory: Record<string, { total: number; passed: number; failed: number; accuracy: number; avgLatencyMs: number }> = {};

  for (const result of caseResults) {
    if (!byCategory[result.category]) {
      byCategory[result.category] = { total: 0, passed: 0, failed: 0, accuracy: 0, avgLatencyMs: 0 };
    }
    byCategory[result.category].total++;
    if (result.passed) {
      byCategory[result.category].passed++;
    } else {
      byCategory[result.category].failed++;
    }
    byCategory[result.category].avgLatencyMs += result.latencyMs;
  }

  for (const [category, stats] of Object.entries(byCategory)) {
    stats.accuracy = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;
    stats.avgLatencyMs = stats.total > 0 ? stats.avgLatencyMs / stats.total : 0;
  }

  return {
    total,
    passed,
    failed,
    accuracy,
    avgLatencyMs,
    totalTokens,
    byCategory,
    caseResults,
  };
}

function printEvaluationReport(report: EvaluationReport): void {
  console.log('\n==========================================');
  console.log('E2E EVALUATION REPORT');
  console.log('==========================================');
  console.log(`Total: ${report.total}`);
  console.log(`Passed: ${report.passed}`);
  console.log(`Failed: ${report.failed}`);
  console.log(`Accuracy: ${report.accuracy.toFixed(1)}%`);
  console.log(`Avg Latency: ${report.avgLatencyMs.toFixed(0)}ms`);
  console.log(`Total Tokens: ${report.totalTokens}`);
  console.log('\nBy Category:');

  for (const [category, stats] of Object.entries(report.byCategory)) {
    console.log(`  ${category}: ${stats.passed}/${stats.total} (${stats.accuracy.toFixed(1)}%) avg ${stats.avgLatencyMs.toFixed(0)}ms`);
  }

  const failures = report.caseResults.filter(r => !r.passed);
  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const failure of failures) {
      console.log(`  - ${failure.caseId} (${failure.category})`);
      console.log(`    Expected: status=${failure.expectedResult.finalState}, intents=${failure.expectedResult.intents.join(',')}, tasks=${failure.expectedResult.tasks.join(',')}`);
      console.log(`    Actual:   status=${failure.actualResult.status}, intents=${failure.actualResult.decisions.map(d => d.agent).join(',')}`);
    }
  }

  console.log('==========================================\n');
}

export { createMockRequest, runSingleCase, printEvaluationReport };
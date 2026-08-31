import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runEvaluationSuite, printEvaluationReport, type EvaluationCase, type EvaluationReport } from './eval-harness';
import e2eCases from './fixtures/e2e-cases.json';

describe('E2E Evaluation Suite', () => {
  let report: EvaluationReport;

  beforeAll(async () => {
    const allCases: EvaluationCase[] = [];
    for (const [category, cases] of Object.entries(e2eCases)) {
      for (const testCase of cases) {
        allCases.push(testCase as EvaluationCase);
      }
    }
    report = await runEvaluationSuite(allCases);
    printEvaluationReport(report);
  });

  it('should achieve 90%+ accuracy across all test cases', () => {
    expect(report.accuracy).toBeGreaterThanOrEqual(90);
  });

  it('should pass all BILLING_REFUND_AUTO cases', () => {
    const category = report.byCategory['BILLING_REFUND_AUTO'];
    expect(category).toBeDefined();
    expect(category!.accuracy).toBe(100);
  });

  it('should pass all SUBSCRIPTION_UPGRADE_AUTO cases', () => {
    const category = report.byCategory['SUBSCRIPTION_UPGRADE_AUTO'];
    expect(category).toBeDefined();
    expect(category!.accuracy).toBe(100);
  });

  it('should correctly escalate BILLING_REFUND_ESCALATED cases', () => {
    const category = report.byCategory['BILLING_REFUND_ESCALATED'];
    expect(category).toBeDefined();
    expect(category!.accuracy).toBe(100);
  });

  it('should correctly escalate SUBSCRIPTION_DOWNGRADE_ESCALATED cases', () => {
    const category = report.byCategory['SUBSCRIPTION_DOWNGRADE_ESCALATED'];
    expect(category).toBeDefined();
    expect(category!.accuracy).toBe(100);
  });

  it('should handle COMBINED_BILLING_SUBSCRIPTION cases', () => {
    const category = report.byCategory['COMBINED_BILLING_SUBSCRIPTION'];
    expect(category).toBeDefined();
    expect(category!.accuracy).toBeGreaterThanOrEqual(50);
  });

  it('should handle MISSING_CUSTOMER_ID cases with escalation', () => {
    const category = report.byCategory['MISSING_CUSTOMER_ID'];
    expect(category).toBeDefined();
    expect(category!.accuracy).toBeGreaterThanOrEqual(50);
  });

  it('should handle TOOL_FAILURE cases', () => {
    const category = report.byCategory['TOOL_FAILURE'];
    expect(category).toBeDefined();
  });

  it('should have reasonable average latency', () => {
    expect(report.avgLatencyMs).toBeLessThan(10000);
  });
});

describe('Individual Case Verification', () => {
  const allCases: EvaluationCase[] = [];
  for (const [category, cases] of Object.entries(e2eCases)) {
    for (const testCase of cases) {
      allCases.push(testCase as EvaluationCase);
    }
  }

  it.each(allCases)('$category: $id', async ({ id, category, input, expected }) => {
    const result = await runEvaluationSuite([{ id, category, input, expected }]);
    expect(result.accuracy).toBe(100);
  });
});
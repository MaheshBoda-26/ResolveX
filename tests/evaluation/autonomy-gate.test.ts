import { describe, it, expect } from 'vitest';
import { checkAutonomyGate, determineRiskLevel } from '../../apps/api/src/verification/autonomyGate';
import {
  AutonomyGateInput,
  AutonomyGateResult,
  RiskLevel,
  AGENT_NAMES,
  RISK_LEVELS,
} from '@resolvex/shared';
import autonomyGateCases from './fixtures/autonomy-gate-cases.json';
import riskLevelCases from './fixtures/risk-level-cases.json';

describe('Autonomy Gate Evaluation (Parameterized)', () => {
  // Flatten all test cases with their category
  const allCases: Array<{ category: string; name: string; input: AutonomyGateInput; expected: AutonomyGateResult }> = [];

  for (const [category, cases] of Object.entries(autonomyGateCases)) {
    for (const testCase of cases) {
      allCases.push({
        category,
        name: testCase.name,
        input: testCase.input as AutonomyGateInput,
        expected: testCase.expected as AutonomyGateResult,
      });
    }
  }

  // Parameterized tests using test.each
  it.each(allCases)('$category: $name', ({ input, expected }) => {
    const result = checkAutonomyGate(input);

    expect(result.allowed).toBe(expected.allowed);
    expect(result.reason).toBe(expected.reason);
    expect(result.requiredApprovals).toEqual(expected.requiredApprovals);
  });

  // Summary test - run all and report
  it('should pass all evaluation cases with 90%+ accuracy', () => {
    let passed = 0;
    let failed = 0;
    const failures: Array<{ name: string; expected: AutonomyGateResult; actual: AutonomyGateResult }> = [];

    for (const testCase of allCases) {
      const actual = checkAutonomyGate(testCase.input);
      const isMatch =
        actual.allowed === testCase.expected.allowed &&
        actual.reason === testCase.expected.reason &&
        JSON.stringify(actual.requiredApprovals) === JSON.stringify(testCase.expected.requiredApprovals);

      if (isMatch) {
        passed++;
      } else {
        failed++;
        failures.push({
          name: testCase.name,
          expected: testCase.expected,
          actual,
        });
      }
    }

    const total = passed + failed;
    const accuracy = (passed / total) * 100;

    // Log summary
    console.log('\n==========================================');
    console.log('AUTONOMY GATE EVALUATION SUMMARY');
    console.log('==========================================');
    console.log(`Total: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Accuracy: ${accuracy.toFixed(1)}%`);
    console.log('\nBy Category:');

    const byCategory: Record<string, { passed: number; failed: number }> = {};
    for (const testCase of allCases) {
      if (!byCategory[testCase.category]) {
        byCategory[testCase.category] = { passed: 0, failed: 0 };
      }
      const actual = checkAutonomyGate(testCase.input);
      const isMatch =
        actual.allowed === testCase.expected.allowed &&
        actual.reason === testCase.expected.reason &&
        JSON.stringify(actual.requiredApprovals) === JSON.stringify(testCase.expected.requiredApprovals);

      if (isMatch) {
        byCategory[testCase.category].passed++;
      } else {
        byCategory[testCase.category].failed++;
      }
    }

    for (const [category, stats] of Object.entries(byCategory)) {
      const catTotal = stats.passed + stats.failed;
      console.log(`  ${category}: ${stats.passed}/${catTotal} (${((stats.passed / catTotal) * 100).toFixed(1)}%)`);
    }

    if (failures.length > 0) {
      console.log('\nFailures:');
      for (const failure of failures) {
        console.log(`  - ${failure.name}`);
        console.log(`    Expected: ${JSON.stringify(failure.expected)}`);
        console.log(`    Actual:   ${JSON.stringify(failure.actual)}`);
      }
    }

    const targetAccuracy = 90;
    console.log(`\nTarget: ${targetAccuracy}%+ | Actual: ${accuracy.toFixed(1)}%`);
    console.log(accuracy >= targetAccuracy ? '✅ TARGET MET' : '❌ TARGET NOT MET');
    console.log('==========================================\n');

    expect(accuracy).toBeGreaterThanOrEqual(targetAccuracy);
  });
});

describe('Risk Level Determination (Parameterized)', () => {
  // Parameterized tests using test.each
  it.each(riskLevelCases.RISK_DETERMINATION)('$name', ({ agent, action, amount, expected }) => {
    const actual = determineRiskLevel(agent, action, amount);
    expect(actual).toBe(expected);
  });

  // Summary test
  it('should pass all risk level cases with 100% accuracy', () => {
    let passed = 0;
    let failed = 0;

    for (const testCase of riskLevelCases.RISK_DETERMINATION) {
      const actual = determineRiskLevel(testCase.agent, testCase.action, testCase.amount);
      if (actual === testCase.expected) {
        passed++;
      } else {
        failed++;
        console.log(`FAIL: ${testCase.name} - Expected: ${testCase.expected}, Actual: ${actual}`);
      }
    }

    const total = passed + failed;
    const accuracy = (passed / total) * 100;

    expect(accuracy).toBe(100);
  });
});
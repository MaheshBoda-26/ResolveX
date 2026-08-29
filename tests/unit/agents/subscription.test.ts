import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPlanTier, checkPlanExists, processSubscriptionTask } from '../../../apps/api/src/agents/subscription';
import { SubscriptionTask, SubscriptionDecision, Customer, Subscription } from '@resolvex/shared';

describe('Subscription Agent Unit Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getPlanTier', () => {
    it('should return correct tier for basic plans', () => {
      expect(getPlanTier('basic')).toBe(1);
      expect(getPlanTier('starter')).toBe(1);
      expect(getPlanTier('BASIC')).toBe(1);
      expect(getPlanTier('STARTER')).toBe(1);
    });

    it('should return correct tier for pro plans', () => {
      expect(getPlanTier('pro')).toBe(2);
      expect(getPlanTier('professional')).toBe(2);
      expect(getPlanTier('PRO')).toBe(2);
      expect(getPlanTier('PROFESSIONAL')).toBe(2);
    });

    it('should return correct tier for enterprise', () => {
      expect(getPlanTier('enterprise')).toBe(3);
      expect(getPlanTier('ENTERPRISE')).toBe(3);
    });

    it('should return 0 for unknown plans', () => {
      expect(getPlanTier('unknown')).toBe(0);
      expect(getPlanTier('premium')).toBe(0);
      expect(getPlanTier('')).toBe(0);
    });
  });

  describe('checkPlanExists', () => {
    it('should return true for valid plans', () => {
      expect(checkPlanExists('basic')).toBe(true);
      expect(checkPlanExists('starter')).toBe(true);
      expect(checkPlanExists('pro')).toBe(true);
      expect(checkPlanExists('professional')).toBe(true);
      expect(checkPlanExists('enterprise')).toBe(true);
    });

    it('should return false for invalid plans', () => {
      expect(checkPlanExists('unknown')).toBe(false);
      expect(checkPlanExists('premium')).toBe(false);
      expect(checkPlanExists('')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(checkPlanExists('BASIC')).toBe(true);
      expect(checkPlanExists('Enterprise')).toBe(true);
      expect(checkPlanExists('Pro')).toBe(true);
    });
  });

  describe('processSubscriptionTask', () => {
    // We test the pure logic functions exported from the module
    it('should have correct function signature', () => {
      expect(typeof processSubscriptionTask).toBe('function');
    });

    it('should export getPlanTier for testing', () => {
      expect(typeof getPlanTier).toBe('function');
    });

    it('should export checkPlanExists for testing', () => {
      expect(typeof checkPlanExists).toBe('function');
    });
  });

  // Test the upgrade/downgrade logic that would be in processSubscriptionTask
  describe('Upgrade/Downgrade Logic', () => {
    it('should identify valid upgrade (basic to pro)', () => {
      const currentTier = getPlanTier('basic');
      const targetTier = getPlanTier('pro');
      expect(targetTier > currentTier).toBe(true);
    });

    it('should identify valid upgrade (starter to professional)', () => {
      const currentTier = getPlanTier('starter');
      const targetTier = getPlanTier('professional');
      expect(targetTier > currentTier).toBe(true);
    });

    it('should identify valid upgrade (pro to enterprise)', () => {
      const currentTier = getPlanTier('pro');
      const targetTier = getPlanTier('enterprise');
      expect(targetTier > currentTier).toBe(true);
    });

    it('should reject invalid upgrade (pro to basic)', () => {
      const currentTier = getPlanTier('pro');
      const targetTier = getPlanTier('basic');
      expect(targetTier > currentTier).toBe(false);
    });

    it('should reject same tier (basic to starter)', () => {
      const currentTier = getPlanTier('basic');
      const targetTier = getPlanTier('starter');
      expect(targetTier > currentTier).toBe(false);
    });

    it('should identify valid downgrade (enterprise to pro)', () => {
      const currentTier = getPlanTier('enterprise');
      const targetTier = getPlanTier('pro');
      expect(targetTier < currentTier).toBe(true);
    });

    it('should reject invalid downgrade (basic to pro)', () => {
      const currentTier = getPlanTier('basic');
      const targetTier = getPlanTier('pro');
      expect(targetTier < currentTier).toBe(false);
    });

    it('should reject same tier downgrade (pro to professional)', () => {
      const currentTier = getPlanTier('pro');
      const targetTier = getPlanTier('professional');
      expect(targetTier < currentTier).toBe(false);
    });
  });
});
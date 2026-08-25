import { upgradeSubscription } from './freshworks';
import z from 'zod';

export const ExecuteUpgradeInputSchema = z.object({
  customerId: z.uuid(),
  targetPlanId: z.string().min(1).max(100),
});

export type ExecuteUpgradeInput = z.infer<typeof ExecuteUpgradeInputSchema>;

export async function executeUpgrade(
  agentRunId: string,
  input: ExecuteUpgradeInput
): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
  try {
    const result = await upgradeSubscription(agentRunId, input);
    return { success: true, subscriptionId: result.subscriptionId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
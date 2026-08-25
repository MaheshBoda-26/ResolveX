import { issueRefund } from './freshworks';
import z from 'zod';

export const ExecuteRefundInputSchema = z.object({
  customerId: z.uuid(),
  amount: z.number().positive(),
  invoiceId: z.string().min(1).max(100),
  reason: z.string().min(1).max(500),
});

export type ExecuteRefundInput = z.infer<typeof ExecuteRefundInputSchema>;

export async function executeRefund(
  agentRunId: string,
  input: ExecuteRefundInput
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  try {
    const result = await issueRefund(agentRunId, input);
    return { success: true, refundId: result.refundId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
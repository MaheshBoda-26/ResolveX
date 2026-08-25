import { db } from '../db/client';
import {
  agentRuns,
  toolCalls,
  verifications,
  handoffs,
} from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

type AgentRun = InferSelectModel<typeof agentRuns>;
type ToolCall = InferSelectModel<typeof toolCalls>;
type Verification = InferSelectModel<typeof verifications>;
type Handoff = InferSelectModel<typeof handoffs>;
type InsertAgentRun = InferInsertModel<typeof agentRuns>;
type InsertToolCall = InferInsertModel<typeof toolCalls>;
type InsertVerification = InferInsertModel<typeof verifications>;
type InsertHandoff = InferInsertModel<typeof handoffs>;

export interface AgentRunWithDetails extends AgentRun {
  toolCalls: ToolCall[];
  verifications: Verification[];
  handoffs: Handoff[];
}

export async function createAgentRun(data: InsertAgentRun): Promise<AgentRun> {
  const [run] = await db.insert(agentRuns).values(data).returning();
  if (!run) throw new Error('Failed to create agent run');
  return run;
}

export async function getAgentRunById(id: string): Promise<AgentRun | null> {
  const [run] = await db.select().from(agentRuns).where(eq(agentRuns.id, id)).limit(1);
  return run ?? null;
}

export async function getAgentRunsByConversation(conversationId: string): Promise<AgentRun[]> {
  return db.select()
    .from(agentRuns)
    .where(eq(agentRuns.conversationId, conversationId))
    .orderBy(desc(agentRuns.startedAt));
}

export async function updateAgentRunStatus(id: string, status: AgentRun['status'], completedAt?: Date): Promise<AgentRun | null> {
  const updateData: Partial<AgentRun> = { status };
  if (completedAt) updateData.completedAt = completedAt;
  const [run] = await db.update(agentRuns).set(updateData).where(eq(agentRuns.id, id)).returning();
  return run ?? null;
}

export async function createToolCall(data: InsertToolCall): Promise<ToolCall> {
  const [call] = await db.insert(toolCalls).values(data).returning();
  if (!call) throw new Error('Failed to create tool call');
  return call;
}

export async function getToolCallsByAgentRun(agentRunId: string): Promise<ToolCall[]> {
  return db.select()
    .from(toolCalls)
    .where(eq(toolCalls.agentRunId, agentRunId))
    .orderBy(toolCalls.createdAt);
}

export async function updateToolCallResult(id: string, result: unknown, status: ToolCall['status'], latencyMs?: number): Promise<ToolCall | null> {
  const updateData: Partial<ToolCall> = { result: result as Record<string, unknown>, status };
  if (latencyMs !== undefined) updateData.latencyMs = String(latencyMs);
  const [call] = await db.update(toolCalls).set(updateData).where(eq(toolCalls.id, id)).returning();
  return call ?? null;
}

export async function createVerification(data: InsertVerification): Promise<Verification> {
  const [verification] = await db.insert(verifications).values(data).returning();
  if (!verification) throw new Error('Failed to create verification');
  return verification;
}

export async function getVerificationsByConversation(conversationId: string): Promise<Verification[]> {
  return db.select()
    .from(verifications)
    .where(eq(verifications.conversationId, conversationId))
    .orderBy(desc(verifications.createdAt));
}

export async function updateVerificationStatus(id: string, status: Verification['status'], observedState?: unknown): Promise<Verification | null> {
  const updateData: Partial<Verification> = { status };
  if (observedState !== undefined) updateData.observedState = observedState as Record<string, unknown>;
  const [verification] = await db.update(verifications).set(updateData).where(eq(verifications.id, id)).returning();
  return verification ?? null;
}

export async function createHandoff(data: InsertHandoff): Promise<Handoff> {
  const [handoff] = await db.insert(handoffs).values(data).returning();
  if (!handoff) throw new Error('Failed to create handoff');
  return handoff;
}

export async function getHandoffsByConversation(conversationId: string): Promise<Handoff[]> {
  return db.select()
    .from(handoffs)
    .where(eq(handoffs.conversationId, conversationId))
    .orderBy(desc(handoffs.createdAt));
}

export async function updateHandoffStatus(id: string, status: Handoff['status']): Promise<Handoff | null> {
  const [handoff] = await db.update(handoffs).set({ status }).where(eq(handoffs.id, id)).returning();
  return handoff ?? null;
}

export async function getAgentRunWithDetails(runId: string): Promise<AgentRunWithDetails | null> {
  const run = await getAgentRunById(runId);
  if (!run) return null;

  const [toolCallsData, verificationsData, handoffsData] = await Promise.all([
    getToolCallsByAgentRun(runId),
    getVerificationsByConversation(run.conversationId),
    getHandoffsByConversation(run.conversationId),
  ]);

  return {
    ...run,
    toolCalls: toolCallsData,
    verifications: verificationsData,
    handoffs: handoffsData,
  };
}

export type {
  AgentRun,
  ToolCall,
  Verification,
  Handoff,
  InsertAgentRun,
  InsertToolCall,
  InsertVerification,
  InsertHandoff,
};
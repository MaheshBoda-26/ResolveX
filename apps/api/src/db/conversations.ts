import { db, DB } from './client';
import { conversations, agentRuns, type Conversation, type AgentRun } from './schema';
import { eq, desc } from 'drizzle-orm';
import { TriageResult } from '@resolvex/shared';

export async function createConversation(
  customerId: string | null,
  channel: 'chat' | 'voice'
): Promise<Conversation> {
  const [conversation] = await db.insert(conversations).values({
    customerId,
    channel,
    status: 'open',
  }).returning();
  return conversation;
}

export async function addMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  // Messages are stored in agent_runs for now; could add a separate messages table later
  // This is a placeholder for future message storage
}

export async function getConversation(id: string): Promise<(Conversation & { messages: unknown[] }) | null> {
  const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  if (!conversation) return null;

  const runs = await db.select().from(agentRuns).where(eq(agentRuns.conversationId, id)).orderBy(desc(agentRuns.startedAt));

  return {
    ...conversation,
    messages: runs.map(r => ({
      id: r.id,
      role: 'assistant',
      content: JSON.stringify(r.decision),
      createdAt: r.startedAt,
    })),
  };
}

export async function updateConversationStatus(
  id: string,
  status: 'open' | 'resolved' | 'escalated' | 'closed'
): Promise<void> {
  await db.update(conversations).set({ status, updatedAt: new Date() }).where(eq(conversations.id, id));
}

export async function createAgentRun(
  conversationId: string,
  agentName: 'triage' | 'billing' | 'subscription',
  input: Record<string, unknown>,
  decision: Record<string, unknown>,
  status: 'pending' | 'running' | 'completed' | 'failed' = 'completed'
): Promise<AgentRun> {
  const [run] = await db.insert(agentRuns).values({
    conversationId,
    agentName,
    input,
    decision,
    status,
    startedAt: new Date(),
    completedAt: status === 'completed' || status === 'failed' ? new Date() : null,
  }).returning();
  return run;
}

export async function getAgentRuns(conversationId: string): Promise<AgentRun[]> {
  return db.select().from(agentRuns).where(eq(agentRuns.conversationId, conversationId)).orderBy(desc(agentRuns.startedAt));
}

export async function createTriageAgentRun(
  conversationId: string,
  request: { message: string; customerId?: string; channel: 'chat' | 'voice' },
  result: TriageResult
): Promise<AgentRun> {
  return createAgentRun(conversationId, 'triage', request, result as Record<string, unknown>, 'completed');
}
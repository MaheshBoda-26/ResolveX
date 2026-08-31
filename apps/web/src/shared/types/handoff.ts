export type HandoffStatus = 'pending' | 'accepted' | 'completed';

export interface Handoff {
  id: string;
  customer: {
    id: string;
    name: string;
    email: string;
    plan: string;
    status: string;
  };
  issueSummary: string;
  originalRequest: string;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  updatedAt: string;
  status: HandoffStatus;
  evidence: Evidence[];
  policyExcerpts: PolicyExcerpt[];
  completedActions: CompletedAction[];
  escalationReason: string;
  recommendedNextAction: string;
}

export interface Evidence {
  id: string;
  type: 'transaction' | 'policy' | 'communication' | 'document';
  description: string;
  data: Record<string, unknown>;
  collectedAt: string;
  verified: boolean;
}

export interface PolicyExcerpt {
  id: string;
  policyId: string;
  title: string;
  excerpt: string;
  relevantSection: string;
}

export interface CompletedAction {
  id: string;
  action: string;
  description: string;
  performedAt: string;
  verificationStatus: 'verified' | 'pending' | 'failed';
  verificationDetails?: string;
}

export interface HandoffFilters {
  status?: HandoffStatus;
  priority?: Handoff['priority'];
  search?: string;
}

export interface HandoffSort {
  field: 'createdAt' | 'priority' | 'customer';
  direction: 'asc' | 'desc';
}
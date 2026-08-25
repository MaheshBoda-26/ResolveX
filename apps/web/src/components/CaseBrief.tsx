'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle, XCircle, Clock, User, Mail, CreditCard, Shield, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Handoff, HandoffStatus, Evidence } from '@/lib/api';

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, icon, children, defaultOpen = true }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border-default rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 bg-secondary-soft flex items-center gap-2 text-left font-medium text-text-primary hover:bg-secondary-soft/80 transition-colors"
        aria-expanded={open}
      >
        {icon}
        <span>{title}</span>
        <span className="ml-auto">{open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}</span>
      </button>
      <div className={cn(open ? 'block' : 'hidden')}>
        <div className="p-4 border-t border-border-default">{children}</div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      {icon && <span className="h-5 w-5 text-text-muted flex-shrink-0 mt-0.5">{icon}</span>}
      <div className="flex-1 min-w-0">
        <div className="text-caption text-text-muted">{label}</div>
        <div className="text-body-medium text-text-primary truncate">{value}</div>
      </div>
    </div>
  );
}

function EvidenceCard({ evidence }: { evidence: Evidence }) {
  const typeIcons: Record<Evidence['type'], React.ReactNode> = {
    transaction: <CreditCard className="h-4 w-4" />,
    policy: <FileText className="h-4 w-4" />,
    communication: <Mail className="h-4 w-4" />,
    document: <Shield className="h-4 w-4" />,
  };

  const typeLabels: Record<Evidence['type'], string> = {
    transaction: 'Transaction',
    policy: 'Policy',
    communication: 'Communication',
    document: 'Document',
  };

  return (
    <div className="p-3 bg-surface-default border border-border-default rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        {typeIcons[evidence.type]}
        <Badge variant="secondary" className="capitalize">{typeLabels[evidence.type]}</Badge>
        <span className="ml-auto text-caption text-text-muted">
          {evidence.verified ? (
            <span className="flex items-center gap-1 text-success-default">
              <CheckCircle className="h-3 w-3" /> Verified
            </span>
          ) : (
            <span className="flex items-center gap-1 text-warning-default">
              <Clock className="h-3 w-3" /> Pending
            </span>
          )}
        </span>
      </div>
      <p className="text-body-medium text-text-primary">{evidence.description}</p>
      <details className="mt-2">
        <summary className="text-caption text-text-muted cursor-pointer hover:text-text-primary">View details</summary>
        <pre className="mt-2 p-2 bg-background-default rounded text-caption overflow-auto text-text-secondary max-h-40">
          {JSON.stringify(evidence.data, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function PolicyExcerptCard({ excerpt }: { excerpt: Handoff['policyExcerpts'][0] }) {
  return (
    <div className="p-3 bg-surface-default border border-border-default rounded-lg">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="font-medium text-text-primary">{excerpt.title}</div>
          <div className="text-caption text-text-muted">{excerpt.policyId}</div>
        </div>
        <Badge variant="info">{excerpt.relevantSection}</Badge>
      </div>
      <p className="text-body-medium text-text-secondary bg-background-default p-3 rounded border border-border-default">{excerpt.excerpt}</p>
    </div>
  );
}

function CompletedActionCard({ action }: { action: Handoff['completedActions'][0] }) {
  const statusIcons = {
    verified: <CheckCircle className="h-4 w-4 text-success-default" />,
    pending: <Clock className="h-4 w-4 text-warning-default" />,
    failed: <XCircle className="h-4 w-4 text-error-default" />,
  };

  const statusLabels = {
    verified: 'Verified',
    pending: 'Pending',
    failed: 'Failed',
  };

  return (
    <div className="p-3 bg-surface-default border border-border-default rounded-lg">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">{statusIcons[action.verificationStatus]}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary">{action.action}</span>
            <Badge variant="secondary">{statusLabels[action.verificationStatus]}</Badge>
          </div>
          <p className="text-body-medium text-text-secondary mt-1">{action.description}</p>
          <div className="mt-2 flex items-center gap-2 text-caption text-text-muted">
            <span>Performed: {new Date(action.performedAt).toLocaleString()}</span>
            {action.verificationDetails && (
              <>
                <Separator className="h-4" orientation="vertical" />
                <span>{action.verificationDetails}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CaseBrief({
  handoff,
  onAccept,
  onComplete,
  isAccepting,
  isCompleting,
}: {
  handoff: Handoff;
  onAccept: () => void;
  onComplete: () => void;
  isAccepting: boolean;
  isCompleting: boolean;
}) {
  const statusColors: Record<HandoffStatus, { bg: string; text: string; border: string }> = {
    pending: { bg: 'bg-warning-soft', text: 'text-warning-default', border: 'border-warning-default' },
    accepted: { bg: 'bg-info-soft', text: 'text-info-default', border: 'border-info-default' },
    completed: { bg: 'bg-success-soft', text: 'text-success-default', border: 'border-success-default' },
  };

  const priorityColors: Record<Handoff['priority'], string> = {
    critical: 'bg-error-soft text-error-default border-error-default',
    high: 'bg-warning-soft text-warning-default border-warning-default',
    medium: 'bg-info-soft text-info-default border-info-default',
    low: 'bg-secondary-soft text-secondary-default border-secondary-default',
  };

  const statusLabels: Record<HandoffStatus, string> = {
    pending: 'Pending Review',
    accepted: 'In Progress',
    completed: 'Completed',
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-h2 font-bold text-text-primary">Case Brief</h1>
          <p className="text-body text-text-muted mt-1">Handoff #{handoff.id.slice(0, 8)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('px-3 py-1 rounded-full text-caption font-medium border', priorityColors[handoff.priority])}>
            {handoff.priority.toUpperCase()}
          </span>
          <span className={cn('px-3 py-1 rounded-full text-caption font-medium border', statusColors[handoff.status].border, statusColors[handoff.status].bg, statusColors[handoff.status].text)}>
            {statusLabels[handoff.status]}
          </span>
        </div>
      </div>

      {/* Customer Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow label="Name" value={handoff.customer.name} icon={<User className="h-4 w-4" />} />
            <InfoRow label="Email" value={handoff.customer.email} icon={<Mail className="h-4 w-4" />} />
            <InfoRow label="Plan" value={handoff.customer.plan} icon={<CreditCard className="h-4 w-4" />} />
            <InfoRow label="Status" value={handoff.customer.status} icon={<Shield className="h-4 w-4" />} />
          </div>
        </CardContent>
      </Card>

      {/* Issue Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Issue Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-caption text-text-muted mb-1">Issue Summary</div>
            <p className="text-body-medium text-text-primary">{handoff.issueSummary}</p>
          </div>
          <div>
            <div className="text-caption text-text-muted mb-1">Original Request</div>
            <p className="text-body-medium text-text-primary bg-background-default p-4 rounded border border-border-default whitespace-pre-wrap">{handoff.originalRequest}</p>
          </div>
          <div>
            <div className="text-caption text-text-muted mb-1">Escalation Reason</div>
            <p className="text-body-medium text-text-primary bg-background-default p-4 rounded border border-border-default">{handoff.escalationReason}</p>
          </div>
          <div>
            <div className="text-caption text-text-muted mb-1">Recommended Next Action</div>
            <p className="text-body-medium text-text-primary bg-accent-soft p-4 rounded border border-accent-default">{handoff.recommendedNextAction}</p>
          </div>
        </CardContent>
      </Card>

      {/* Evidence */}
      <CollapsibleSection title="Evidence Collected" icon={<FileText className="h-5 w-5" />}>
        {handoff.evidence.length === 0 ? (
          <p className="text-body text-text-muted">No evidence collected</p>
        ) : (
          <div className="space-y-3">
            {handoff.evidence.map((evidence) => (
              <EvidenceCard key={evidence.id} evidence={evidence} />
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Policy Excerpts */}
      <CollapsibleSection title="Relevant Policy Excerpts" icon={<Shield className="h-5 w-5" />}>
        {handoff.policyExcerpts.length === 0 ? (
          <p className="text-body text-text-muted">No policy excerpts</p>
        ) : (
          <div className="space-y-3">
            {handoff.policyExcerpts.map((excerpt) => (
              <PolicyExcerptCard key={excerpt.id} excerpt={excerpt} />
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Completed Actions */}
      <CollapsibleSection title="Completed Actions" icon={<CheckCircle className="h-5 w-5" />}>
        {handoff.completedActions.length === 0 ? (
          <p className="text-body text-text-muted">No actions completed</p>
        ) : (
          <div className="space-y-3">
            {handoff.completedActions.map((action) => (
              <CompletedActionCard key={action.id} action={action} />
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-t border-border-default">
            {handoff.status === 'pending' && (
              <Button
                size="lg"
                className="flex-1"
                onClick={onAccept}
                disabled={isAccepting}
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Accepting...
                  </>
                ) : (
                  'Accept Handoff'
                )}
              </Button>
            )}
            {(handoff.status === 'accepted' || handoff.status === 'pending') && (
              <Button
                size="lg"
                variant="destructive"
                className="flex-1"
                onClick={onComplete}
                disabled={isCompleting}
              >
                {isCompleting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Completing...
                  </>
                ) : (
                  'Mark Complete'
                )}
              </Button>
            )}
            {handoff.status === 'completed' && (
              <div className="flex-1 text-center text-success-default font-medium py-2">
                <CheckCircle className="h-5 w-5 mx-auto mb-1" />
                Case Completed
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
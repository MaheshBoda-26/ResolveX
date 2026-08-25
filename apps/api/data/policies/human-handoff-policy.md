# Human Handoff Policy

## Overview
This policy defines when cases must be handed off to human agents, the required case brief format, and SLA commitments.

## Handoff Triggers (Mandatory)

### From Escalation Policy
- High-value refunds (> $500)
- Policy exception requests
- Ambiguous identity
- Conflicting account state
- Unverified mutation outcomes

### From Agent Boundaries Policy
- High-risk mutation authorization needed
- Policy exception required
- Outcome verification uncertain
- System permission changes

### Additional Triggers
- Customer explicitly requests human
- 3+ failed AI resolution attempts
- Sentiment: frustrated/angry (detected)
- Legal/regulatory language detected
- Security incident suspected

## Case Brief Requirements (Auto-Generated)

### Required Fields
```json
{
  "caseId": "uuid",
  "customerId": "uuid",
  "customerTier": "basic|pro|enterprise",
  "triggerReason": "enum[high_value|policy_exception|ambiguous_identity|conflicting_state|unverified_mutation|customer_request|failed_attempts|sentiment|legal|security]",
  "policyReferences": ["refund-policy.md#section", "escalation-policy.md#tier2"],
  "conversationSummary": "2-3 sentences, key facts only",
  "actionHistory": [
    {"timestamp": "ISO8601", "action": "string", "result": "string", "agent": "string"}
  ],
  "evidenceSummary": {
    "documents": ["invoice_id", "contract_ref"],
    "logs": ["log_query_ref"],
    "communications": ["thread_id"]
  },
  "recommendedAction": "string",
  "riskAssessment": "low|medium|high|critical",
  "slaTier": "tier1|tier2|tier3",
  "assignedTo": "null|user_id",
  "createdAt": "ISO8601"
}
```

### Evidence Standards
- **Transaction Disputes**: Invoice, payment gateway logs, customer statement
- **Access Issues**: Provisioning logs, feature flag state, audit trail
- **Identity**: Auth logs, MFA events, IP/device history
- **Contract**: Signed agreement, amendment history, renewal terms

## SLA Commitments

### Tier 1 (Team Lead) - 1 Hour
- Acknowledgment: 15 minutes
- First Response: 1 hour
- Resolution Target: 4 hours

### Tier 2 (Manager) - 4 Hours
- Acknowledgment: 30 minutes
- First Response: 4 hours
- Resolution Target: 24 hours

### Tier 3 (Director/VP) - 24 Hours
- Acknowledgment: 1 hour
- First Response: 24 hours
- Resolution Target: 5 business days

## Handoff Process

### Automated
1. Trigger detected → Case brief generated
2. Routing engine assigns to tier/queue
3. Notification sent (Slack, email, PagerDuty)
4. Case appears in human agent dashboard

### Human Agent Acceptance
1. Review case brief (2 min target)
2. Accept or re-route with reason
3. Update status: "In Progress"
4. Customer notified: "Specialist [name] is reviewing your case"

### Resolution
1. Human takes action or provides guidance
2. Case brief updated with resolution
3. Customer notified of outcome
4. Case closed with resolution code
5. Feedback loop: AI learns from resolution

## Quality Metrics
- **Brief Completeness**: 100% required fields populated
- **SLA Compliance**: > 90% per tier
- **Re-handoff Rate**: < 5% (case returns to AI)
- **Customer CSAT**: > 4.5/5 post-handoff
- **Resolution Accuracy**: > 95% first-contact resolution

## Related Policies
- Escalation Policy (triggers, tiers, process)
- Agent Boundaries Policy (AI may not decide alone)
- Verification Policy (post-action checks on human actions)
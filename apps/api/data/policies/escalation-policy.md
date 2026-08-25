# Escalation Policy

## Overview
This policy defines when and how cases must be escalated to human reviewers.

## Mandatory Escalation Triggers

### High-Value Cases
- Refunds > $500 (director approval required)
- Annual contract modifications
- Enterprise pricing exceptions
- Cumulative customer credits > $1,000 in 30 days

### Policy Exceptions
- Any request outside documented policy
- Custom terms not in standard contracts
- Regulatory/compliance override requests
- Legal hold or subpoena responses

### Ambiguous Identity
- Unverified account ownership
- Conflicting authentication signals
- Suspected account takeover
- Identity document discrepancies

### Conflicting Account State
- Payment method failures with active subscription
- Provisioning state mismatch (billing vs. access)
- Data inconsistency across services
- Audit log gaps

## Escalation Tiers

### Tier 1: Team Lead (1-hour SLA)
- Refunds $50-$500
- Standard plan changes with complications
- Single billing dispute

### Tier 2: Department Manager (4-hour SLA)
- Refunds $500-$5,000
- Cross-tier subscription changes
- Multiple related disputes
- Security flag reviews

### Tier 3: Director/VP (24-hour SLA)
- Refunds > $5,000
- Enterprise contract changes
- Legal/regulatory requests
- Pattern anomalies (3+ escalations/customer in 90 days)

## Escalation Process
1. Agent identifies trigger
2. Case brief auto-generated (see Human Handoff Policy)
3. Assigned to appropriate tier via routing rules
4. Acknowledgment within SLA
5. Resolution or further escalation
6. Case closure with root cause tag

## Case Brief Requirements
- Customer ID and tier
- Trigger reason with policy reference
- Full action history
- Evidence summary
- Recommended action
- Risk assessment

## Related Policies
- Human Handoff Policy (case brief requirements, SLA)
- Agent Boundaries Policy (AI may/may not decide)
- Verification Policy (post-action checks)
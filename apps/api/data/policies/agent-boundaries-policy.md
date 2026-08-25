# Agent Boundaries Policy

## Overview
This policy defines what AI agents may and may not decide, based on the engineering rules in rules.md.

## AI May Decide (Autonomous)

### Classification & Routing
- Intent classification from customer messages
- Task decomposition into subtasks
- Specialist agent routing (billing, technical, account)
- Relevant knowledge document selection
- Priority assignment based on keywords/context

### Tool Selection
- Selection from approved low-risk tool set:
  - Knowledge base search
  - Customer profile lookup
  - Transaction history query
  - Subscription status check
  - Policy document retrieval
- Parameter construction for approved tools

### Communication
- Customer-facing summaries and explanations
- Status updates on in-progress actions
- Clarifying questions to customers
- Escalation recommendations (subject to deterministic rules)

### Decision Support
- Whether a case *appears* to require escalation
- Risk scoring for human reviewer context
- Policy citation for suggested actions
- Evidence compilation for handoff

## AI May Not Decide Alone (Requires Human)

### High-Risk Mutations
- Refund authorization above autonomous threshold ($50)
- Account deletion or deactivation
- Identity/security changes (email, phone, 2FA, password)
- Permission/role modifications
- Contract signatures or legal agreements

### Policy Exceptions
- Any action outside documented policy
- Custom pricing or terms
- Regulatory compliance overrides
- Waiver of notice periods or fees

### Outcome Verification
- Whether an uncertain mutation succeeded
- Chargeback dispute resolution
- Payment failure recovery actions
- Data recovery confirmations

### System Changes
- Production configuration changes
- Deployment approvals
- Infrastructure modifications
- Security policy updates

## Human Review Required (Mandatory)

### Before Execution
- High-value refunds (> $500)
- Policy exception requests
- Ambiguous identity cases
- Conflicting account states
- Unverified mutation outcomes

### After Execution (Verification)
- All refunds (post-action verification)
- Subscription tier changes
- Account security modifications
- Data exports/deletions

## AI Must Not Touch (Explicit Approval Only)
- Production secrets and credentials
- Payment provider configuration
- Authentication provider configuration
- Database migrations
- CI/CD pipeline changes
- Freshworks production settings

## Deterministic Guardrails
All AI decisions route through:
1. Policy engine validation (rules.md boundaries)
2. Tool schema validation (Zod)
3. Idempotency key check (mutations)
4. Verification queue (post-action)

## Related Policies
- Escalation Policy (triggers, tiers, process)
- Verification Policy (post-action checks)
- Human Handoff Policy (case brief, SLA)
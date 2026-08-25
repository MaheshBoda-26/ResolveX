# Verification Policy

## Overview
This policy defines post-action verification requirements, retry logic, and success criteria for all mutating operations.

## Post-Action Verification Requirements

### Mandatory Verification (All Mutations)
- **State Check**: Confirm expected state change in system of record
- **Idempotency**: Verify operation is idempotent or guarded
- **Audit Log**: Confirm audit trail entry created
- **Notification**: Verify customer notification sent (if applicable)

### Verification by Action Type
- **Refund**: Payment gateway reversal confirmed, ledger updated
- **Subscription Change**: Provisioning API confirms new state, billing updated
- **Account Update**: Profile service confirms write, cache invalidated
- **Data Export**: Export job completes, download link generated, access logged

## Retry Logic

### Retryable Operations (Idempotent)
- Read operations
- Notification sends (with deduplication)
- Status checks
- Webhook deliveries (with idempotency keys)

### Non-Retryable Operations (Mutations)
- Payment charges
- Refunds
- Account deletions
- Permission changes
- Contract signatures

### Retry Policy
- **Max Retries**: 3 attempts
- **Backoff**: Exponential (1s, 2s, 4s)
- **Jitter**: ±100ms
- **Circuit Breaker**: Open after 5 consecutive failures

## Success Criteria
- HTTP 2xx response
- Expected state confirmed in database
- No error in async job queue
- Customer-facing confirmation delivered

## Failure Handling
- **Immediate**: Log failure, alert on-call if critical
- **Short-term**: Queue for manual review (within 1 hour)
- **Long-term**: Root cause analysis within 24 hours

## Related Policies
- Agent Boundaries Policy (AI may/may not decide)
- Escalation Policy (high-value, policy exception)
# Refund Process Policy

## Overview
This policy defines the end-to-end refund processing timeline, notification requirements, and reversal procedures.

## Processing Timeline

### Automatic Refunds (≤ $50)
| Stage | Timeline | Owner |
|-------|----------|-------|
| Request Received | T+0 | System |
| Validation | T+5 min | Automated |
| Approval | T+15 min | Automated |
| Payment Reversal | T+30 min | Payment Gateway |
| Customer Notification | T+1 hour | Automated |
| Ledger Update | T+2 hours | Automated |

### Manager Review ($50 - $500)
| Stage | Timeline | Owner |
|-------|----------|-------|
| Request Received | T+0 | System |
| Queue Assignment | T+1 hour | Routing Engine |
| Manager Review | T+24 hours | Manager |
| Decision | T+48 hours | Manager |
| Payment Reversal | T+48.5 hours | Payment Gateway |
| Customer Notification | T+49 hours | Automated |

### Director Approval (> $500)
| Stage | Timeline | Owner |
|-------|----------|-------|
| Request Received | T+0 | System |
| Queue Assignment | T+4 hours | Routing Engine |
| Director Review | T+5 days | Director |
| Decision | T+5 days | Director |
| Payment Reversal | T+5 days + 4 hours | Payment Gateway |
| Customer Notification | T+5 days + 5 hours | Automated |

## Notification Requirements

### Customer Notifications
- **Initiation**: "We've received your refund request" (immediate)
- **Status Update**: "Under review" / "Approved" / "Denied" (per timeline)
- **Completion**: "Refund processed to [method] ending in XXXX" (on reversal)
- **Denial**: Reason + appeal path (if applicable)

### Internal Notifications
- **Slack/Teams**: Real-time to assigned reviewer
- **Daily Digest**: Pending refunds > 24 hours
- **Weekly Report**: Volume, amounts, SLA compliance

## Reversal Procedures

### Payment Gateway Integration
- **Stripe**: `refund.create` with idempotency key
- **Partial Refunds**: Amount in cents, reason enum
- **Metadata**: `case_id`, `policy_ref`, `reviewer_id`
- **Webhook Handling**: `refund.succeeded` / `refund.failed`

### Ledger Updates
- **Revenue Recognition**: Reversed in current period
- **Tax Implications**: Credit note issued automatically
- **Reporting**: Refund category tagged for finance

### Failure Handling
- **Gateway Failure**: Retry 3x (exponential backoff), then alert
- **Partial Success**: Full reversal or manual completion
- **Customer Notification**: "Processing delay" if > 24 hours

## Quality Metrics
- **SLA Compliance**: > 95% within policy timeline
- **Accuracy**: < 0.1% incorrect amounts
- **Customer Satisfaction**: > 4.5/5 on post-refund survey
- **Chargeback Rate**: < 0.5% on refunded transactions

## Related Policies
- Refund Policy (thresholds, approval requirements)
- Verification Policy (post-action checks)
- Billing Dispute Policy (duplicate charge handling)
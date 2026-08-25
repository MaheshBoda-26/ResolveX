# Upgrade Process Policy

## Overview
This policy defines the technical and billing process for subscription upgrades, including immediate vs. next-cycle provisioning and proration calculations.

## Upgrade Types

### Immediate Provisioning (Default)
- **Trigger**: Customer confirms upgrade in portal or via support
- **Provisioning**: Features unlocked within 5 minutes
- **Billing**: Prorated charge for remainder of current cycle
- **Invoice**: Generated immediately, due on receipt

### Next-Cycle Provisioning (Customer Choice)
- **Trigger**: Customer selects "Start next billing cycle"
- **Provisioning**: Features unlock at cycle boundary
- **Billing**: No immediate charge; new price at next renewal
- **Use Case**: Budget planning, team coordination

## Proration Calculation

### Formula
```
Prorated Amount = (New Monthly Price - Old Monthly Price) × (Days Remaining / Days in Cycle)
```

### Examples
- **Monthly → Monthly**: Basic ($29.99) → Pro ($99.99) on day 15 of 30-day cycle
  - Prorated = ($99.99 - $29.99) × (15/30) = $35.00
- **Monthly → Annual**: Basic Monthly ($29.99) → Pro Annual ($999.99/yr = $83.33/mo) on day 10
  - Prorated = ($83.33 - $29.99) × (20/30) = $35.56
- **Annual → Annual**: Pro Annual ($999.99) → Enterprise ($2,499.99) on month 6
  - Prorated = ($2,499.99 - $999.99) × (6/12) = $750.00

### Rounding
- Round to nearest cent (banker's rounding)
- Minimum proration: $0.01
- Maximum: Full price difference

## Provisioning Process

### Technical Steps
1. Validate eligibility (active, no past due, not in trial)
2. Calculate proration
3. Create pending subscription record
4. Charge prorated amount (if immediate)
5. Update provisioning system (feature flags, limits)
6. Invalidate caches
7. Send confirmation notification
8. Update analytics events

### Rollback on Failure
- Payment failure → Revert provisioning, notify customer
- Provisioning failure → Refund charge, alert engineering
- Partial success → Compensating transaction, manual review

## Downgrade Process
- **Effective**: Next billing cycle only
- **Proration**: No credit for unused current cycle
- **Features**: Current tier access until cycle end
- **Data**: Export initiated for features being lost

## Cross-Grade (Tier Change)
- **Basic ↔ Pro**: Standard proration
- **Any → Enterprise**: Requires quote/MSA, manual provisioning
- **Enterprise → Other**: Contract amendment required

## Notification Timeline
| Event | Timing | Channel |
|-------|--------|---------|
| Upgrade Confirmed | Immediate | Email, In-app |
| Provisioning Complete | < 5 min | In-app |
| Invoice Generated | Immediate | Email |
| Next Cycle Preview | 7 days before | Email |

## Related Policies
- Subscription Upgrade Policy (eligibility, review requirements)
- Subscription Cancel Policy (notice period, proration)
- Billing Dispute Policy (incorrect charge handling)
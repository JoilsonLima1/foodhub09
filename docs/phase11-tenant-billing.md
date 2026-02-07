# Phase 11: Tenant Billing Lifecycle

## Overview

Phase 11 implements the complete tenant billing lifecycle including:
- Billing profiles and invoice management
- Automatic renewal via cron
- Dunning (delinquency) policy enforcement
- Reactivation on payment

## Database Schema (Additive)

### New Tables

1. **tenant_billing_profiles** - Stores billing information per tenant
2. **tenant_invoices** - Invoice records with provider integration
3. **subscription_cycles** - Tracks billing periods
4. **partner_dunning_policies** - Configurable delinquency rules
5. **billing_notifications** - Notification queue for billing events

## RPCs

| Function | Purpose |
|----------|---------|
| `create_or_update_billing_profile` | Idempotent profile management |
| `create_subscription_invoice` | Creates invoices (idempotent by period) |
| `sync_invoice_status_from_ssot` | Syncs invoice status from payment_events |
| `apply_dunning_policy` | Applies grace → past_due → suspended → blocked |
| `reactivate_on_payment` | Reactivates tenant when all invoices paid |
| `run_billing_cycle_cron` | Creates renewal invoices, marks overdue, applies dunning |
| `get_tenant_billing_summary` | Returns complete billing overview |
| `handle_billing_event_from_ssot` | Processes SSOT events for billing |
| `link_invoice_to_provider` | Links invoice to Asaas payment ID |
| `get_billing_ops_overview` | Super Admin billing metrics |

## Billing Flow

```
1. Tenant Created → Trial starts
2. Trial Ends → Invoice created (pending)
3. Payment Confirmed (SSOT) → Invoice paid, subscription active
4. Due Date Passes → Invoice overdue
5. Days Overdue > grace_days → Tenant past_due
6. Days Overdue > suspend_after_days → Tenant suspended
7. Days Overdue > block_after_days → Tenant blocked
8. Payment Received → Invoice paid, tenant reactivated
```

## UI Pages

- `/billing` - Tenant billing management
- `/partner/tenant-billing` - Partner tenant billing overview
- `/super-admin` → Ops → Faturamento - Global billing operations

## Integration Points

- **SSOT**: Reads from `payment_events` to sync invoice status
- **Asaas**: Provider payment IDs linked via `link_invoice_to_provider`
- **No webhook changes**: All billing state derived from existing SSOT

## Idempotency Guarantees

- Invoice creation: One invoice per (subscription, period_start, period_end)
- Status sync: Multiple calls produce same result
- Dunning: Safe to run repeatedly

## Configuration

Default dunning policy (global):
- Grace period: 3 days
- Suspend after: 14 days  
- Block after: 30 days
- Notify schedule: [1, 3, 7, 14] days after due date

Partners can override with custom `partner_dunning_policies`.

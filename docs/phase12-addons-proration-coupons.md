# Phase 12: Add-ons, Proration, Coupons & Entitlements

## Overview

Phase 12 introduces advanced monetization capabilities without modifying existing billing infrastructure.

## New Tables

| Table | Purpose |
|-------|---------|
| `partner_addons` | Products/services partners can sell |
| `partner_tenant_addon_subscriptions` | Tenant subscriptions to partner add-ons |
| `partner_coupons` | Discount codes per partner |
| `coupon_redemptions` | Redemption history |
| `tenant_entitlements` | Feature access control |
| `tenant_pending_coupons` | Coupons waiting to be applied |
| `plan_change_prorations` | Proration audit trail |

## Key RPCs

### Add-on Management
- `create_partner_addon()` - Create new add-on
- `update_partner_addon()` - Update add-on details
- `list_partner_addons()` - List with subscriber counts
- `subscribe_tenant_addon()` - Idempotent subscription
- `cancel_tenant_addon_subscription()` - Cancel with reason

### Coupons
- `validate_coupon()` - Check validity without applying
- `apply_coupon_to_next_invoice()` - Queue for next billing

### Proration
- `calculate_proration()` - Preview plan change costs
- `change_tenant_plan_with_proration()` - Execute with optional waive

### Entitlements
- `rebuild_tenant_entitlements()` - Sync from plan/addons
- `check_entitlement()` - Gating check with limits

## Flows

### Add-on Subscription
```
1. Tenant calls subscribe_tenant_addon(addon_id)
2. RPC validates addon belongs to tenant's partner
3. Creates subscription record
4. If addon has module_key, creates entitlement
5. Returns subscription ID (idempotent)
```

### Coupon Application
```
1. Tenant calls validate_coupon(code)
2. If valid, calls apply_coupon_to_next_invoice(code)
3. Creates pending_coupon record
4. On next billing cycle, billing engine reads pending coupons
5. Applies discount, creates redemption record
```

### Plan Change with Proration
```
1. Partner calls calculate_proration(tenant_id, new_plan_id)
2. Returns credit/charge breakdown
3. Partner calls change_tenant_plan_with_proration()
4. Creates proration record
5. If net_amount > 0, creates one-time invoice
6. Updates tenant's plan
```

## UI Pages

- `/partner/addons` - CRUD add-ons
- `/partner/coupons` - CRUD coupons
- `/billing/addons` - Tenant add-on store (future)

## Security

All tables use RLS with:
- Partner access via `partner_users` join
- Tenant access via `profiles.tenant_id`
- Super admin override via `user_roles`

# Phase 10: Partner Payments & Payout Infrastructure

## Overview

This phase implements split payments, partner sub-account onboarding, and automated payouts for the white-label partner ecosystem.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Payment Flow with Split                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Customer → Payment Gateway → Split Engine → Partner Wallet     │
│                                    │                            │
│                                    ↓                            │
│                            Platform Wallet                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Payout Flow                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Settlement → Integrity Check → Payout Job → Provider Transfer  │
│       │              │              │              │            │
│       ↓              ↓              ↓              ↓            │
│   Aggregates    Validates      Idempotent    Records in         │
│   period data   ledger match   queue entry   provider_transfers │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Database Tables

### partner_payment_accounts
Tracks sub-account status and capabilities for each partner.

| Column | Type | Description |
|--------|------|-------------|
| partner_id | UUID | Reference to partners table |
| provider | TEXT | Payment provider (asaas) |
| provider_account_id | TEXT | External account ID |
| status | TEXT | not_started/pending/approved/rejected/disabled |
| kyc_level | TEXT | KYC verification level |
| capabilities | JSONB | {split: bool, transfers: bool, pix: bool} |
| onboarding_url | TEXT | Link for partner to complete onboarding |

### partner_settlement_configs
Partner-specific payout configuration.

| Column | Type | Description |
|--------|------|-------------|
| partner_id | UUID | Reference to partners table |
| settlement_mode | TEXT | split/invoice/manual |
| payout_schedule | TEXT | daily/weekly/manual |
| payout_min_amount | NUMERIC | Minimum balance for payout |
| chargeback_reserve_percent | NUMERIC | Reserve for disputes |

### payout_jobs
Idempotent queue for processing payouts.

| Column | Type | Description |
|--------|------|-------------|
| settlement_id | UUID | Reference to settlements (unique) |
| status | TEXT | queued/processing/completed/failed |
| attempts | INT | Number of retry attempts |
| max_attempts | INT | Maximum retries before failure |
| next_attempt_at | TIMESTAMP | Exponential backoff timing |

### provider_transfers
Records actual transfers from the payment provider.

| Column | Type | Description |
|--------|------|-------------|
| partner_id | UUID | Recipient partner |
| provider_transfer_id | TEXT | External transfer ID |
| amount | NUMERIC | Transfer amount |
| status | TEXT | pending/completed/failed |

## Key RPCs

### start_partner_onboarding(partner_id)
Initiates sub-account creation with the payment provider.
- Creates entry in partner_payment_accounts
- Returns onboarding URL for partner completion
- Idempotent: safe to call multiple times

### sync_partner_onboarding_status(partner_id)
Syncs status from payment provider.
- Updates status (pending → approved)
- Updates capabilities (split, transfers)
- Updates KYC level

### create_provider_charge_v2(...)
Enhanced charge creation with conditional split.
- Checks partner account status
- If approved + split enabled → applies split rules
- If not → falls back to standard charge
- Records in provider_payment_links

### enqueue_payout_job(settlement_id)
Creates idempotent payout job.
- UNIQUE constraint on settlement_id
- Returns existing job if already queued
- Safe to call many times

### complete_payout_job(job_id, transfer_data)
Marks job as completed and records transfer.
- Creates entry in provider_transfers
- Updates job status to completed
- Validates financial integrity first

## User Interfaces

### Super Admin: Backoffice Ops → Parceiros Tab
- View all partner account statuses
- Monitor KYC levels and capabilities
- Trigger manual onboarding initiation
- Process pending payout batches
- Sync status for individual partners

### Partner: /partner/payments
- **Status Tab**: View onboarding status, capabilities, start/continue onboarding
- **Config Tab**: Set settlement mode, payout schedule, minimum amount
- **History Tab**: View payout history and provider transfers

## Configuration

### Settlement Modes
1. **split**: Partner receives funds automatically via split
2. **invoice**: Monthly consolidated invoice
3. **manual**: Platform-initiated transfers

### Payout Schedules
1. **daily**: Process payouts daily
2. **weekly**: Process payouts on configured day
3. **manual**: On-demand payout requests

## Smoke Tests

Run with: `npm run test src/test/e2e/phase10-partner-payments.test.tsx`

| Test | Description |
|------|-------------|
| T1 | start_partner_onboarding creates account |
| T2 | sync_partner_onboarding_status updates status |
| T3 | create_provider_charge_v2 applies split |
| T4 | enqueue_payout_job is idempotent (10 calls = 1 job) |
| T5 | complete_payout_job records transfers |
| T6 | Payout blocked if integrity check fails |

## Security Considerations

1. **RLS Policies**: Partners can only see their own data
2. **SECURITY DEFINER**: RPCs run with elevated privileges
3. **Integrity Checks**: Validate ledger consistency before payouts
4. **Chargeback Reserve**: Hold funds during dispute window (14 days)
5. **Idempotency**: All operations are safe to retry

## Edge Function: partner-payment-ops

Handles direct API communication with Asaas:
- `start_onboarding`: Creates sub-account
- `sync_status`: Fetches current status
- `process_payout_jobs`: Executes pending transfers

## Feature Flags

- `async_payout_jobs`: Enable async processing of payout queue
- `split_payments_enabled`: Enable split payment functionality
- `auto_payout_enabled`: Enable automatic payout processing

Manage via: Super Admin → Backoffice Ops → Configurações

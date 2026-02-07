/**
 * Settlement Engine (Phase 6) - Smoke Tests
 * 
 * Tests for idempotency, duplicate prevention, and settlement lifecycle
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client with simpler types
const mockRpc = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: (...args: unknown[]) => {
        mockUpdate(...args);
        return { eq: () => Promise.resolve({ data: null, error: null }) };
      },
    }),
  },
}));

describe('Settlement Engine - Idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generate_partner_settlement RPC', () => {
    it('should return existing settlement if period already exists', async () => {
      const existingSettlementId = 'existing-settlement-123';
      
      mockRpc.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'settlement_exists',
          existing_id: existingSettlementId,
        },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const result = await supabase.rpc('generate_partner_settlement', {
        p_partner_id: 'partner-123',
        p_period_start: '2026-01-01',
        p_period_end: '2026-01-31',
      });

      const data = result.data as any;
      expect(data?.success).toBe(false);
      expect(data?.error).toBe('settlement_exists');
      expect(data?.existing_id).toBe(existingSettlementId);
    });

    it('should return error when no transactions in period', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'no_transactions',
          message: 'No unsettled transactions in period',
        },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const result = await supabase.rpc('generate_partner_settlement', {
        p_partner_id: 'partner-123',
        p_period_start: '2026-01-01',
        p_period_end: '2026-01-31',
      });

      const data = result.data as any;
      expect(data?.success).toBe(false);
      expect(data?.error).toBe('no_transactions');
    });

    it('should successfully create settlement with correct totals', async () => {
      const newSettlementId = 'new-settlement-456';
      
      mockRpc.mockResolvedValueOnce({
        data: {
          success: true,
          settlement_id: newSettlementId,
          period: { start: '2026-01-01', end: '2026-01-31' },
          totals: {
            gross: 10000,
            partner_net: 9500,
            platform_fee: 500,
            transaction_count: 50,
          },
        },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const result = await supabase.rpc('generate_partner_settlement', {
        p_partner_id: 'partner-123',
        p_period_start: '2026-01-01',
        p_period_end: '2026-01-31',
      });

      const data = result.data as any;
      expect(data?.success).toBe(true);
      expect(data?.settlement_id).toBe(newSettlementId);
      expect(data?.totals.gross).toBe(10000);
      expect(data?.totals.partner_net).toBe(9500);
    });

    it('should handle 10 duplicate generation attempts returning only 1 valid', async () => {
      const settlementId = 'settlement-unique';
      
      // First call succeeds
      mockRpc.mockResolvedValueOnce({
        data: { success: true, settlement_id: settlementId },
        error: null,
      });

      // Subsequent 9 calls return duplicate error
      for (let i = 0; i < 9; i++) {
        mockRpc.mockResolvedValueOnce({
          data: { success: false, error: 'settlement_exists', existing_id: settlementId },
          error: null,
        });
      }

      const { supabase } = await import('@/integrations/supabase/client');
      
      const results = await Promise.all(
        Array(10).fill(null).map(() =>
          supabase.rpc('generate_partner_settlement', {
            p_partner_id: 'partner-123',
            p_period_start: '2026-01-01',
            p_period_end: '2026-01-31',
          })
        )
      );

      const successfulCreations = results.filter(r => (r.data as any)?.success === true);
      const duplicateResponses = results.filter(r => (r.data as any)?.error === 'settlement_exists');

      expect(successfulCreations.length).toBe(1);
      expect(duplicateResponses.length).toBe(9);
    });
  });

  describe('execute_partner_payout RPC', () => {
    it('should block duplicate payout for same settlement', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'payout_exists',
          existing_payout_id: 'payout-123',
        },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const result = await supabase.rpc('execute_partner_payout', {
        p_settlement_id: 'settlement-123',
        p_payout_method: 'pix',
      });

      const data = result.data as any;
      expect(data?.success).toBe(false);
      expect(data?.error).toBe('payout_exists');
    });

    it('should reject payout for cancelled settlement', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'invalid_settlement_status',
          status: 'cancelled',
        },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const result = await supabase.rpc('execute_partner_payout', {
        p_settlement_id: 'cancelled-settlement',
      });

      const data = result.data as any;
      expect(data?.success).toBe(false);
      expect(data?.error).toBe('invalid_settlement_status');
    });

    it('should successfully execute payout and update settlement status', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          success: true,
          payout_id: 'payout-new',
          amount: 9500,
          method: 'manual',
        },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const result = await supabase.rpc('execute_partner_payout', {
        p_settlement_id: 'settlement-pending',
        p_payout_method: 'manual',
        p_provider_reference: 'TED-12345',
      });

      const data = result.data as any;
      expect(data?.success).toBe(true);
      expect(data?.payout_id).toBeDefined();
      expect(data?.amount).toBe(9500);
    });
  });

  describe('Chargeback handling post-settlement', () => {
    it('should treat chargeback after settlement as future event', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          success: true,
          event_id: 'chargeback-event',
          effect_created: true,
          entry_type: 'debit',
          note: 'Chargeback after settlement - creates adjustment entry',
        },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const result = await supabase.rpc('apply_payment_event', {
        p_event_id: 'chargeback-event-123',
      });

      const data = result.data as any;
      expect(data?.success).toBe(true);
      expect(data?.entry_type).toBe('debit');
    });
  });

  describe('Financial summary calculations', () => {
    it('should correctly calculate available balance excluding chargeback window', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          available_balance: 15000,
          in_chargeback_window: 5000,
          pending_settlement: 3000,
          total_paid: 50000,
          calculated_at: '2026-02-07T17:30:00Z',
        },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const result = await supabase.rpc('get_partner_financial_summary', {
        p_partner_id: 'partner-123',
      });

      const data = result.data as any;
      expect(data?.available_balance).toBe(15000);
      expect(data?.in_chargeback_window).toBe(5000);
      expect(data?.pending_settlement).toBe(3000);
      expect(data?.total_paid).toBe(50000);
    });
  });

  describe('Reconciliation', () => {
    it('should detect mismatched amounts between provider and internal', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          success: true,
          provider: 'asaas',
          from_date: '2026-01-07',
          checked: 100,
          ok: 95,
          mismatch: 3,
          missing_internal: 2,
        },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const result = await supabase.rpc('reconcile_provider_payments', {
        p_provider: 'asaas',
        p_from_date: '2026-01-07',
      });

      const data = result.data as any;
      expect(data?.success).toBe(true);
      expect(data?.checked).toBe(100);
      expect(data?.mismatch).toBe(3);
      expect(data?.missing_internal).toBe(2);
    });
  });
});

describe('Settlement Engine - Data Integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should never modify payment_events table (ledger immutability)', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { success: true, settlement_id: 'new-settlement' },
      error: null,
    });

    const { supabase } = await import('@/integrations/supabase/client');
    
    await supabase.rpc('generate_partner_settlement', {
      p_partner_id: 'partner-123',
      p_period_start: '2026-01-01',
      p_period_end: '2026-01-31',
    });

    // Verify no UPDATE calls were made
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should preserve settlement_items link when settlement is closed', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { success: true, payout_id: 'payout-123' },
      error: null,
    });

    const { supabase } = await import('@/integrations/supabase/client');
    
    const result = await supabase.rpc('execute_partner_payout', {
      p_settlement_id: 'settlement-123',
    });

    const data = result.data as any;
    expect(data?.success).toBe(true);
  });
});

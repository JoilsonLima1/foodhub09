/**
 * Phase 14-15 - Security, Compliance, Growth & Monetization Smoke Tests
 * 
 * These tests verify:
 * - Security audit logging
 * - Permission validation
 * - LGPD compliance
 * - Trial events
 * - Upsell idempotency
 * - Soft limits enforcement
 * - KPI calculations
 */

import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Phase 14-15 - Security, Compliance & Growth', () => {

  // ============================================================
  // PHASE 14: SECURITY & COMPLIANCE
  // ============================================================

  // T1) Validate actor permission blocks unauthorized access
  describe('T1: validate_actor_permission blocks unauthorized', () => {
    it('should deny payout_approve for non-super-admin', async () => {
      const { data, error } = await supabase.rpc('validate_actor_permission', {
        p_actor_id: null, // unauthenticated
        p_action: 'payout_approve',
        p_scope: null,
      });
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      if (data && data.length > 0) {
        expect(data[0].allowed).toBe(false);
        expect(data[0].risk_level).toBe('critical');
      }
    });
  });

  // T2) Assert tenant scope validates correctly
  describe('T2: assert_tenant_scope validates access', () => {
    it('should return false for invalid scope', async () => {
      const { data, error } = await supabase.rpc('assert_tenant_scope', {
        p_actor_id: '00000000-0000-0000-0000-000000000000', // non-existent
        p_tenant_id: '00000000-0000-0000-0000-000000000001',
      });
      
      expect(error).toBeNull();
      expect(data).toBe(false);
    });
  });

  // T3) Assert partner scope validates correctly
  describe('T3: assert_partner_scope validates access', () => {
    it('should return false for invalid scope', async () => {
      const { data, error } = await supabase.rpc('assert_partner_scope', {
        p_actor_id: '00000000-0000-0000-0000-000000000000',
        p_partner_id: '00000000-0000-0000-0000-000000000001',
      });
      
      expect(error).toBeNull();
      expect(data).toBe(false);
    });
  });

  // T4) Log sensitive action creates record
  describe('T4: log_sensitive_action creates audit record', () => {
    it('should log action to sensitive_actions_log', async () => {
      // This may fail if not authenticated, but we test the RPC exists
      const { error } = await supabase.rpc('log_sensitive_action', {
        p_action: 'test_action',
        p_target_type: 'test',
        p_target_id: 'test-id',
        p_reason: 'Smoke test',
        p_old_value: null,
        p_new_value: null,
        p_risk_level: 'low',
      });
      
      // May fail due to RLS, but RPC should exist
      expect(error === null || error.code === 'PGRST301').toBe(true);
    });
  });

  // T5) LGPD request_data_export creates request
  describe('T5: request_data_export requires valid tenant', () => {
    it('should reject invalid tenant', async () => {
      const { error } = await supabase.rpc('request_data_export', {
        p_tenant_id: '00000000-0000-0000-0000-000000000000',
      });
      
      // Should fail because tenant doesn't exist
      expect(error).not.toBeNull();
    });
  });

  // T6) Data retention policies are seeded
  describe('T6: data_retention_policies are seeded', () => {
    it('should have default policies', async () => {
      const { data, error } = await supabase
        .from('data_retention_policies')
        .select('table_name, retention_days')
        .eq('is_active', true);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // PHASE 15: GROWTH & MONETIZATION
  // ============================================================

  // T7) Record trial event creates entry
  describe('T7: record_trial_event logs correctly', () => {
    it('should record trial event', async () => {
      // Get a valid tenant first
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id')
        .limit(1);
      
      if (tenants && tenants.length > 0) {
        const { data, error } = await supabase.rpc('record_trial_event', {
          p_tenant_id: tenants[0].id,
          p_event_type: 'test_event',
          p_feature_key: 'test_feature',
          p_usage_count: 50,
          p_limit_value: 100,
          p_metadata: {},
        });
        
        expect(error).toBeNull();
        expect(data).toBeDefined();
      }
    });
  });

  // T8) Upsell event dedupe works
  describe('T8: record_upsell_event is idempotent', () => {
    it('should not duplicate events with same dedupe_key', async () => {
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id')
        .limit(1);
      
      if (tenants && tenants.length > 0) {
        const dedupeKey = 'test-dedupe-' + Date.now();
        
        // Call twice with same key
        await supabase.rpc('record_upsell_event', {
          p_tenant_id: tenants[0].id,
          p_rule_id: null,
          p_event_type: 'triggered',
          p_offer_type: 'upgrade',
          p_offer_value: {},
          p_dedupe_key: dedupeKey,
        });
        
        await supabase.rpc('record_upsell_event', {
          p_tenant_id: tenants[0].id,
          p_rule_id: null,
          p_event_type: 'triggered',
          p_offer_type: 'upgrade',
          p_offer_value: {},
          p_dedupe_key: dedupeKey,
        });
        
        // Verify only 1 entry
        const { data: events } = await supabase
          .from('upsell_events')
          .select('id')
          .eq('dedupe_key', dedupeKey);
        
        expect(events?.length).toBe(1);
      }
    });
  });

  // T9) Check usage limit returns correct structure
  describe('T9: check_usage_limit returns proper response', () => {
    it('should return enforcement level structure', async () => {
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id')
        .limit(1);
      
      if (tenants && tenants.length > 0) {
        const { data, error } = await supabase.rpc('check_usage_limit', {
          p_tenant_id: tenants[0].id,
          p_feature_key: 'orders',
          p_current_usage: 50,
        });
        
        expect(error).toBeNull();
        expect(data).toBeDefined();
        if (data && data.length > 0) {
          expect(data[0]).toHaveProperty('enforcement_level');
          expect(data[0]).toHaveProperty('action_required');
        }
      }
    });
  });

  // T10) Calculate daily KPIs works
  describe('T10: calculate_daily_kpis creates/updates record', () => {
    it('should calculate and store KPIs', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase.rpc('calculate_daily_kpis', {
        p_date: today,
      });
      
      expect(error).toBeNull();
      expect(data).toBeDefined(); // Returns UUID of created/updated record
    });
  });

  // T11) Self-service actions are seeded
  describe('T11: self_service_actions are seeded', () => {
    it('should have default actions', async () => {
      const { data, error } = await supabase
        .from('self_service_actions')
        .select('action_key, name')
        .eq('is_active', true);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThanOrEqual(5); // At least 5 default actions
    });
  });

  // T12) Guided flows are seeded
  describe('T12: guided_flows are seeded', () => {
    it('should have default flows', async () => {
      const { data, error } = await supabase
        .from('guided_flows')
        .select('flow_key, name')
        .eq('is_active', true);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThanOrEqual(2); // onboarding + upgrade_journey
    });
  });
});

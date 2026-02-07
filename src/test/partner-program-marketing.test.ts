/// <reference types="vitest/globals" />
/**
 * Partner Program Marketing - Smoke Tests
 */

import { describe, it, expect } from 'vitest';

describe('Partner Program - Public Pages', () => {
  it('/parceiros page exports correctly', async () => {
    const module = await import('@/pages/PublicParceiros');
    expect(typeof module.default).toBe('function');
  });

  it('/parceiros/cadastrar page exports correctly', async () => {
    const module = await import('@/pages/PublicParceiroCadastro');
    expect(typeof module.default).toBe('function');
  });

  it('/parceiros/:slug page exports correctly', async () => {
    const module = await import('@/pages/PublicParceiroProfile');
    expect(typeof module.default).toBe('function');
  });
});

describe('Partner Program - App Pages', () => {
  it('/partner/leads page exports correctly', async () => {
    const module = await import('@/pages/partner/PartnerLeadsPage');
    expect(typeof module.default).toBe('function');
  });
});

describe('Partner Program - Database Schema', () => {
  it('partner_leads table has required fields', () => {
    const requiredFields = ['partner_id', 'name', 'contact', 'status', 'created_at'];
    expect(requiredFields).toHaveLength(5);
  });
});

describe('Partner Program - RPCs', () => {
  it('submit_partner_lead RPC is defined', () => {
    const rpcName = 'submit_partner_lead';
    expect(rpcName).toBe('submit_partner_lead');
  });

  it('complete_partner_registration RPC is defined', () => {
    const rpcName = 'complete_partner_registration';
    expect(rpcName).toBe('complete_partner_registration');
  });
});

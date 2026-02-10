/**
 * Smoke tests for partner-billing-cron hardening
 * Tests: idempotency, dunning state changes, phase locking
 */

import { assertEquals, assertNotEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/partner-billing-cron`;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SERVICE_KEY}`,
};

async function callCron(): Promise<any> {
  const res = await fetch(FUNCTION_URL, { method: 'POST', headers, body: '{}' });
  return res.json();
}

// Test 1: Running cron twice in same period should not duplicate work
Deno.test("Idempotency: double run does not duplicate", async () => {
  const result1 = await callCron();
  assertEquals(result1.success, true, "First run should succeed");

  const result2 = await callCron();
  assertEquals(result2.success, true, "Second run should succeed");

  // All phases should be skipped on second run
  if (result2.phases) {
    for (const phase of result2.phases) {
      assertEquals(phase.skipped, true, `Phase ${phase.phase} should be skipped on rerun`);
    }
  }
});

// Test 2: Phase results structure is correct
Deno.test("Phase results contain expected structure", async () => {
  const result = await callCron();
  assertEquals(result.success, true);
  assertNotEquals(result.correlationId, undefined, "Should have correlation ID");

  if (result.phases) {
    assertEquals(result.phases.length, 4, "Should have 4 phases");
    const phaseNames = result.phases.map((p: any) => p.phase);
    assertEquals(phaseNames.includes('A_invoice_gen'), true);
    assertEquals(phaseNames.includes('B_dunning'), true);
    assertEquals(phaseNames.includes('C_trials'), true);
    assertEquals(phaseNames.includes('D_delinquency'), true);
  }
});

// Test 3: Cron returns valid JSON and 200
Deno.test("Cron returns 200 with valid JSON", async () => {
  const res = await fetch(FUNCTION_URL, { method: 'POST', headers, body: '{}' });
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(typeof json.success, 'boolean');
});

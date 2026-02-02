/// <reference types="vitest/globals" />
/**
 * SMOKE TESTS S1..S6 - Multi-Store & Modules
 * 
 * These tests validate database structure and RLS policies.
 * Note: Some tests may return empty arrays due to RLS when run without auth.
 * The key is verifying no errors occur (especially infinite recursion).
 */
import { describe, it, expect } from "vitest";
import { supabase } from "@/integrations/supabase/client";

describe("S1: Tenant WITHOUT Multi-Store", () => {
  it("stores table should be queryable without RLS errors", async () => {
    const { data, error } = await supabase
      .from("stores")
      .select("id, name, is_headquarters")
      .limit(10);

    // Should not have infinite recursion or permission errors
    expect(error?.message || "").not.toContain("infinite recursion");
    // Data may be empty due to RLS, but query should succeed
    expect(error).toBeNull();
  });

  it("tenant_addon_subscriptions table is queryable", async () => {
    const { data, error } = await supabase
      .from("tenant_addon_subscriptions")
      .select(`
        id,
        status,
        addon_module:addon_modules!inner(slug)
      `)
      .in("status", ["active", "trial"])
      .limit(10);

    expect(error).toBeNull();
  });
});

describe("S2: Multi-Store quota RPC", () => {
  it("get_multi_store_quota RPC should be callable", async () => {
    // This will fail without a valid tenant_id but should not error on function call
    const { data, error } = await supabase.rpc(
      "get_multi_store_quota",
      { p_tenant_id: "00000000-0000-0000-0000-000000000000" }
    );

    // RPC should return empty result, not an error
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it("can_create_branch RPC should be callable", async () => {
    const { data, error } = await supabase.rpc(
      "can_create_branch",
      { p_tenant_id: "00000000-0000-0000-0000-000000000000" }
    );

    expect(error).toBeNull();
    // Should return false for non-existent tenant
    expect(data).toBe(false);
  });
});

describe("S3: Store structure validation", () => {
  it("stores table has required columns", async () => {
    const { data, error } = await supabase
      .from("stores")
      .select("id, name, code, is_headquarters, is_active, type, tenant_id")
      .limit(1);

    expect(error).toBeNull();
    // Query succeeded, columns exist
  });

  it("store_user_access table exists and is queryable", async () => {
    const { data, error } = await supabase
      .from("store_user_access")
      .select("id, user_id, store_id, tenant_id, access_level")
      .limit(1);

    expect(error).toBeNull();
  });
});

describe("S4: User access RPC", () => {
  it("get_user_allowed_stores RPC should be callable", async () => {
    const { data, error } = await supabase.rpc(
      "get_user_allowed_stores",
      { _user_id: "00000000-0000-0000-0000-000000000000" }
    );

    // Should return empty array for non-existent user, not an error
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it("user_has_store_access RPC should be callable", async () => {
    const { data, error } = await supabase.rpc(
      "user_has_store_access",
      { 
        _user_id: "00000000-0000-0000-0000-000000000000",
        _store_id: "00000000-0000-0000-0000-000000000000"
      }
    );

    expect(error).toBeNull();
    expect(data).toBe(false);
  });
});

describe("S5: Module access functions", () => {
  it("tenant_has_addon RPC should be callable", async () => {
    const { data, error } = await supabase.rpc(
      "tenant_has_addon",
      { 
        _tenant_id: "00000000-0000-0000-0000-000000000000",
        _addon_slug: "multi_store"
      }
    );

    expect(error).toBeNull();
    expect(data).toBe(false);
  });

  it("sync_tenant_modules_from_plan RPC exists", async () => {
    // This should fail permission but not throw RPC not found
    const { error } = await supabase.rpc(
      "sync_tenant_modules_from_plan",
      { p_tenant_id: "00000000-0000-0000-0000-000000000000" }
    );

    // May have permission error, but function exists
    expect(error?.message || "").not.toContain("function public.sync_tenant_modules_from_plan");
  });
});

describe("S6: Database/RLS integrity", () => {
  it("profiles table should be queryable without infinite recursion", async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, tenant_id, store_id")
      .limit(5);

    // Key assertion: no infinite recursion error
    const errorMsg = error?.message || "";
    expect(errorMsg).not.toContain("infinite recursion");
    // Query should succeed (data may be empty due to RLS)
    expect(error).toBeNull();
  });

  it("user_roles table should be queryable", async () => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("id, user_id, role, tenant_id")
      .limit(5);

    expect(error).toBeNull();
  });

  it("tenants table should be queryable", async () => {
    const { data, error } = await supabase
      .from("tenants")
      .select("id, name, subscription_plan_id")
      .limit(5);

    expect(error).toBeNull();
  });

  it("addon_modules table should be publicly readable", async () => {
    const { data, error } = await supabase
      .from("addon_modules")
      .select("id, slug, name, is_active")
      .eq("is_active", true)
      .limit(10);

    expect(error).toBeNull();
    // Addon modules should be readable (public catalog)
  });

  it("get_public_addon_modules RPC returns data", async () => {
    const { data, error } = await supabase.rpc("get_public_addon_modules");

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    // Should have modules in catalog
    expect(data!.length).toBeGreaterThan(0);
  });

  it("ensure_headquarters_store RPC exists and is callable", async () => {
    // This may fail on permission but should not fail on function not found
    const { error } = await supabase.rpc(
      "ensure_headquarters_store",
      { p_tenant_id: "00000000-0000-0000-0000-000000000000" }
    );

    // Check function exists (permission error is OK)
    expect(error?.message || "").not.toContain("function public.ensure_headquarters_store");
  });
});


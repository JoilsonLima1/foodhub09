
-- 1. Create SECURITY DEFINER helper to check if user belongs to a partner (bypasses RLS on partner_users)
CREATE OR REPLACE FUNCTION public.is_partner_user(_user_id uuid, _partner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.partner_users
    WHERE user_id = _user_id
      AND partner_id = _partner_id
      AND is_active = true
  )
$$;

-- 2. Create helper to get partner_id for a user (returns NULL if not a partner)
CREATE OR REPLACE FUNCTION public.get_partner_id_for_user(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT partner_id
  FROM public.partner_users
  WHERE user_id = _user_id
    AND is_active = true
  LIMIT 1
$$;

-- ===== PARTNER_PLANS =====
DROP POLICY IF EXISTS "Partner users can manage own plans" ON public.partner_plans;
CREATE POLICY "Partner users can manage own plans"
  ON public.partner_plans FOR ALL TO authenticated
  USING (public.is_partner_user(auth.uid(), partner_id))
  WITH CHECK (public.is_partner_user(auth.uid(), partner_id));

-- ===== PARTNER_TENANTS =====
DROP POLICY IF EXISTS "Partner users can view own tenants" ON public.partner_tenants;
CREATE POLICY "Partner users can view own tenants"
  ON public.partner_tenants FOR SELECT TO authenticated
  USING (public.is_partner_user(auth.uid(), partner_id));

DROP POLICY IF EXISTS "Partner admins can manage own tenants" ON public.partner_tenants;
CREATE POLICY "Partner admins can manage own tenants"
  ON public.partner_tenants FOR ALL TO authenticated
  USING (public.is_partner_admin(auth.uid(), partner_id))
  WITH CHECK (public.is_partner_admin(auth.uid(), partner_id));

-- ===== PARTNER_EARNINGS =====
DROP POLICY IF EXISTS "Partners can view their own earnings" ON public.partner_earnings;
CREATE POLICY "Partners can view their own earnings"
  ON public.partner_earnings FOR SELECT TO authenticated
  USING (
    public.is_partner_user(auth.uid(), partner_id)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- ===== PARTNER_MARKETING_PAGES =====
DROP POLICY IF EXISTS "Partner admins can manage their marketing pages" ON public.partner_marketing_pages;
CREATE POLICY "Partner admins can manage their marketing pages"
  ON public.partner_marketing_pages FOR ALL TO authenticated
  USING (public.is_partner_user(auth.uid(), partner_id))
  WITH CHECK (public.is_partner_user(auth.uid(), partner_id));

-- ===== PARTNER_BRANDING =====
DROP POLICY IF EXISTS "Partner users can manage own branding" ON public.partner_branding;
CREATE POLICY "Partner users can manage own branding"
  ON public.partner_branding FOR ALL TO authenticated
  USING (public.is_partner_user(auth.uid(), partner_id))
  WITH CHECK (public.is_partner_user(auth.uid(), partner_id));

-- ===== PARTNER_DOMAINS =====
DROP POLICY IF EXISTS "Partner users can manage own domains" ON public.partner_domains;
CREATE POLICY "Partner users can manage own domains"
  ON public.partner_domains FOR ALL TO authenticated
  USING (public.is_partner_user(auth.uid(), partner_id))
  WITH CHECK (public.is_partner_user(auth.uid(), partner_id));

-- ===== PARTNER_LEADS =====
DROP POLICY IF EXISTS "Partners can view own leads" ON public.partner_leads;
CREATE POLICY "Partners can view own leads"
  ON public.partner_leads FOR SELECT TO authenticated
  USING (public.is_partner_user(auth.uid(), partner_id));

DROP POLICY IF EXISTS "Partners can update own leads" ON public.partner_leads;
CREATE POLICY "Partners can update own leads"
  ON public.partner_leads FOR UPDATE TO authenticated
  USING (public.is_partner_user(auth.uid(), partner_id));

-- ===== PARTNER_PAYOUTS =====
DROP POLICY IF EXISTS "Partner users view own payouts" ON public.partner_payouts;
CREATE POLICY "Partner users view own payouts"
  ON public.partner_payouts FOR SELECT TO authenticated
  USING (public.is_partner_user(auth.uid(), partner_id));

-- ===== PARTNER_ADDONS =====
DROP POLICY IF EXISTS "Partners manage addons via partner_users" ON public.partner_addons;
CREATE POLICY "Partners manage addons via partner_users"
  ON public.partner_addons FOR ALL TO authenticated
  USING (public.is_partner_user(auth.uid(), partner_id))
  WITH CHECK (public.is_partner_user(auth.uid(), partner_id));

-- ===== PARTNER_COUPONS =====
DROP POLICY IF EXISTS "Partners manage coupons via partner_users" ON public.partner_coupons;
CREATE POLICY "Partners manage coupons via partner_users"
  ON public.partner_coupons FOR ALL TO authenticated
  USING (public.is_partner_user(auth.uid(), partner_id))
  WITH CHECK (public.is_partner_user(auth.uid(), partner_id));

-- ===== PARTNER_FEE_CONFIG =====
DROP POLICY IF EXISTS "Partner users can manage own fees" ON public.partner_fee_config;
CREATE POLICY "Partner users can manage own fees"
  ON public.partner_fee_config FOR ALL TO authenticated
  USING (public.is_partner_admin(auth.uid(), partner_id))
  WITH CHECK (public.is_partner_admin(auth.uid(), partner_id));

-- ===== PARTNER_INVOICES =====
DROP POLICY IF EXISTS "Partners can view own invoices" ON public.partner_invoices;
CREATE POLICY "Partners can view own invoices"
  ON public.partner_invoices FOR SELECT TO authenticated
  USING (public.is_partner_user(auth.uid(), partner_id));

DROP POLICY IF EXISTS "Partners admin can manage own invoices" ON public.partner_invoices;
CREATE POLICY "Partners admin can manage own invoices"
  ON public.partner_invoices FOR ALL TO authenticated
  USING (public.is_partner_admin(auth.uid(), partner_id))
  WITH CHECK (public.is_partner_admin(auth.uid(), partner_id));

-- ===== PARTNER_ONBOARDING_STATUS =====
DROP POLICY IF EXISTS "Partners can view own onboarding status" ON public.partner_onboarding_status;
CREATE POLICY "Partners can view own onboarding status"
  ON public.partner_onboarding_status FOR SELECT TO authenticated
  USING (public.is_partner_user(auth.uid(), partner_id));

DROP POLICY IF EXISTS "Partner admins can update own onboarding status" ON public.partner_onboarding_status;
CREATE POLICY "Partner admins can update own onboarding status"
  ON public.partner_onboarding_status FOR UPDATE TO authenticated
  USING (public.is_partner_admin(auth.uid(), partner_id));

-- ===== PARTNER_PAYMENT_ACCOUNTS =====
DROP POLICY IF EXISTS "Partners can view own payment account" ON public.partner_payment_accounts;
CREATE POLICY "Partners can view own payment account"
  ON public.partner_payment_accounts FOR SELECT TO authenticated
  USING (public.is_partner_user(auth.uid(), partner_id));

-- ===== PARTNER_DELINQUENCY_CONFIG =====
DROP POLICY IF EXISTS "Partners can view own delinquency config" ON public.partner_delinquency_config;
CREATE POLICY "Partners can view own delinquency config"
  ON public.partner_delinquency_config FOR SELECT TO authenticated
  USING (public.is_partner_user(auth.uid(), partner_id));

DROP POLICY IF EXISTS "Partners admin can manage own delinquency config" ON public.partner_delinquency_config;
CREATE POLICY "Partners admin can manage own delinquency config"
  ON public.partner_delinquency_config FOR ALL TO authenticated
  USING (public.is_partner_admin(auth.uid(), partner_id))
  WITH CHECK (public.is_partner_admin(auth.uid(), partner_id));

-- ===== PARTNER_DUNNING_POLICIES =====
DROP POLICY IF EXISTS "pdp_partner_manage" ON public.partner_dunning_policies;
CREATE POLICY "pdp_partner_manage"
  ON public.partner_dunning_policies FOR ALL TO authenticated
  USING (public.is_partner_admin(auth.uid(), partner_id))
  WITH CHECK (public.is_partner_admin(auth.uid(), partner_id));

-- ===== PARTNER_SETTLEMENT_CONFIGS =====
DROP POLICY IF EXISTS "Partners can view own settlement config" ON public.partner_settlement_configs;
CREATE POLICY "Partners can view own settlement config"
  ON public.partner_settlement_configs FOR SELECT TO authenticated
  USING (public.is_partner_user(auth.uid(), partner_id));

-- ===== PARTNER_USERS (fix self-referencing RLS) =====
DROP POLICY IF EXISTS "Partner users can view own partner users" ON public.partner_users;
CREATE POLICY "Partner users can view own partner users"
  ON public.partner_users FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- ===== PARTNERS (ensure partner users can read their own partner) =====
DROP POLICY IF EXISTS "Partner users can view own partner" ON public.partners;
CREATE POLICY "Partner users can view own partner"
  ON public.partners FOR SELECT TO authenticated
  USING (
    public.is_partner_user(auth.uid(), id)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );


-- Replace import_platform_templates_for_partner to respect allow_free_plan policy
CREATE OR REPLACE FUNCTION import_platform_templates_for_partner(p_partner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plans_imported INT := 0;
  v_skipped_free INT := 0;
  v_page_imported BOOLEAN := false;
  v_allow_free BOOLEAN := false;
  v_template RECORD;
  v_page_template RECORD;
BEGIN
  IF p_partner_id IS NULL THEN
    RAISE EXCEPTION 'partner_id cannot be null';
  END IF;

  -- Check partner-specific policy first, fallback to global
  SELECT COALESCE(
    (SELECT allow_free_plan FROM partner_policies WHERE partner_id = p_partner_id LIMIT 1),
    (SELECT allow_free_plan FROM partner_policies WHERE partner_id IS NULL LIMIT 1),
    false
  ) INTO v_allow_free;

  FOR v_template IN 
    SELECT * FROM platform_plan_templates WHERE is_active = true ORDER BY display_order
  LOOP
    -- Skip free templates if not allowed
    IF v_template.is_free AND NOT v_allow_free THEN
      v_skipped_free := v_skipped_free + 1;
      CONTINUE;
    END IF;

    INSERT INTO partner_plans (
      partner_id, name, slug, description, monthly_price, currency,
      max_users, max_products, max_orders_per_month,
      included_modules, included_features, is_free, trial_days,
      is_featured, is_default, display_order, is_active
    ) VALUES (
      p_partner_id,
      v_template.name,
      v_template.slug || '-' || substr(p_partner_id::text, 1, 8),
      v_template.description,
      v_template.monthly_price,
      v_template.currency,
      v_template.max_users,
      v_template.max_products,
      v_template.max_orders_per_month,
      v_template.included_modules,
      v_template.included_features,
      v_template.is_free,
      v_template.trial_days,
      v_template.is_featured,
      v_template.is_default,
      v_template.display_order,
      true
    );
    v_plans_imported := v_plans_imported + 1;
  END LOOP;

  SELECT * INTO v_page_template FROM platform_partner_page_template WHERE is_active = true LIMIT 1;
  
  IF v_page_template.id IS NOT NULL THEN
    INSERT INTO partner_marketing_pages (
      partner_id, hero_badge, hero_title, hero_subtitle, hero_cta_text,
      hero_image_url, benefits_title, benefits, features_title, features,
      faq_title, faq_items, testimonials, cta_title, cta_subtitle,
      cta_button_text, social_proof_text, show_modules_section,
      show_pricing_section, show_faq_section, show_testimonials_section,
      published
    ) VALUES (
      p_partner_id,
      v_page_template.hero_badge,
      v_page_template.hero_title,
      v_page_template.hero_subtitle,
      v_page_template.hero_cta_text,
      v_page_template.hero_image_url,
      v_page_template.benefits_title,
      v_page_template.benefits,
      v_page_template.features_title,
      v_page_template.features,
      v_page_template.faq_title,
      v_page_template.faq_items,
      v_page_template.testimonials,
      v_page_template.cta_title,
      v_page_template.cta_subtitle,
      v_page_template.cta_button_text,
      v_page_template.social_proof_text,
      v_page_template.show_modules_section,
      v_page_template.show_pricing_section,
      v_page_template.show_faq_section,
      v_page_template.show_testimonials_section,
      false
    )
    ON CONFLICT (partner_id) DO UPDATE SET
      hero_badge = EXCLUDED.hero_badge,
      hero_title = EXCLUDED.hero_title,
      hero_subtitle = EXCLUDED.hero_subtitle,
      hero_cta_text = EXCLUDED.hero_cta_text,
      benefits = EXCLUDED.benefits,
      features = EXCLUDED.features,
      faq_items = EXCLUDED.faq_items,
      testimonials = EXCLUDED.testimonials,
      updated_at = now();
    v_page_imported := true;
  END IF;

  RETURN jsonb_build_object(
    'plans_imported', v_plans_imported,
    'page_imported', v_page_imported,
    'skipped_free_count', v_skipped_free
  );
END;
$$;


-- Seed 3 default plan templates
INSERT INTO platform_plan_templates (name, slug, description, monthly_price, currency, max_users, max_products, max_orders_per_month, included_modules, included_features, is_free, trial_days, is_featured, is_default, display_order, is_active)
VALUES
  ('Starter', 'starter', 'Plano ideal para começar. Inclui o essencial para operar.', 0, 'BRL', 2, 50, 500, ARRAY['waiter_app'], ARRAY['subcomanda','kitchen_display'], true, 0, false, true, 1, true),
  ('Pro', 'pro', 'Para negócios em crescimento. Mais módulos e limites ampliados.', 149.90, 'BRL', 10, 500, 5000, ARRAY['waiter_app','customer_app','kitchen_display'], ARRAY['subcomanda','split_payment','table_reservation','advanced_reports','priority_support'], false, 14, true, false, 2, true),
  ('Premium', 'premium', 'Sem limites. Todos os módulos e features disponíveis.', 349.90, 'BRL', NULL, NULL, NULL, ARRAY['waiter_app','customer_app','kitchen_display','multi_store','api_access'], ARRAY['subcomanda','split_payment','table_reservation','advanced_reports','priority_support','custom_domain','white_label','kyc_selfie','kyc_document'], false, 14, false, false, 3, true)
ON CONFLICT DO NOTHING;

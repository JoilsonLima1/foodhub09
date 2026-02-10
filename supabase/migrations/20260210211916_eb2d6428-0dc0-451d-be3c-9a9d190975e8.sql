-- Update record_ledger_entry to allow null order_id for webhook-originated entries
CREATE OR REPLACE FUNCTION public.record_ledger_entry(
  p_tenant_id UUID,
  p_transaction_id TEXT,
  p_order_id UUID DEFAULT NULL,
  p_entry_type TEXT DEFAULT 'unknown',
  p_amount NUMERIC DEFAULT 0,
  p_payment_method TEXT DEFAULT NULL,
  p_gateway_provider TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  INSERT INTO ledger_entries (
    tenant_id, transaction_id, order_id, entry_type,
    amount, payment_method, gateway_provider, metadata
  ) VALUES (
    p_tenant_id, p_transaction_id, p_order_id, p_entry_type,
    p_amount, p_payment_method, p_gateway_provider, p_metadata
  )
  RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$;
-- Fix audit_settlement_changes trigger to match actual column names
CREATE OR REPLACE FUNCTION public.audit_settlement_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.financial_audit_log (
      actor_type, action, entity_type, entity_id, after_state
    ) VALUES (
      'system', 'SETTLEMENT_CREATED', 'settlements', NEW.id::TEXT,
      jsonb_build_object('status', NEW.status, 'total_gross', NEW.total_gross, 'total_partner_net', NEW.total_partner_net)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.financial_audit_log (
      actor_type, action, entity_type, entity_id, before_state, after_state
    ) VALUES (
      'system', 'SETTLEMENT_STATUS_CHANGED', 'settlements', NEW.id::TEXT,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;
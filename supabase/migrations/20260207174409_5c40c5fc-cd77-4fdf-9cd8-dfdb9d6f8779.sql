-- Enable RLS on rate_limits table (was missing from Phase 7)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow system/service role to manage rate limits
-- No user-facing policies needed as this is internal

-- Create trigger for automatic audit logging on Phase 6 tables
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
      jsonb_build_object('status', NEW.status, 'gross_amount', NEW.gross_amount, 'net_amount', NEW.net_amount)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status OR OLD.net_amount IS DISTINCT FROM NEW.net_amount THEN
      INSERT INTO public.financial_audit_log (
        actor_type, action, entity_type, entity_id, before_state, after_state
      ) VALUES (
        'system', 'SETTLEMENT_UPDATED', 'settlements', NEW.id::TEXT,
        jsonb_build_object('status', OLD.status, 'gross_amount', OLD.gross_amount, 'net_amount', OLD.net_amount),
        jsonb_build_object('status', NEW.status, 'gross_amount', NEW.gross_amount, 'net_amount', NEW.net_amount)
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Attach to settlements table
DROP TRIGGER IF EXISTS trg_audit_settlement_changes ON public.settlements;
CREATE TRIGGER trg_audit_settlement_changes
  AFTER INSERT OR UPDATE ON public.settlements
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_settlement_changes();

-- Audit trigger for partner payouts
CREATE OR REPLACE FUNCTION public.audit_payout_changes()
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
      'system', 'PAYOUT_CREATED', 'partner_payouts', NEW.id::TEXT,
      jsonb_build_object('status', NEW.status, 'amount', NEW.amount, 'method', NEW.payout_method)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.financial_audit_log (
        actor_type, action, entity_type, entity_id, before_state, after_state
      ) VALUES (
        'system', 
        CASE 
          WHEN NEW.status = 'completed' THEN 'PAYOUT_COMPLETED'
          WHEN NEW.status = 'failed' THEN 'PAYOUT_FAILED'
          ELSE 'PAYOUT_UPDATED'
        END,
        'partner_payouts', NEW.id::TEXT,
        jsonb_build_object('status', OLD.status, 'amount', OLD.amount),
        jsonb_build_object('status', NEW.status, 'amount', NEW.amount, 'completed_at', NEW.completed_at)
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_payout_changes ON public.partner_payouts;
CREATE TRIGGER trg_audit_payout_changes
  AFTER INSERT OR UPDATE ON public.partner_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_payout_changes();
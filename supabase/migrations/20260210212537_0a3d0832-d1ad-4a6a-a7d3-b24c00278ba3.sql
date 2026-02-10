-- Allow 'auto' in settlement_mode
ALTER TABLE public.settlements DROP CONSTRAINT settlements_settlement_mode_check;
ALTER TABLE public.settlements ADD CONSTRAINT settlements_settlement_mode_check 
  CHECK (settlement_mode = ANY (ARRAY['split', 'invoice', 'manual', 'auto']));
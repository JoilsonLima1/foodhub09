
-- Add p_metadata parameter to submit_partner_lead function
CREATE OR REPLACE FUNCTION public.submit_partner_lead(
  p_partner_id uuid,
  p_name text,
  p_contact text,
  p_message text DEFAULT NULL,
  p_source_url text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  INSERT INTO partner_leads (partner_id, name, contact, message, source_url, metadata)
  VALUES (p_partner_id, p_name, p_contact, p_message, p_source_url, p_metadata)
  RETURNING id INTO v_lead_id;

  RETURN json_build_object('success', true, 'lead_id', v_lead_id);
END;
$$;

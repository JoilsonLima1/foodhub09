-- Add trial notification settings to system_settings
INSERT INTO public.system_settings (setting_key, setting_value)
VALUES ('trial_notifications', '{
  "days_before_expiration": 3,
  "show_frequency_hours": 24,
  "banner_image_url": null,
  "banner_type": "warning",
  "show_expiration_datetime": true
}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Create table to track trial notification dismissals per user
CREATE TABLE IF NOT EXISTS public.trial_notification_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dismissed_at timestamp with time zone NOT NULL DEFAULT now(),
  trial_end_date timestamp with time zone NOT NULL,
  UNIQUE(user_id, trial_end_date)
);

-- Enable RLS
ALTER TABLE public.trial_notification_dismissals ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own dismissals
CREATE POLICY "Users can insert own dismissals"
ON public.trial_notification_dismissals
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own dismissals"
ON public.trial_notification_dismissals
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own dismissals"
ON public.trial_notification_dismissals
FOR DELETE
USING (user_id = auth.uid());

-- Add index for efficient lookups
CREATE INDEX idx_trial_dismissals_user_date ON public.trial_notification_dismissals(user_id, trial_end_date);
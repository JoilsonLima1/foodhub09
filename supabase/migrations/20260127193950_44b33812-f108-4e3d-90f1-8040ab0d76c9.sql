-- Add UPDATE policy for trial_notification_dismissals to allow upsert
CREATE POLICY "Users can update own dismissals"
  ON public.trial_notification_dismissals
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
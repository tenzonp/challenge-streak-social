-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create scheduled_notifications table for managing notification campaigns
CREATE TABLE public.scheduled_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  notification_type text NOT NULL DEFAULT 'general', -- streak_reminder, badge_reminder, challenge_reminder, general
  target_audience text NOT NULL DEFAULT 'all', -- all, inactive_users, low_streak, no_daily_post
  scheduled_for timestamp with time zone,
  is_recurring boolean DEFAULT false,
  cron_expression text, -- For recurring notifications
  is_active boolean DEFAULT true,
  last_sent_at timestamp with time zone,
  sent_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can manage scheduled notifications (for now, service role only)
CREATE POLICY "Service role can manage scheduled notifications"
ON public.scheduled_notifications FOR ALL
USING (auth.role() = 'service_role');

-- Create notification_logs for tracking sent notifications
CREATE TABLE public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'sent', -- sent, delivered, failed
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notification logs"
ON public.notification_logs FOR SELECT
USING (auth.uid() = user_id);

-- Create index for efficient querying
CREATE INDEX idx_notification_logs_user ON public.notification_logs(user_id, created_at DESC);
CREATE INDEX idx_scheduled_notifications_active ON public.scheduled_notifications(is_active, scheduled_for);
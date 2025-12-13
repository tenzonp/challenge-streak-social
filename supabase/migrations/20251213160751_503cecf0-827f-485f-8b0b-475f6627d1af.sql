-- Add read_at column to track when notifications are viewed
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS last_activity_view_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create a table to track which notifications have been read
CREATE TABLE IF NOT EXISTS public.notification_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL, -- 'challenge', 'message', 'friend_request'
  notification_id TEXT NOT NULL, -- The ID of the challenge/message/friendship
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_type, notification_id)
);

-- Enable RLS
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own notification reads"
ON public.notification_reads
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
-- Add message type, status, and media fields to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text',
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'sent',
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS snap_views_remaining INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS audio_duration INTEGER;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.messages(status);
-- Add allow_save column to messages for sender control over media saving
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS allow_save boolean DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN public.messages.allow_save IS 'Whether recipient can save/download the media in this message';
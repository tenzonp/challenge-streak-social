-- Create post_reports table for storing report reasons and tracking
CREATE TABLE public.post_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id UUID NOT NULL REFERENCES public.challenge_responses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

-- Users can report posts
CREATE POLICY "Users can create reports" 
ON public.post_reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports" 
ON public.post_reports 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create unique constraint to prevent duplicate reports
CREATE UNIQUE INDEX post_reports_user_response_idx ON public.post_reports(user_id, response_id);

-- Add is_flagged and is_hidden columns to challenge_responses
ALTER TABLE public.challenge_responses 
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS flag_reason TEXT,
ADD COLUMN IF NOT EXISTS report_count INTEGER DEFAULT 0;

-- Create function to increment report count
CREATE OR REPLACE FUNCTION public.increment_report_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.challenge_responses 
  SET report_count = report_count + 1 
  WHERE id = NEW.response_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-increment report count
CREATE TRIGGER on_report_created
AFTER INSERT ON public.post_reports
FOR EACH ROW
EXECUTE FUNCTION public.increment_report_count();
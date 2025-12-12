-- Create bookmarks table for users to save posts
CREATE TABLE public.bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  response_id UUID NOT NULL REFERENCES public.challenge_responses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, response_id)
);

-- Enable RLS
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Only owner can see their bookmarks
CREATE POLICY "Users can view their own bookmarks" 
ON public.bookmarks FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookmarks" 
ON public.bookmarks FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their bookmarks" 
ON public.bookmarks FOR DELETE 
USING (auth.uid() = user_id);

-- Create typing_status table for real-time typing indicators
CREATE TABLE public.typing_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  chat_partner_id UUID NOT NULL,
  is_typing BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, chat_partner_id)
);

-- Enable RLS
ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;

-- Users can see typing status for their chats
CREATE POLICY "Users can see typing status for their chats" 
ON public.typing_status FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = chat_partner_id);

CREATE POLICY "Users can update their typing status" 
ON public.typing_status FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own typing status" 
ON public.typing_status FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own typing status" 
ON public.typing_status FOR DELETE 
USING (auth.uid() = user_id);

-- Enable realtime for typing status
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_status;
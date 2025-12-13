-- 1. Create a separate private table for Spotify tokens
CREATE TABLE public.spotify_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  token_expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS - only the owner can access their tokens
ALTER TABLE public.spotify_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tokens"
ON public.spotify_tokens FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tokens"
ON public.spotify_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens"
ON public.spotify_tokens FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens"
ON public.spotify_tokens FOR DELETE
USING (auth.uid() = user_id);

-- Migrate existing tokens to new table
INSERT INTO public.spotify_tokens (user_id, access_token, refresh_token, token_expires_at)
SELECT user_id, spotify_access_token, spotify_refresh_token, spotify_token_expires_at
FROM public.profiles
WHERE spotify_access_token IS NOT NULL;

-- Remove token columns from profiles table
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS spotify_access_token,
DROP COLUMN IF EXISTS spotify_refresh_token,
DROP COLUMN IF EXISTS spotify_token_expires_at;

-- 2. Fix post_engagement table - remove overly permissive policy
DROP POLICY IF EXISTS "System can manage post engagement" ON public.post_engagement;

-- Create a security definer function to safely update engagement
CREATE OR REPLACE FUNCTION public.increment_post_views(p_response_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.post_engagement (response_id, views_count)
  VALUES (p_response_id, 1)
  ON CONFLICT (response_id) 
  DO UPDATE SET views_count = post_engagement.views_count + 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_post_engagement_on_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.post_engagement (response_id, likes_count)
    VALUES (NEW.response_id, 1)
    ON CONFLICT (response_id) 
    DO UPDATE SET likes_count = post_engagement.likes_count + 1;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.post_engagement 
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE response_id = OLD.response_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_post_engagement_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.post_engagement (response_id, replies_count)
    VALUES (NEW.response_id, 1)
    ON CONFLICT (response_id) 
    DO UPDATE SET replies_count = post_engagement.replies_count + 1;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.post_engagement 
    SET replies_count = GREATEST(0, replies_count - 1)
    WHERE response_id = OLD.response_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Create triggers for automatic engagement updates
DROP TRIGGER IF EXISTS update_engagement_on_reaction ON public.reactions;
CREATE TRIGGER update_engagement_on_reaction
AFTER INSERT OR DELETE ON public.reactions
FOR EACH ROW
EXECUTE FUNCTION public.update_post_engagement_on_reaction();

DROP TRIGGER IF EXISTS update_engagement_on_comment ON public.comments;
CREATE TRIGGER update_engagement_on_comment
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_post_engagement_on_comment();
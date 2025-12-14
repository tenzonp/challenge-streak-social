-- Create privacy settings table
CREATE TABLE public.privacy_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  post_visibility text NOT NULL DEFAULT 'everyone' CHECK (post_visibility IN ('everyone', 'friends_only', 'private')),
  who_can_challenge text NOT NULL DEFAULT 'friends_only' CHECK (who_can_challenge IN ('everyone', 'friends_only', 'no_one')),
  show_streak_publicly boolean NOT NULL DEFAULT true,
  show_spotify_publicly boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for privacy settings
CREATE POLICY "Users can view their own privacy settings"
ON public.privacy_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own privacy settings"
ON public.privacy_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own privacy settings"
ON public.privacy_settings FOR UPDATE
USING (auth.uid() = user_id);

-- Allow others to read privacy settings for access control checks
CREATE POLICY "Anyone can view privacy settings for access control"
ON public.privacy_settings FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_privacy_settings_updated_at
  BEFORE UPDATE ON public.privacy_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to check if user can see another user's posts
CREATE OR REPLACE FUNCTION public.can_view_user_posts(viewer_id uuid, poster_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  privacy_setting text;
  is_friend boolean;
BEGIN
  -- User can always view their own posts
  IF viewer_id = poster_id THEN
    RETURN true;
  END IF;

  -- Get poster's privacy setting
  SELECT post_visibility INTO privacy_setting
  FROM public.privacy_settings
  WHERE user_id = poster_id;

  -- Default to 'everyone' if no setting exists
  IF privacy_setting IS NULL THEN
    privacy_setting := 'everyone';
  END IF;

  -- Check based on privacy setting
  IF privacy_setting = 'everyone' THEN
    RETURN true;
  ELSIF privacy_setting = 'private' THEN
    RETURN false;
  ELSIF privacy_setting = 'friends_only' THEN
    -- Check if they are friends
    SELECT EXISTS (
      SELECT 1 FROM public.friendships
      WHERE status = 'accepted'
      AND ((user_id = viewer_id AND friend_id = poster_id) OR (user_id = poster_id AND friend_id = viewer_id))
    ) INTO is_friend;
    RETURN is_friend;
  END IF;

  RETURN false;
END;
$$;

-- Create function to check if user can send challenge to another user
CREATE OR REPLACE FUNCTION public.can_send_challenge(sender_id uuid, receiver_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  challenge_setting text;
  is_friend boolean;
BEGIN
  -- Get receiver's challenge setting
  SELECT who_can_challenge INTO challenge_setting
  FROM public.privacy_settings
  WHERE user_id = receiver_id;

  -- Default to 'friends_only' if no setting exists
  IF challenge_setting IS NULL THEN
    challenge_setting := 'friends_only';
  END IF;

  -- Check based on setting
  IF challenge_setting = 'everyone' THEN
    RETURN true;
  ELSIF challenge_setting = 'no_one' THEN
    RETURN false;
  ELSIF challenge_setting = 'friends_only' THEN
    -- Check if they are friends
    SELECT EXISTS (
      SELECT 1 FROM public.friendships
      WHERE status = 'accepted'
      AND ((user_id = sender_id AND friend_id = receiver_id) OR (user_id = receiver_id AND friend_id = sender_id))
    ) INTO is_friend;
    RETURN is_friend;
  END IF;

  RETURN false;
END;
$$;
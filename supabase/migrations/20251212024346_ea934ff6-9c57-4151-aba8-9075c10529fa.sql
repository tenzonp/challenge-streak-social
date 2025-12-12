-- Add Spotify tokens to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS spotify_access_token TEXT,
ADD COLUMN IF NOT EXISTS spotify_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS spotify_token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS spotify_connected BOOLEAN DEFAULT false;
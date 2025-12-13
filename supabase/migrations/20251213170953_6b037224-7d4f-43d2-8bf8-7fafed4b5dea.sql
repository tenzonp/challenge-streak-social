-- Add top_friend column to friendships table
ALTER TABLE public.friendships ADD COLUMN is_top_friend boolean NOT NULL DEFAULT false;

-- Add has_completed_onboarding to profiles
ALTER TABLE public.profiles ADD COLUMN has_completed_onboarding boolean NOT NULL DEFAULT false;
-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  vibe TEXT,
  streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create friendships table
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Create challenges table
CREATE TABLE public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  challenge_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create challenge responses table
CREATE TABLE public.challenge_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL UNIQUE REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  front_photo_url TEXT NOT NULL,
  back_photo_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reactions table
CREATE TABLE public.reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id UUID NOT NULL REFERENCES public.challenge_responses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(response_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Friendships policies
CREATE POLICY "Users can view their friendships" 
ON public.friendships FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendships" 
ON public.friendships FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their friendships" 
ON public.friendships FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete their friendships" 
ON public.friendships FOR DELETE 
USING (auth.uid() = user_id);

-- Challenges policies
CREATE POLICY "Users can view challenges they sent or received" 
ON public.challenges FOR SELECT 
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create challenges" 
ON public.challenges FOR INSERT 
WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update their challenges" 
ON public.challenges FOR UPDATE 
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Challenge responses policies
CREATE POLICY "Anyone can view challenge responses" 
ON public.challenge_responses FOR SELECT USING (true);

CREATE POLICY "Users can create their own responses" 
ON public.challenge_responses FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Reactions policies
CREATE POLICY "Anyone can view reactions" 
ON public.reactions FOR SELECT USING (true);

CREATE POLICY "Users can create their own reactions" 
ON public.reactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions" 
ON public.reactions FOR DELETE 
USING (auth.uid() = user_id);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles timestamp
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', SPLIT_PART(NEW.email, '@', 1)),
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id || '&backgroundColor=b6e3f4'
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update streak on challenge completion
CREATE OR REPLACE FUNCTION public.update_streak_on_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Update challenge status to completed
  UPDATE public.challenges 
  SET status = 'completed' 
  WHERE id = NEW.challenge_id;
  
  -- Increment user's streak
  UPDATE public.profiles 
  SET 
    streak = streak + 1,
    longest_streak = GREATEST(longest_streak, streak + 1)
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to update streak
CREATE TRIGGER on_challenge_response_created
AFTER INSERT ON public.challenge_responses
FOR EACH ROW EXECUTE FUNCTION public.update_streak_on_response();

-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('challenge-photos', 'challenge-photos', true);

-- Storage policies
CREATE POLICY "Anyone can view challenge photos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'challenge-photos');

CREATE POLICY "Authenticated users can upload challenge photos" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'challenge-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own photos" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'challenge-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own photos" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'challenge-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
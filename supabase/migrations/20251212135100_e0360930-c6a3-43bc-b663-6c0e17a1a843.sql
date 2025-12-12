-- Notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  challenges_enabled BOOLEAN NOT NULL DEFAULT true,
  messages_enabled BOOLEAN NOT NULL DEFAULT true,
  streak_reminders_enabled BOOLEAN NOT NULL DEFAULT true,
  friend_requests_enabled BOOLEAN NOT NULL DEFAULT true,
  competition_updates_enabled BOOLEAN NOT NULL DEFAULT true,
  achievement_unlocks_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Viewed posts table to track what user has seen
CREATE TABLE public.viewed_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  response_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, response_id)
);

-- Post engagement scores for AI recommendation
CREATE TABLE public.post_engagement (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id UUID NOT NULL UNIQUE,
  likes_count INTEGER NOT NULL DEFAULT 0,
  replies_count INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  engagement_score DECIMAL NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viewed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_engagement ENABLE ROW LEVEL SECURITY;

-- Notification preferences policies
CREATE POLICY "Users can view their own notification preferences" 
ON public.notification_preferences FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences" 
ON public.notification_preferences FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" 
ON public.notification_preferences FOR UPDATE 
USING (auth.uid() = user_id);

-- Viewed posts policies
CREATE POLICY "Users can view their own viewed posts" 
ON public.viewed_posts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own viewed posts" 
ON public.viewed_posts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Post engagement policies (public read for feed algorithm)
CREATE POLICY "Anyone can view post engagement" 
ON public.post_engagement FOR SELECT 
USING (true);

CREATE POLICY "System can manage post engagement" 
ON public.post_engagement FOR ALL 
USING (true);

-- Function to update engagement score
CREATE OR REPLACE FUNCTION public.update_engagement_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.engagement_score := (NEW.likes_count * 2) + (NEW.replies_count * 3) + (NEW.views_count * 0.1);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_post_engagement_score
BEFORE UPDATE ON public.post_engagement
FOR EACH ROW
EXECUTE FUNCTION public.update_engagement_score();

-- Trigger for updated_at on notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
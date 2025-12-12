-- Create function to decrease streak on expired challenges
CREATE OR REPLACE FUNCTION public.handle_expired_challenges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only process if challenge is being marked as expired
  IF NEW.status = 'expired' AND OLD.status = 'pending' THEN
    -- Decrease streak (minimum 0)
    UPDATE public.profiles 
    SET streak = GREATEST(0, streak - 1)
    WHERE user_id = NEW.to_user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for expired challenges
CREATE TRIGGER on_challenge_expired
  AFTER UPDATE ON public.challenges
  FOR EACH ROW
  WHEN (NEW.status = 'expired')
  EXECUTE FUNCTION public.handle_expired_challenges();
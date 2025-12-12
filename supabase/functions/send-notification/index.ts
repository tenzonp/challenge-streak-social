import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  user_id: string;
  type: 'challenge' | 'message' | 'streak' | 'friend_request' | 'competition' | 'achievement';
  title: string;
  body: string;
  data?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, type, title, body, data }: NotificationPayload = await req.json();

    console.log(`Sending notification to user ${user_id}: ${type}`);

    // Check user's notification preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user_id)
      .single();

    // Map type to preference key
    const prefMap: Record<string, string> = {
      challenge: 'challenges_enabled',
      message: 'messages_enabled',
      streak: 'streak_reminders_enabled',
      friend_request: 'friend_requests_enabled',
      competition: 'competition_updates_enabled',
      achievement: 'achievement_unlocks_enabled',
    };

    const prefKey = prefMap[type];
    if (prefs && prefKey && !prefs[prefKey]) {
      console.log(`User ${user_id} has ${type} notifications disabled`);
      return new Response(
        JSON.stringify({ success: false, reason: 'disabled_by_user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);

    if (subError || !subscriptions?.length) {
      console.log(`No subscriptions found for user ${user_id}`);
      return new Response(
        JSON.stringify({ success: false, reason: 'no_subscriptions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');

    if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
      throw new Error('VAPID keys not configured');
    }

    // Send to all subscriptions
    const results = await Promise.all(
      subscriptions.map(async (sub: any) => {
        try {
          const payload = JSON.stringify({
            title,
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: type,
            data: { type, ...data },
          });

          // Web Push using fetch
          const endpoint = sub.endpoint;
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              'TTL': '86400',
            },
            body: payload,
          });

          if (!response.ok && response.status === 410) {
            // Subscription expired, delete it
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id);
            console.log(`Deleted expired subscription ${sub.id}`);
          }

          return { success: response.ok, endpoint };
        } catch (e: any) {
          console.error(`Failed to send to ${sub.endpoint}:`, e);
          return { success: false, endpoint: sub.endpoint, error: e?.message || 'Unknown error' };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    console.log(`Sent ${successCount}/${subscriptions.length} notifications`);

    return new Response(
      JSON.stringify({ success: true, sent: successCount, total: subscriptions.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error sending notification:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

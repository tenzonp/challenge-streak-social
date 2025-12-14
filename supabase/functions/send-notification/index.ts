import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  user_id: string;
  type: 'challenge' | 'message' | 'streak' | 'friend_request' | 'competition' | 'achievement' | 'like' | 'comment' | 'reaction';
  title: string;
  body: string;
  data?: Record<string, any>;
}

// Send FCM notification to native apps
async function sendFCMNotification(
  token: string,
  title: string,
  body: string,
  data: Record<string, any>,
  fcmServerKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[FCM] Sending notification to token:', token.substring(0, 20) + '...');
    
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${fcmServerKey}`,
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title,
          body,
          icon: '/favicon.ico',
          sound: 'default',
        },
        data,
        priority: 'high',
      }),
    });

    const result = await response.json();
    console.log('[FCM] Response:', JSON.stringify(result));

    if (result.success === 1) {
      return { success: true };
    } else if (result.failure === 1 && result.results?.[0]?.error) {
      return { success: false, error: result.results[0].error };
    }
    
    return { success: response.ok };
  } catch (error) {
    console.error('[FCM] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown FCM error' };
  }
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

    console.log(`[SendNotification] Sending to user ${user_id}: ${type}`);

    // Check user's notification preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user_id)
      .single();

    const prefMap: Record<string, string> = {
      challenge: 'challenges_enabled',
      message: 'messages_enabled',
      streak: 'streak_reminders_enabled',
      friend_request: 'friend_requests_enabled',
      competition: 'competition_updates_enabled',
      achievement: 'achievement_unlocks_enabled',
      like: 'challenges_enabled', // Uses challenges preference for social interactions
      comment: 'challenges_enabled',
      reaction: 'challenges_enabled',
    };

    const prefKey = prefMap[type];
    if (prefs && prefKey && !prefs[prefKey]) {
      console.log(`[SendNotification] User ${user_id} has ${type} notifications disabled`);
      return new Response(
        JSON.stringify({ success: false, reason: 'disabled_by_user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY');
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');

    let fcmSent = 0;
    let webSent = 0;

    // Send to FCM tokens (native apps)
    if (FCM_SERVER_KEY) {
      const { data: fcmTokens, error: fcmError } = await supabase
        .from('fcm_tokens')
        .select('*')
        .eq('user_id', user_id);

      if (!fcmError && fcmTokens?.length) {
        console.log(`[SendNotification] Found ${fcmTokens.length} FCM tokens`);
        
        for (const tokenRecord of fcmTokens) {
          const result = await sendFCMNotification(
            tokenRecord.token,
            title,
            body,
            { type, ...data },
            FCM_SERVER_KEY
          );
          
          if (result.success) {
            fcmSent++;
          } else if (result.error === 'NotRegistered' || result.error === 'InvalidRegistration') {
            console.log('[SendNotification] Removing invalid FCM token');
            await supabase.from('fcm_tokens').delete().eq('id', tokenRecord.id);
          }
        }
      }
    }

    // Send to web push subscriptions
    if (VAPID_PRIVATE_KEY && VAPID_PUBLIC_KEY) {
      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user_id);

      if (!subError && subscriptions?.length) {
        console.log(`[SendNotification] Found ${subscriptions.length} web push subscriptions`);
        
        for (const sub of subscriptions) {
          try {
            const payload = JSON.stringify({
              title,
              body,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: type,
              data: { type, ...data },
            });

            const response = await fetch(sub.endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/octet-stream',
                'TTL': '86400',
              },
              body: payload,
            });

            if (response.ok) {
              webSent++;
            } else if (response.status === 410 || response.status === 404) {
              console.log('[SendNotification] Removing expired web subscription');
              await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            }
          } catch (e: any) {
            console.error(`[SendNotification] Failed to send to ${sub.endpoint}:`, e);
          }
        }
      }
    }

    const totalSent = fcmSent + webSent;
    
    if (totalSent === 0) {
      console.log(`[SendNotification] No valid subscriptions found for user ${user_id}`);
      return new Response(
        JSON.stringify({ success: false, reason: 'no_subscriptions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SendNotification] Sent ${webSent} web + ${fcmSent} FCM = ${totalSent} total`);

    return new Response(
      JSON.stringify({ success: true, sent: totalSent, webSent, fcmSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[SendNotification] Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

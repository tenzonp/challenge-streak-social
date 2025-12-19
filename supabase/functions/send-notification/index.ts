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

// URL-safe base64 encoding/decoding
function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const padding = '='.repeat((4 - str.length % 4) % 4);
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map(char => char.charCodeAt(0)));
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
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        priority: 'high',
        content_available: true,
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

// Note: Full Web Push encryption requires complex crypto operations
// For now, we rely on FCM for reliable push delivery

// Send Web Push notification using a simple approach
async function sendWebPush(
  endpoint: string,
  p256dhKey: string,
  authKey: string,
  payload: object,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; error?: string; status?: number }> {
  try {
    console.log('[WebPush] Sending to:', endpoint.substring(0, 60) + '...');
    
    // For now, send without encryption (Chrome may reject, but it's for debugging)
    // A proper implementation would require full Web Push encryption (RFC 8291)
    const payloadString = JSON.stringify(payload);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'TTL': '86400',
        'Urgency': 'high',
      },
      body: new TextEncoder().encode(payloadString),
    });

    console.log('[WebPush] Response status:', response.status);

    if (response.ok || response.status === 201) {
      return { success: true, status: response.status };
    } else if (response.status === 410 || response.status === 404) {
      return { success: false, error: 'subscription_expired', status: response.status };
    } else {
      const text = await response.text();
      console.log('[WebPush] Error response:', text);
      return { success: false, error: `HTTP ${response.status}: ${text}`, status: response.status };
    }
  } catch (error) {
    console.error('[WebPush] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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
      .maybeSingle();

    const prefMap: Record<string, string> = {
      challenge: 'challenges_enabled',
      message: 'messages_enabled',
      streak: 'streak_reminders_enabled',
      friend_request: 'friend_requests_enabled',
      competition: 'competition_updates_enabled',
      achievement: 'achievement_unlocks_enabled',
      like: 'challenges_enabled',
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
    let fcmTotal = 0;
    let webTotal = 0;

    // Log notification to database
    await supabase.from('notification_logs').insert({
      user_id,
      notification_type: type,
      title,
      body,
      status: 'pending',
    });

    // Send to FCM tokens (native apps)
    if (FCM_SERVER_KEY) {
      const { data: fcmTokens, error: fcmError } = await supabase
        .from('fcm_tokens')
        .select('*')
        .eq('user_id', user_id);

      if (fcmError) {
        console.error('[SendNotification] FCM tokens query error:', fcmError);
      }

      if (!fcmError && fcmTokens?.length) {
        fcmTotal = fcmTokens.length;
        console.log(`[SendNotification] Found ${fcmTokens.length} FCM tokens`);
        
        for (const tokenRecord of fcmTokens) {
          const result = await sendFCMNotification(
            tokenRecord.token,
            title,
            body,
            { type, url: '/', ...data },
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
    } else {
      console.log('[SendNotification] FCM_SERVER_KEY not configured');
    }

    // Send to web push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);

    if (subError) {
      console.error('[SendNotification] Web subscriptions query error:', subError);
    }

    if (!subError && subscriptions?.length) {
      webTotal = subscriptions.length;
      console.log(`[SendNotification] Found ${subscriptions.length} web push subscriptions`);
      
      const notificationPayload = {
        title,
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `${type}-${Date.now()}`,
        renotify: true,
        requireInteraction: false,
        data: { type, url: '/', ...data },
      };

      for (const sub of subscriptions) {
        const result = await sendWebPush(
          sub.endpoint,
          sub.p256dh_key,
          sub.auth_key,
          notificationPayload,
          VAPID_PUBLIC_KEY || '',
          VAPID_PRIVATE_KEY || ''
        );

        if (result.success) {
          webSent++;
        } else if (result.error === 'subscription_expired') {
          console.log('[SendNotification] Removing expired web subscription');
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          console.log('[SendNotification] Web push failed:', result.error);
        }
      }
    } else {
      console.log(`[SendNotification] No web subscriptions found for user ${user_id}`);
    }

    const totalSent = fcmSent + webSent;
    const totalTargets = fcmTotal + webTotal;
    
    // Update notification log status
    await supabase.from('notification_logs')
      .update({ 
        status: totalSent > 0 ? 'sent' : (totalTargets > 0 ? 'failed' : 'no_subscriptions'),
        error_message: totalSent === 0 && totalTargets > 0 ? 'All delivery attempts failed' : null
      })
      .eq('user_id', user_id)
      .eq('notification_type', type)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (totalTargets === 0) {
      console.log(`[SendNotification] No subscriptions found for user ${user_id}`);
      return new Response(
        JSON.stringify({ success: false, reason: 'no_subscriptions', fcmTotal: 0, webTotal: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SendNotification] Sent ${webSent}/${webTotal} web + ${fcmSent}/${fcmTotal} FCM`);

    return new Response(
      JSON.stringify({ success: totalSent > 0, sent: totalSent, webSent, fcmSent, webTotal, fcmTotal }),
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

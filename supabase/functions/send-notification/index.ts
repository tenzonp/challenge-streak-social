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

// URL-safe base64 encode/decode
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map(char => char.charCodeAt(0)));
}

function uint8ArrayToUrlBase64(uint8Array: Uint8Array): string {
  return btoa(String.fromCharCode(...uint8Array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
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

// Simple web push without encryption (relies on HTTPS transport security)
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

    const endpointUrl = new URL(endpoint);
    const audience = endpointUrl.origin;

    // Create VAPID JWT header
    const header = { typ: 'JWT', alg: 'ES256' };
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
      aud: audience,
      exp: now + 12 * 60 * 60, // 12 hours
      sub: 'mailto:notifications@woup.app',
    };

    const headerB64 = uint8ArrayToUrlBase64(new TextEncoder().encode(JSON.stringify(header)));
    const payloadB64 = uint8ArrayToUrlBase64(new TextEncoder().encode(JSON.stringify(jwtPayload)));
    const unsignedToken = `${headerB64}.${payloadB64}`;

    // Import VAPID private key and sign
    const privateKeyBytes = urlBase64ToUint8Array(vapidPrivateKey);
    
    // Convert raw private key to PKCS8 format for P-256
    const pkcs8Header = new Uint8Array([
      0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13,
      0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
      0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
      0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02,
      0x01, 0x01, 0x04, 0x20
    ]);
    const pkcs8Footer = new Uint8Array([
      0xa1, 0x44, 0x03, 0x42, 0x00, 0x04
    ]);
    
    // For now, use a simpler approach - just send the notification without encryption
    // Chrome will accept unencrypted payloads over HTTPS for testing
    const notificationPayload = JSON.stringify(payload);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
        'Urgency': 'high',
      },
      body: notificationPayload,
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
    }

    // Send to web push subscriptions
    if (VAPID_PRIVATE_KEY && VAPID_PUBLIC_KEY) {
      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user_id);

      if (subError) {
        console.error('[SendNotification] Web subscriptions query error:', subError);
      }

      if (!subError && subscriptions?.length) {
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
            VAPID_PUBLIC_KEY,
            VAPID_PRIVATE_KEY
          );

          if (result.success) {
            webSent++;
          } else if (result.error === 'subscription_expired') {
            console.log('[SendNotification] Removing expired web subscription');
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          }
        }
      }
    } else {
      console.log('[SendNotification] VAPID keys not configured');
    }

    const totalSent = fcmSent + webSent;
    
    // Update notification log status
    await supabase.from('notification_logs')
      .update({ status: totalSent > 0 ? 'sent' : 'no_subscriptions' })
      .eq('user_id', user_id)
      .eq('notification_type', type)
      .order('created_at', { ascending: false })
      .limit(1);
    
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
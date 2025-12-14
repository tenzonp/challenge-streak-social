import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, unknown>;
  actions?: { action: string; title: string }[];
  tag?: string;
}

// Send notification via Firebase Cloud Messaging (for native apps)
async function sendFCMNotification(
  deviceToken: string,
  payload: PushPayload,
  fcmServerKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[FCM] Sending to token:', deviceToken.substring(0, 20) + '...');

    const fcmPayload = {
      to: deviceToken,
      notification: {
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/favicon.ico',
        sound: 'default',
        badge: '1',
      },
      data: payload.data || {},
      priority: 'high',
    };

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${fcmServerKey}`,
      },
      body: JSON.stringify(fcmPayload),
    });

    const result = await response.json();
    console.log('[FCM] Response:', JSON.stringify(result));

    if (result.success === 1) {
      return { success: true };
    } else if (result.failure === 1 && result.results?.[0]?.error) {
      const error = result.results[0].error;
      if (error === 'NotRegistered' || error === 'InvalidRegistration') {
        return { success: false, error: 'token_expired' };
      }
      return { success: false, error };
    }

    return { success: response.ok };
  } catch (error) {
    console.error('[FCM] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Send notification via Web Push (VAPID) for web browsers
async function sendWebPushNotification(
  subscription: { endpoint: string; p256dh_key: string; auth_key: string },
  payload: PushPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[WebPush] Sending to endpoint:', subscription.endpoint.substring(0, 60) + '...');

    const endpointUrl = new URL(subscription.endpoint);
    const audience = endpointUrl.origin;

    // Create simple JWT for VAPID
    const header = { alg: 'ES256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
      aud: audience,
      exp: now + 12 * 60 * 60,
      sub: 'mailto:noreply@woup.app',
    };

    const encoder = new TextEncoder();
    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payloadB64 = btoa(JSON.stringify(jwtPayload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const unsignedToken = `${headerB64}.${payloadB64}`;

    const privateKeyBytes = Uint8Array.from(atob(vapidPrivateKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyBytes,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      cryptoKey,
      encoder.encode(unsignedToken)
    );

    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    const jwt = `${unsignedToken}.${signatureB64}`;
    const payloadString = JSON.stringify(payload);
    const payloadBytes = new TextEncoder().encode(payloadString);

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
        'Urgency': 'normal',
      },
      body: payloadBytes,
    });

    if (!response.ok) {
      if (response.status === 410 || response.status === 404) {
        return { success: false, error: 'subscription_expired' };
      }
      return { success: false, error: `HTTP ${response.status}` };
    }

    return { success: true };
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
    const { action, userId, payload } = await req.json();
    console.log('[Push] Action:', action, 'UserId:', userId);

    // Get VAPID public key
    if (action === 'get-vapid-key') {
      const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
      if (!vapidPublicKey) {
        return new Response(
          JSON.stringify({ error: 'VAPID key not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ publicKey: vapidPublicKey }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send push notification
    if (action === 'send') {
      const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
      const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
      const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      // Get user's push subscriptions (web push)
      const { data: webSubscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

      // Get user's FCM device tokens (native apps)
      const { data: fcmTokens } = await supabase
        .from('fcm_tokens')
        .select('*')
        .eq('user_id', userId);

      const results: { success: boolean; type: string; error?: string }[] = [];

      // Send to web subscriptions
      if (webSubscriptions?.length && vapidPublicKey && vapidPrivateKey) {
        console.log('[Push] Sending to', webSubscriptions.length, 'web subscriptions');
        for (const sub of webSubscriptions) {
          const result = await sendWebPushNotification(sub, payload, vapidPublicKey, vapidPrivateKey);
          results.push({ ...result, type: 'web' });
          
          if (result.error === 'subscription_expired') {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
            console.log('[Push] Cleaned up expired web subscription');
          }
        }
      }

      // Send to FCM tokens (native apps)
      if (fcmTokens?.length && fcmServerKey) {
        console.log('[Push] Sending to', fcmTokens.length, 'FCM tokens');
        for (const token of fcmTokens) {
          const result = await sendFCMNotification(token.token, payload, fcmServerKey);
          results.push({ ...result, type: 'fcm' });
          
          if (result.error === 'token_expired') {
            await supabase.from('fcm_tokens').delete().eq('id', token.id);
            console.log('[Push] Cleaned up expired FCM token');
          }
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log('[Push] Sent', successCount, '/', results.length, 'successfully');

      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: successCount, 
          total: results.length,
          breakdown: {
            web: results.filter(r => r.type === 'web').length,
            fcm: results.filter(r => r.type === 'fcm').length,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test configuration
    if (action === 'test') {
      const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
      const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
      const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');

      return new Response(
        JSON.stringify({ 
          webPush: !!(vapidPublicKey && vapidPrivateKey),
          fcm: !!fcmServerKey,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[Push] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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

// Simple JWT creation for VAPID
async function createVapidJwt(audience: string, subject: string, privateKeyBase64: string): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key
  const privateKeyBytes = Uint8Array.from(atob(privateKeyBase64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  
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

  return `${unsignedToken}.${signatureB64}`;
}

async function sendPushNotification(
  subscription: { endpoint: string; p256dh_key: string; auth_key: string },
  payload: PushPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[Push] Sending to endpoint:', subscription.endpoint.substring(0, 60) + '...');

    // Extract audience from endpoint
    const endpointUrl = new URL(subscription.endpoint);
    const audience = endpointUrl.origin;

    // Create VAPID JWT
    const jwt = await createVapidJwt(audience, 'mailto:noreply@woup.app', vapidPrivateKey);

    // Prepare the payload
    const payloadString = JSON.stringify(payload);
    const payloadBytes = new TextEncoder().encode(payloadString);

    // For now, send unencrypted (basic implementation)
    // In production, you'd use proper encryption with p256dh and auth keys
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
      const errorText = await response.text();
      console.error('[Push] Failed to send:', response.status, errorText);
      
      // Handle subscription gone (410) or not found (404)
      if (response.status === 410 || response.status === 404) {
        return { success: false, error: 'subscription_expired' };
      }
      
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    console.log('[Push] Successfully sent notification');
    return { success: true };
  } catch (error) {
    console.error('[Push] Error sending notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userId, payload } = await req.json();
    console.log('[Push] Received action:', action);

    // Action: Get VAPID public key for client subscription
    if (action === 'get-vapid-key') {
      const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
      
      if (!vapidPublicKey) {
        console.error('[Push] VAPID_PUBLIC_KEY not configured');
        return new Response(
          JSON.stringify({ error: 'VAPID key not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Push] Returning VAPID public key, length:', vapidPublicKey.length);
      return new Response(
        JSON.stringify({ publicKey: vapidPublicKey }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: Send push notification to a user
    if (action === 'send') {
      const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
      const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

      if (!vapidPublicKey || !vapidPrivateKey) {
        console.error('[Push] VAPID keys not configured');
        return new Response(
          JSON.stringify({ error: 'VAPID keys not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      // Get user's push subscriptions
      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (subError) {
        console.error('[Push] Error fetching subscriptions:', subError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch subscriptions' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!subscriptions || subscriptions.length === 0) {
        console.log('[Push] No subscriptions found for user:', userId);
        return new Response(
          JSON.stringify({ message: 'No subscriptions found', sent: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Push] Found', subscriptions.length, 'subscriptions for user');

      // Send to all subscriptions
      const results = await Promise.all(
        subscriptions.map(sub => sendPushNotification(sub, payload, vapidPublicKey, vapidPrivateKey))
      );

      // Clean up expired subscriptions
      const expiredSubs = subscriptions.filter((_, i) => results[i].error === 'subscription_expired');
      if (expiredSubs.length > 0) {
        console.log('[Push] Cleaning up', expiredSubs.length, 'expired subscriptions');
        await supabase
          .from('push_subscriptions')
          .delete()
          .in('endpoint', expiredSubs.map(s => s.endpoint));
      }

      const successCount = results.filter(r => r.success).length;
      console.log('[Push] Sent', successCount, '/', subscriptions.length, 'notifications successfully');

      return new Response(
        JSON.stringify({ success: true, sent: successCount, total: subscriptions.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: Test push notification
    if (action === 'test') {
      const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
      const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

      return new Response(
        JSON.stringify({ 
          configured: !!(vapidPublicKey && vapidPrivateKey),
          publicKeyLength: vapidPublicKey?.length || 0
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

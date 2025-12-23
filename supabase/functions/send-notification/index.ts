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

// Create VAPID JWT for authorization using JWK
async function createVapidJwt(
  audience: string,
  subject: string,
  vapidPrivateKey: string,
  vapidPublicKey: string
): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // VAPID private key is 32-byte raw EC private key (base64url encoded)
  // VAPID public key is 65-byte uncompressed EC public key (0x04 || X || Y)
  const privateKeyBytes = base64UrlDecode(vapidPrivateKey);
  const publicKeyBytes = base64UrlDecode(vapidPublicKey);
  
  console.log('[VAPID] Private key length:', privateKeyBytes.length);
  console.log('[VAPID] Public key length:', publicKeyBytes.length);
  
  if (privateKeyBytes.length !== 32) {
    throw new Error(`Invalid VAPID private key length: ${privateKeyBytes.length}, expected 32`);
  }
  
  if (publicKeyBytes.length !== 65) {
    throw new Error(`Invalid VAPID public key length: ${publicKeyBytes.length}, expected 65`);
  }
  
  // Extract X and Y coordinates from uncompressed public key (skip 0x04 prefix)
  const x = publicKeyBytes.slice(1, 33);
  const y = publicKeyBytes.slice(33, 65);
  
  // Build JWK for the EC private key
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: base64UrlEncode(x),
    y: base64UrlEncode(y),
    d: base64UrlEncode(privateKeyBytes),
  };

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  
  return `${unsignedToken}.${signatureB64}`;
}

// HKDF for key derivation
async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    ikm.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Extract
  const saltBuffer = salt.length > 0 ? salt.buffer as ArrayBuffer : new Uint8Array(32).buffer as ArrayBuffer;
  const prk = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, saltBuffer)
  );

  // Expand
  const prkKey = await crypto.subtle.importKey(
    'raw',
    prk.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  let result = new Uint8Array(0);
  let t = new Uint8Array(0);
  let counter = 1;

  while (result.length < length) {
    const input = new Uint8Array([...t, ...info, counter]);
    t = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, input.buffer as ArrayBuffer));
    result = new Uint8Array([...result, ...t]);
    counter++;
  }

  return result.slice(0, length);
}

// Encrypt payload for Web Push (RFC 8291)
async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const clientPublicKey = base64UrlDecode(p256dhKey);
  const clientAuth = base64UrlDecode(authSecret);

  // Generate server key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Export server public key
  const serverPublicKeyRaw = await crypto.subtle.exportKey('raw', serverKeyPair.publicKey);
  const serverPublicKey = new Uint8Array(serverPublicKeyRaw);

  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKey.buffer as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientKey },
      serverKeyPair.privateKey,
      256
    )
  );

  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Create info for HKDF
  const authInfo = new Uint8Array(new TextEncoder().encode('Content-Encoding: auth\0'));
  const p256dhInfo = new Uint8Array([
    ...new TextEncoder().encode('WebPush: info\0'),
    ...clientPublicKey,
    ...serverPublicKey,
  ]);

  // Derive PRK
  const prk = await hkdf(clientAuth, sharedSecret, authInfo, 32);

  // Derive content encryption key and nonce
  const cekInfo = new Uint8Array(new TextEncoder().encode('Content-Encoding: aes128gcm\0'));
  const nonceInfo = new Uint8Array(new TextEncoder().encode('Content-Encoding: nonce\0'));

  const keyMaterial = await hkdf(salt, prk, p256dhInfo, 32);
  const contentKey = await hkdf(salt, keyMaterial, cekInfo, 16);
  const nonce = await hkdf(salt, keyMaterial, nonceInfo, 12);

  // Prepare plaintext with padding
  const paddingLength = 0;
  const plaintext = new Uint8Array([
    ...new Uint8Array(paddingLength),
    2, // delimiter
    ...new TextEncoder().encode(payload),
  ]);

  // Encrypt with AES-GCM
  const key = await crypto.subtle.importKey(
    'raw',
    contentKey.buffer as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce.buffer as ArrayBuffer },
      key,
      plaintext.buffer as ArrayBuffer
    )
  );

  // Build aes128gcm encrypted content
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096, false);

  const encrypted = new Uint8Array([
    ...salt,
    ...recordSize,
    serverPublicKey.length,
    ...serverPublicKey,
    ...ciphertext,
  ]);

  return { encrypted, salt, serverPublicKey };
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

// Send Web Push notification with proper VAPID + encryption
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
    
    const payloadString = JSON.stringify(payload);
    
    // Parse endpoint to get audience
    const endpointUrl = new URL(endpoint);
    const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;
    
    // Try encrypted push first
    let requestBody: ArrayBuffer;
    let contentEncoding = 'aes128gcm';
    
    try {
      const { encrypted } = await encryptPayload(payloadString, p256dhKey, authKey);
      requestBody = encrypted.buffer as ArrayBuffer;
    } catch (encryptError) {
      console.log('[WebPush] Encryption failed, trying unencrypted:', encryptError);
      requestBody = new TextEncoder().encode(payloadString).buffer as ArrayBuffer;
      contentEncoding = '';
    }
    
    // Create VAPID authorization
    let authHeader = '';
    try {
      const jwt = await createVapidJwt(audience, 'mailto:noreply@woup.app', vapidPrivateKey, vapidPublicKey);
      authHeader = `vapid t=${jwt}, k=${vapidPublicKey}`;
    } catch (jwtError) {
      console.log('[WebPush] JWT creation failed:', jwtError);
    }
    
    const headers: Record<string, string> = {
      'TTL': '86400',
      'Urgency': 'high',
    };
    
    if (contentEncoding) {
      headers['Content-Type'] = 'application/octet-stream';
      headers['Content-Encoding'] = contentEncoding;
    }
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: requestBody,
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

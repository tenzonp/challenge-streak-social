import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, unknown>;
}

// Send FCM notification to native apps
async function sendFCMNotification(
  token: string,
  payload: NotificationPayload,
  fcmServerKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[FCM] Sending to token:', token.substring(0, 20) + '...');
    
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${fcmServerKey}`,
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/favicon.ico',
          sound: 'default',
        },
        data: payload.data || {},
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

// Simple JWT creation for VAPID
async function createVapidJwt(audience: string, subject: string, privateKeyBase64: string): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: subject,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${headerB64}.${payloadB64}`;

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

async function sendPushToUser(
  supabase: any,
  userId: string,
  payload: NotificationPayload,
  vapidPublicKey: string | undefined,
  vapidPrivateKey: string | undefined,
  fcmServerKey: string | undefined
): Promise<{ success: boolean; webSent: number; fcmSent: number; error?: string }> {
  try {
    let webSent = 0;
    let fcmSent = 0;

    // Send to FCM tokens (native apps) first
    if (fcmServerKey) {
      const { data: fcmTokens, error: fcmError } = await supabase
        .from('fcm_tokens')
        .select('*')
        .eq('user_id', userId);

      if (!fcmError && fcmTokens?.length) {
        console.log('[Streak] Found', fcmTokens.length, 'FCM tokens for user');
        
        for (const tokenRecord of fcmTokens) {
          const result = await sendFCMNotification(tokenRecord.token, payload, fcmServerKey);
          if (result.success) {
            fcmSent++;
          } else if (result.error === 'NotRegistered' || result.error === 'InvalidRegistration') {
            // Clean up invalid token
            console.log('[Streak] Removing invalid FCM token');
            await supabase.from('fcm_tokens').delete().eq('id', tokenRecord.id);
          }
        }
      }
    }

    // Send to web push subscriptions
    if (vapidPublicKey && vapidPrivateKey) {
      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (!subError && subscriptions?.length) {
        console.log('[Streak] Found', subscriptions.length, 'web push subscriptions');
        
        for (const sub of subscriptions) {
          try {
            const endpointUrl = new URL(sub.endpoint);
            const audience = endpointUrl.origin;
            const jwt = await createVapidJwt(audience, 'mailto:noreply@woup.app', vapidPrivateKey);

            const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));

            const response = await fetch(sub.endpoint, {
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

            if (response.ok) {
              webSent++;
            } else if (response.status === 410 || response.status === 404) {
              console.log('[Streak] Removing expired web subscription');
              await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
            }
          } catch (err) {
            console.error('[Streak] Error sending to web subscription:', err);
          }
        }
      }
    }

    const totalSent = webSent + fcmSent;
    
    // Log notification
    await supabase.from('notification_logs').insert({
      user_id: userId,
      notification_type: 'streak_reminder',
      title: payload.title,
      body: payload.body,
      status: totalSent > 0 ? 'sent' : 'failed',
    });

    console.log('[Streak] Sent', webSent, 'web +', fcmSent, 'FCM =', totalSent, 'total');
    return { success: totalSent > 0, webSent, fcmSent };
  } catch (error) {
    console.error('[Streak] Error sending push:', error);
    return { success: false, webSent: 0, fcmSent: 0, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');

    if (!vapidPublicKey && !fcmServerKey) {
      return new Response(
        JSON.stringify({ error: 'Neither VAPID keys nor FCM_SERVER_KEY configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'streak_reminders';

    console.log('[Streak] Running action:', action, 'FCM enabled:', !!fcmServerKey);

    if (action === 'streak_reminders') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, display_name, streak, longest_streak')
        .gt('streak', 0);

      if (profileError) {
        console.error('[Streak] Error fetching profiles:', profileError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch profiles' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Streak] Found', profiles?.length || 0, 'users with streaks');

      let sentCount = 0;
      let fcmTotal = 0;
      let webTotal = 0;
      
      for (const profile of profiles || []) {
        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('streak_reminders_enabled')
          .eq('user_id', profile.user_id)
          .single();

        if (prefs?.streak_reminders_enabled === false) {
          continue;
        }

        const { data: todayResponses } = await supabase
          .from('challenge_responses')
          .select('id')
          .eq('user_id', profile.user_id)
          .gte('created_at', today.toISOString())
          .limit(1);

        if (todayResponses?.length) {
          continue;
        }

        const payload: NotificationPayload = {
          title: `🔥 Don't lose your ${profile.streak}-day streak!`,
          body: `Complete a challenge to keep your streak alive! You're ${profile.longest_streak - profile.streak + 1} days from your best!`,
          data: { type: 'streak_reminder', streak: profile.streak },
        };

        const result = await sendPushToUser(supabase, profile.user_id, payload, vapidPublicKey, vapidPrivateKey, fcmServerKey);
        if (result.success) {
          sentCount++;
          fcmTotal += result.fcmSent;
          webTotal += result.webSent;
        }
      }

      console.log('[Streak] Sent', sentCount, 'streak reminders (', webTotal, 'web,', fcmTotal, 'FCM)');
      return new Response(
        JSON.stringify({ success: true, sent: sentCount, webSent: webTotal, fcmSent: fcmTotal }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'badge_reminders') {
      const badgeMilestones = [3, 7, 14, 30, 50, 100];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, streak');

      let sentCount = 0;
      let fcmTotal = 0;
      let webTotal = 0;
      
      for (const profile of profiles || []) {
        const nextMilestone = badgeMilestones.find(m => m > profile.streak);
        if (!nextMilestone || nextMilestone - profile.streak > 2) continue;

        const daysToGo = nextMilestone - profile.streak;
        const payload: NotificationPayload = {
          title: `🏆 Badge alert!`,
          body: `You're ${daysToGo} day${daysToGo > 1 ? 's' : ''} away from the ${nextMilestone}-day streak badge! Keep going!`,
          data: { type: 'badge_reminder', nextMilestone },
        };

        const result = await sendPushToUser(supabase, profile.user_id, payload, vapidPublicKey, vapidPrivateKey, fcmServerKey);
        if (result.success) {
          sentCount++;
          fcmTotal += result.fcmSent;
          webTotal += result.webSent;
        }
      }

      console.log('[Streak] Sent', sentCount, 'badge reminders');
      return new Response(
        JSON.stringify({ success: true, sent: sentCount, webSent: webTotal, fcmSent: fcmTotal }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'broadcast') {
      const title = body.title as string;
      const messageBody = body.body as string;
      const userIds = body.userIds as string[] | undefined;
      const broadcastNotificationType = (body.notificationType as string) || 'general';

      if (!title || !messageBody) {
        return new Response(
          JSON.stringify({ error: 'Title and body required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let targetUsers: string[] = userIds || [];

      if (!targetUsers?.length) {
        // Get all users with either push subscriptions or FCM tokens
        const { data: webSubs } = await supabase
          .from('push_subscriptions')
          .select('user_id');
        
        const { data: fcmTokens } = await supabase
          .from('fcm_tokens')
          .select('user_id');
        
        const allUserIds = [
          ...(webSubs?.map((s: any) => s.user_id) || []),
          ...(fcmTokens?.map((t: any) => t.user_id) || [])
        ];
        targetUsers = [...new Set(allUserIds)];
      }

      console.log('[Broadcast] Sending to', targetUsers.length, 'users');

      let sentCount = 0;
      let fcmTotal = 0;
      let webTotal = 0;
      
      for (const userId of targetUsers) {
        const payload: NotificationPayload = { title, body: messageBody, data: { type: broadcastNotificationType } };
        const result = await sendPushToUser(supabase, userId, payload, vapidPublicKey, vapidPrivateKey, fcmServerKey);
        if (result.success) {
          sentCount++;
          fcmTotal += result.fcmSent;
          webTotal += result.webSent;
        }
      }

      return new Response(
        JSON.stringify({ success: true, sent: sentCount, total: targetUsers.length, webSent: webTotal, fcmSent: fcmTotal }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'send_to_user') {
      const userId = body.userId as string;
      const title = body.title as string;
      const messageBody = body.body as string;
      const userNotificationType = (body.notificationType as string) || 'general';

      if (!userId || !title || !messageBody) {
        return new Response(
          JSON.stringify({ error: 'userId, title, and body required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const payload: NotificationPayload = { title, body: messageBody, data: { type: userNotificationType } };
      const result = await sendPushToUser(supabase, userId, payload, vapidPublicKey, vapidPrivateKey, fcmServerKey);

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Streak] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

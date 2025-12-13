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
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (subError || !subscriptions?.length) {
      return { success: false, error: 'No subscriptions' };
    }

    let successCount = 0;
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
          successCount++;
        } else if (response.status === 410 || response.status === 404) {
          // Clean up expired subscription
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      } catch (err) {
        console.error('[Streak] Error sending to subscription:', err);
      }
    }

    // Log notification
    await supabase.from('notification_logs').insert({
      user_id: userId,
      notification_type: 'streak_reminder',
      title: payload.title,
      body: payload.body,
      status: successCount > 0 ? 'sent' : 'failed',
    });

    return { success: successCount > 0 };
  } catch (error) {
    console.error('[Streak] Error sending push:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'streak_reminders';

    console.log('[Streak] Running action:', action);

    if (action === 'streak_reminders') {
      // Get users with active streaks who haven't posted today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all users with streaks
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

      // Check notification preferences
      let sentCount = 0;
      for (const profile of profiles || []) {
        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('streak_reminders_enabled')
          .eq('user_id', profile.user_id)
          .single();

        if (prefs?.streak_reminders_enabled === false) {
          continue;
        }

        // Check if user completed a challenge today
        const { data: todayResponses } = await supabase
          .from('challenge_responses')
          .select('id')
          .eq('user_id', profile.user_id)
          .gte('created_at', today.toISOString())
          .limit(1);

        if (todayResponses?.length) {
          continue; // Already posted today
        }

        // Send streak reminder
        const payload: NotificationPayload = {
          title: `🔥 Don't lose your ${profile.streak}-day streak!`,
          body: `Complete a challenge to keep your streak alive! You're ${profile.longest_streak - profile.streak + 1} days from your best!`,
          data: { type: 'streak_reminder', streak: profile.streak },
        };

        const result = await sendPushToUser(supabase, profile.user_id, payload, vapidPublicKey, vapidPrivateKey);
        if (result.success) sentCount++;
      }

      console.log('[Streak] Sent', sentCount, 'streak reminders');
      return new Response(
        JSON.stringify({ success: true, sent: sentCount }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'badge_reminders') {
      // Find users close to earning new badges
      const badgeMilestones = [3, 7, 14, 30, 50, 100];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, streak');

      let sentCount = 0;
      for (const profile of profiles || []) {
        // Check if user is 1-2 days away from a milestone
        const nextMilestone = badgeMilestones.find(m => m > profile.streak);
        if (!nextMilestone || nextMilestone - profile.streak > 2) continue;

        const daysToGo = nextMilestone - profile.streak;
        const payload: NotificationPayload = {
          title: `🏆 Badge alert!`,
          body: `You're ${daysToGo} day${daysToGo > 1 ? 's' : ''} away from the ${nextMilestone}-day streak badge! Keep going!`,
          data: { type: 'badge_reminder', nextMilestone },
        };

        const result = await sendPushToUser(supabase, profile.user_id, payload, vapidPublicKey, vapidPrivateKey);
        if (result.success) sentCount++;
      }

      console.log('[Streak] Sent', sentCount, 'badge reminders');
      return new Response(
        JSON.stringify({ success: true, sent: sentCount }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'broadcast') {
      // Send to all users or specific users
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
        // Get all users with push subscriptions
        const { data: subs } = await supabase
          .from('push_subscriptions')
          .select('user_id');
        
        targetUsers = [...new Set(subs?.map((s: any) => s.user_id) || [])];
      }

      console.log('[Broadcast] Sending to', targetUsers.length, 'users');

      let sentCount = 0;
      for (const userId of targetUsers) {
        const payload: NotificationPayload = { title, body: messageBody, data: { type: broadcastNotificationType } };
        const result = await sendPushToUser(supabase, userId, payload, vapidPublicKey, vapidPrivateKey);
        if (result.success) sentCount++;
      }

      return new Response(
        JSON.stringify({ success: true, sent: sentCount, total: targetUsers.length }),
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
      const result = await sendPushToUser(supabase, userId, payload, vapidPublicKey, vapidPrivateKey);

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
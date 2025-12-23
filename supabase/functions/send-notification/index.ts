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

// Send FCM notification using legacy API (works for both native and web)
async function sendFCMNotification(
  token: string,
  title: string,
  body: string,
  data: Record<string, any>,
  fcmServerKey: string,
  platform: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[FCM] Sending to ${platform} token:`, token.substring(0, 30) + '...');
    
    const payload: any = {
      to: token,
      priority: 'high',
      content_available: true,
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
    };

    // For web, use data-only message so service worker can show notification
    // For native, use notification payload
    if (platform === 'web') {
      // Data-only message for web - service worker handles display
      payload.data = {
        ...data,
        title,
        body,
        icon: '/favicon.ico',
        tag: `woup-${Date.now()}`,
      };
    } else {
      // Notification message for native apps
      payload.notification = {
        title,
        body,
        icon: '/favicon.ico',
        sound: 'default',
      };
      payload.data = {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      };
    }
    
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${fcmServerKey}`,
      },
      body: JSON.stringify(payload),
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

    if (!FCM_SERVER_KEY) {
      console.error('[SendNotification] FCM_SERVER_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'FCM not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sent = 0;
    let total = 0;

    // Log notification to database
    await supabase.from('notification_logs').insert({
      user_id,
      notification_type: type,
      title,
      body,
      status: 'pending',
    });

    // Get all FCM tokens (both native and web)
    const { data: fcmTokens, error: fcmError } = await supabase
      .from('fcm_tokens')
      .select('*')
      .eq('user_id', user_id);

    if (fcmError) {
      console.error('[SendNotification] FCM tokens query error:', fcmError);
    }

    if (!fcmError && fcmTokens?.length) {
      total = fcmTokens.length;
      console.log(`[SendNotification] Found ${fcmTokens.length} FCM tokens`);
      
      for (const tokenRecord of fcmTokens) {
        const result = await sendFCMNotification(
          tokenRecord.token,
          title,
          body,
          { type, url: '/', ...data },
          FCM_SERVER_KEY,
          tokenRecord.platform
        );
        
        if (result.success) {
          sent++;
        } else if (result.error === 'NotRegistered' || result.error === 'InvalidRegistration') {
          console.log('[SendNotification] Removing invalid FCM token');
          await supabase.from('fcm_tokens').delete().eq('id', tokenRecord.id);
        }
      }
    } else {
      console.log(`[SendNotification] No FCM tokens found for user ${user_id}`);
    }
    
    // Update notification log status
    await supabase.from('notification_logs')
      .update({ 
        status: sent > 0 ? 'sent' : (total > 0 ? 'failed' : 'no_subscriptions'),
        error_message: sent === 0 && total > 0 ? 'All delivery attempts failed' : null
      })
      .eq('user_id', user_id)
      .eq('notification_type', type)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (total === 0) {
      console.log(`[SendNotification] No subscriptions found for user ${user_id}`);
      return new Response(
        JSON.stringify({ success: false, reason: 'no_subscriptions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SendNotification] Sent ${sent}/${total} notifications`);

    return new Response(
      JSON.stringify({ success: sent > 0, sent, total }),
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

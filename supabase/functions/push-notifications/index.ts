import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userId, payload } = await req.json();
    console.log('[Push] Action:', action, 'UserId:', userId);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get Firebase VAPID public key for web push subscription
    if (action === 'get-vapid-key') {
      const vapidPublicKey = Deno.env.get('VITE_FIREBASE_VAPID_KEY');
      console.log('[Push] Firebase VAPID key requested, configured:', !!vapidPublicKey);
      
      if (!vapidPublicKey) {
        return new Response(
          JSON.stringify({ error: 'Firebase VAPID key not configured', publicKey: null }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ publicKey: vapidPublicKey }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save web push subscription (legacy - now using FCM tokens)
    if (action === 'save-subscription') {
      if (!userId || !payload?.endpoint) {
        return new Response(
          JSON.stringify({ error: 'Missing userId or subscription' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint: payload.endpoint,
          p256dh_key: payload.keys?.p256dh,
          auth_key: payload.keys?.auth,
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (error) {
        console.error('[Push] Failed to save subscription:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to save subscription' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Push] Subscription saved for user:', userId);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test configuration
    if (action === 'test') {
      const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');
      const vapidKey = Deno.env.get('VITE_FIREBASE_VAPID_KEY');

      return new Response(
        JSON.stringify({ 
          fcmConfigured: !!fcmServerKey,
          vapidConfigured: !!vapidKey,
          message: fcmServerKey ? 'FCM is configured' : 'FCM_SERVER_KEY is missing'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send test notification to current user
    if (action === 'send-test') {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'User ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user has FCM tokens
      const { data: tokens } = await supabase
        .from('fcm_tokens')
        .select('id, platform')
        .eq('user_id', userId);

      if (!tokens || tokens.length === 0) {
        return new Response(
          JSON.stringify({ success: false, reason: 'No notification tokens found. Please enable notifications first.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[Push] Found ${tokens.length} tokens for test:`, tokens.map(t => t.platform));

      // Invoke send-notification function
      const response = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            user_id: userId,
            type: 'message',
            title: 'Test Notification 🔔',
            body: 'Push notifications are working!',
            data: { test: true, url: '/' }
          })
        }
      );

      const result = await response.json();
      console.log('[Push] Test notification result:', result);

      return new Response(
        JSON.stringify({ success: result?.success ?? false, result }),
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

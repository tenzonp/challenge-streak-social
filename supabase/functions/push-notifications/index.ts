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
}

async function sendPushNotification(
  subscription: { endpoint: string; p256dh_key: string; auth_key: string },
  payload: PushPayload
) {
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error('VAPID keys not configured');
  }

  // For demo purposes, we're using web-push compatible approach
  // In production, you'd use a proper web-push library
  console.log('Would send push to:', subscription.endpoint);
  console.log('Payload:', payload);
  
  return { success: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userId, payload } = await req.json();

    if (action === 'get-vapid-key') {
      const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
      return new Response(
        JSON.stringify({ publicKey: vapidPublicKey }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'send') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      // Get user's push subscriptions
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (!subscriptions || subscriptions.length === 0) {
        return new Response(
          JSON.stringify({ message: 'No subscriptions found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Send to all subscriptions
      const results = await Promise.all(
        subscriptions.map(sub => sendPushNotification(sub, payload))
      );

      return new Response(
        JSON.stringify({ success: true, sent: results.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Push notification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

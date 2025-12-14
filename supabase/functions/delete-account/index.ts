import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create client with user's token to verify identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client to delete user
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Delete user's data first (cascading deletes should handle most, but be explicit)
    const userId = user.id;

    // Delete in order to avoid foreign key issues
    await adminClient.from('message_reactions').delete().eq('user_id', userId);
    await adminClient.from('messages').delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
    await adminClient.from('typing_status').delete().eq('user_id', userId);
    await adminClient.from('comment_likes').delete().eq('user_id', userId);
    await adminClient.from('comments').delete().eq('user_id', userId);
    await adminClient.from('reactions').delete().eq('user_id', userId);
    await adminClient.from('bookmarks').delete().eq('user_id', userId);
    await adminClient.from('post_reports').delete().eq('user_id', userId);
    await adminClient.from('viewed_posts').delete().eq('user_id', userId);
    await adminClient.from('challenge_responses').delete().eq('user_id', userId);
    await adminClient.from('challenges').delete().or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);
    await adminClient.from('friendships').delete().or(`user_id.eq.${userId},friend_id.eq.${userId}`);
    await adminClient.from('posts').delete().eq('user_id', userId);
    await adminClient.from('streak_rewards').delete().eq('user_id', userId);
    await adminClient.from('notification_preferences').delete().eq('user_id', userId);
    await adminClient.from('notification_reads').delete().eq('user_id', userId);
    await adminClient.from('notification_logs').delete().eq('user_id', userId);
    await adminClient.from('push_subscriptions').delete().eq('user_id', userId);
    await adminClient.from('privacy_settings').delete().eq('user_id', userId);
    await adminClient.from('spotify_tokens').delete().eq('user_id', userId);
    await adminClient.from('profiles').delete().eq('user_id', userId);

    // Finally delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Account deleted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Delete account error:', error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

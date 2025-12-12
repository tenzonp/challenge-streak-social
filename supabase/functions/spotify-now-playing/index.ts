import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID");
    const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { user_id } = await req.json();
    console.log("Fetching now playing for user:", user_id);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user's Spotify tokens
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("spotify_access_token, spotify_refresh_token, spotify_token_expires_at")
      .eq("user_id", user_id)
      .single();

    if (profileError || !profile?.spotify_access_token) {
      console.log("No Spotify connection for user");
      return new Response(
        JSON.stringify({ connected: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let accessToken = profile.spotify_access_token;

    // Check if token is expired
    if (new Date(profile.spotify_token_expires_at) < new Date()) {
      console.log("Token expired, refreshing...");
      
      const refreshResponse = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: profile.spotify_refresh_token,
        }),
      });

      if (!refreshResponse.ok) {
        console.error("Failed to refresh token");
        return new Response(
          JSON.stringify({ connected: false, error: "Token refresh failed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const newTokens = await refreshResponse.json();
      accessToken = newTokens.access_token;
      
      const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();
      
      await supabase
        .from("profiles")
        .update({
          spotify_access_token: accessToken,
          spotify_token_expires_at: expiresAt,
          ...(newTokens.refresh_token && { spotify_refresh_token: newTokens.refresh_token }),
        })
        .eq("user_id", user_id);

      console.log("Token refreshed successfully");
    }

    // Fetch currently playing
    const nowPlayingResponse = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (nowPlayingResponse.status === 204 || nowPlayingResponse.status === 404) {
      // Nothing playing
      console.log("Nothing currently playing");
      await supabase
        .from("profiles")
        .update({
          current_song: null,
          current_artist: null,
          song_url: null,
        })
        .eq("user_id", user_id);

      return new Response(
        JSON.stringify({ connected: true, playing: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!nowPlayingResponse.ok) {
      console.error("Failed to fetch now playing:", nowPlayingResponse.status);
      return new Response(
        JSON.stringify({ connected: true, playing: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nowPlaying = await nowPlayingResponse.json();
    
    if (nowPlaying.is_playing && nowPlaying.item) {
      const songName = nowPlaying.item.name;
      const artistName = nowPlaying.item.artists.map((a: any) => a.name).join(", ");
      const songUrl = nowPlaying.item.external_urls?.spotify;

      console.log("Currently playing:", songName, "by", artistName);

      // Update profile with current song
      await supabase
        .from("profiles")
        .update({
          current_song: songName,
          current_artist: artistName,
          song_url: songUrl,
        })
        .eq("user_id", user_id);

      return new Response(
        JSON.stringify({
          connected: true,
          playing: true,
          song: songName,
          artist: artistName,
          url: songUrl,
          album_art: nowPlaying.item.album?.images?.[0]?.url,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ connected: true, playing: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in spotify-now-playing:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
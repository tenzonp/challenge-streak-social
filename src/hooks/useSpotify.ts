import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Capacitor } from '@capacitor/core';

interface NowPlaying {
  playing: boolean;
  song?: string;
  artist?: string;
  url?: string;
  album_art?: string;
}

export const useSpotify = () => {
  const { user } = useAuth();
  const { profile, refetch: refetchProfile } = useProfile();
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [connecting, setConnecting] = useState(false);

  const getRedirectUri = () => {
    return `${window.location.origin}/`;
  };

  const connectSpotify = async () => {
    if (!user) return;
    
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('spotify-auth', {
        body: {
          action: 'get_auth_url',
          redirect_uri: getRedirectUri(),
          user_id: user.id,
        },
      });

      if (error) throw error;
      
      // Store user_id for callback
      localStorage.setItem('spotify_auth_user_id', user.id);
      
      // Use native browser for OAuth on native platforms
      if (Capacitor.isNativePlatform()) {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: data.auth_url });
      } else {
        window.location.href = data.auth_url;
      }
    } catch (error) {
      console.error('Failed to connect Spotify:', error);
    } finally {
      setConnecting(false);
    }
  };

  const handleCallback = useCallback(async (code: string) => {
    const userId = localStorage.getItem('spotify_auth_user_id');
    if (!userId) return;

    try {
      const { error } = await supabase.functions.invoke('spotify-auth', {
        body: {
          action: 'exchange_code',
          code,
          redirect_uri: getRedirectUri(),
          user_id: userId,
        },
      });

      if (error) throw error;
      
      localStorage.removeItem('spotify_auth_user_id');
      await refetchProfile();
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      console.error('Failed to complete Spotify auth:', error);
    }
  }, [refetchProfile]);

  const disconnectSpotify = async () => {
    if (!user) return;

    try {
      const { error } = await supabase.functions.invoke('spotify-auth', {
        body: {
          action: 'disconnect',
          user_id: user.id,
        },
      });

      if (error) throw error;
      
      setNowPlaying(null);
      await refetchProfile();
    } catch (error) {
      console.error('Failed to disconnect Spotify:', error);
    }
  };

  const fetchNowPlaying = useCallback(async () => {
    if (!user || !profile?.spotify_connected) return;

    try {
      const { data, error } = await supabase.functions.invoke('spotify-now-playing', {
        body: { user_id: user.id },
      });

      if (error) throw error;
      
      if (data.connected) {
        setNowPlaying({
          playing: data.playing,
          song: data.song,
          artist: data.artist,
          url: data.url,
          album_art: data.album_art,
        });
        
        // Refetch profile to update current_song
        if (data.playing) {
          await refetchProfile();
        }
      }
    } catch (error) {
      console.error('Failed to fetch now playing:', error);
    }
  }, [user, profile?.spotify_connected, refetchProfile]);

  // Check for OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state) {
      handleCallback(code);
    }
  }, [handleCallback]);

  // Poll for now playing
  useEffect(() => {
    if (!profile?.spotify_connected) return;

    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [profile?.spotify_connected, fetchNowPlaying]);

  return {
    isConnected: profile?.spotify_connected || false,
    nowPlaying,
    connecting,
    connectSpotify,
    disconnectSpotify,
    fetchNowPlaying,
  };
};
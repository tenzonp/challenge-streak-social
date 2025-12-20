import { Music, ExternalLink, Loader2, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSpotify } from '@/hooks/useSpotify';
import { Profile } from '@/hooks/useProfile';
import { openBrowser } from '@/utils/nativeDownload';

interface SpotifyConnectProps {
  profile: Profile;
}

const SpotifyConnect = ({ profile }: SpotifyConnectProps) => {
  const { isConnected, nowPlaying, connecting, connectSpotify, disconnectSpotify, fetchNowPlaying } = useSpotify();

  if (!isConnected) {
    return (
      <button
        onClick={connectSpotify}
        disabled={connecting}
        className="w-full rounded-2xl p-4 flex items-center gap-3 border-2 border-dashed border-border hover:border-primary/50 transition-colors text-left"
      >
        <div className="w-12 h-12 rounded-xl bg-[#1DB954] flex items-center justify-center shrink-0">
          {connecting ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Music className="w-6 h-6 text-white" />
          )}
        </div>
        <div className="flex-1">
          <p className="font-semibold">connect Spotify</p>
          <p className="text-sm text-muted-foreground">show what you're listening to</p>
        </div>
      </button>
    );
  }

  return (
    <div 
      className="rounded-2xl p-4 flex items-center gap-3"
      style={{ 
        background: `linear-gradient(135deg, ${profile.color_primary || '#4ade80'}15, ${profile.color_secondary || '#f472b6'}15)`,
        borderLeft: `3px solid #1DB954`
      }}
    >
      {nowPlaying?.playing ? (
        <>
          <div 
            className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 relative overflow-hidden"
            style={{ background: '#1DB954' }}
          >
            {nowPlaying.album_art ? (
              <img src={nowPlaying.album_art} className="w-full h-full object-cover" />
            ) : (
              <Music className="w-7 h-7 text-white" />
            )}
            <div className="absolute inset-0 flex items-end justify-center pb-1">
              <div className="flex gap-0.5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-1 bg-white rounded-full animate-pulse"
                    style={{ 
                      height: `${8 + Math.random() * 8}px`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#1DB954] font-medium">now playing</p>
            <p className="font-bold truncate">{nowPlaying.song}</p>
            <p className="text-sm text-muted-foreground truncate">{nowPlaying.artist}</p>
          </div>
          {nowPlaying.url && (
            <button 
              onClick={() => openBrowser(nowPlaying.url!)}
              className="p-2 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </>
      ) : (
        <>
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: '#1DB954' }}
          >
            <Music className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Spotify connected</p>
            <p className="text-sm text-muted-foreground">not playing anything right now</p>
          </div>
        </>
      )}
      
      <Button 
        variant="ghost" 
        size="icon" 
        className="shrink-0 text-muted-foreground hover:text-destructive"
        onClick={disconnectSpotify}
      >
        <Unlink className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default SpotifyConnect;
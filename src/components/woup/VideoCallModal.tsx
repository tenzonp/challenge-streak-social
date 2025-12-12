import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Profile } from '@/hooks/useProfile';
import { useVideoCall } from '@/hooks/useVideoCall';

interface VideoCallModalProps {
  friend: Profile;
  onClose: () => void;
}

const VideoCallModal = ({ friend, onClose }: VideoCallModalProps) => {
  const {
    isInCall,
    isCalling,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    startCall,
    endCall,
    toggleMute,
    toggleVideo
  } = useVideoCall(onClose);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Auto-start call
    startCall();
  }, []);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleEndCall = () => {
    endCall();
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background flex flex-col"
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-background to-transparent safe-top">
          <div className="flex items-center justify-between">
            <button onClick={handleEndCall} className="p-2 rounded-full glass">
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center">
              <p className="font-semibold">{friend.display_name}</p>
              <p className="text-xs text-muted-foreground">
                {isCalling ? 'Calling...' : isInCall ? 'Connected' : 'Video Call'}
              </p>
            </div>
            
            <div className="w-9" />
          </div>
        </div>

        {/* Video area */}
        <div className="flex-1 relative bg-muted">
          {/* Remote video (full screen) or placeholder */}
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <img
                src={friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.user_id}`}
                className="w-32 h-32 rounded-3xl mb-4"
                style={{ 
                  borderColor: friend.color_primary || 'transparent',
                  borderWidth: friend.color_primary ? 3 : 0
                }}
              />
              
              {isCalling && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Calling {friend.display_name}...</span>
                </div>
              )}
              
              {isInCall && !remoteStream && (
                <p className="text-muted-foreground">Waiting for video...</p>
              )}
            </div>
          )}

          {/* Local video (picture-in-picture) */}
          <div className="absolute bottom-24 right-4 w-28 h-40 rounded-2xl overflow-hidden border-2 border-border shadow-xl">
            {localStream && !isVideoOff ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <VideoOff className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background to-transparent safe-bottom">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant={isMuted ? 'destructive' : 'outline'}
              size="lg"
              className="w-14 h-14 rounded-full"
              onClick={toggleMute}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </Button>
            
            <Button
              variant="destructive"
              size="lg"
              className="w-16 h-16 rounded-full"
              onClick={handleEndCall}
            >
              <PhoneOff className="w-7 h-7" />
            </Button>
            
            <Button
              variant={isVideoOff ? 'destructive' : 'outline'}
              size="lg"
              className="w-14 h-14 rounded-full"
              onClick={toggleVideo}
            >
              {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VideoCallModal;

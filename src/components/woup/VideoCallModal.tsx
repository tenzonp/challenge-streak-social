import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Profile } from '@/hooks/useProfile';
import { useVideoCall } from '@/hooks/useVideoCall';
import { useProfile as useUserProfile } from '@/hooks/useProfile';

interface VideoCallModalProps {
  friend: Profile;
  onClose: () => void;
}

const VideoCallModal = ({ friend, onClose }: VideoCallModalProps) => {
  const { profile } = useUserProfile();
  const {
    isInCall,
    isCalling,
    isReceivingCall,
    incomingCallData,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo
  } = useVideoCall(friend.user_id, onClose);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [callStarted, setCallStarted] = useState(false);

  useEffect(() => {
    // Auto-start call when modal opens (only once)
    if (!callStarted && !isReceivingCall) {
      setCallStarted(true);
      startCall(profile?.display_name, profile?.avatar_url || undefined);
    }
  }, [callStarted, isReceivingCall, startCall, profile]);

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
  };

  const handleRejectCall = () => {
    rejectCall();
    onClose();
  };

  const handleAcceptCall = () => {
    acceptCall();
  };

  // Show incoming call UI
  if (isReceivingCall && incomingCallData) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-lg flex flex-col items-center justify-center"
        >
          {/* Caller info */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center mb-12"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="relative inline-block mb-6"
            >
              <img
                src={friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.user_id}`}
                className="w-32 h-32 rounded-3xl"
                style={{ 
                  borderColor: friend.color_primary || 'hsl(var(--primary))',
                  borderWidth: 4
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-3xl"
                style={{ borderColor: friend.color_primary || 'hsl(var(--primary))', borderWidth: 4 }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            </motion.div>
            
            <h2 className="text-2xl font-bold mb-2">{friend.display_name}</h2>
            <p className="text-muted-foreground flex items-center justify-center gap-2">
              <Phone className="w-4 h-4 animate-pulse" />
              Incoming video call...
            </p>
          </motion.div>

          {/* Accept/Reject buttons */}
          <div className="flex items-center gap-8">
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Button
                variant="destructive"
                size="lg"
                className="w-16 h-16 rounded-full"
                onClick={handleRejectCall}
                type="button"
              >
                <PhoneOff className="w-7 h-7" />
              </Button>
              <p className="text-center text-sm text-muted-foreground mt-2">Decline</p>
            </motion.div>
            
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Button
                size="lg"
                className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600"
                onClick={handleAcceptCall}
                type="button"
              >
                <Phone className="w-7 h-7" />
              </Button>
              <p className="text-center text-sm text-muted-foreground mt-2">Accept</p>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

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
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleEndCall} 
              className="rounded-full glass"
              type="button"
            >
              <X className="w-5 h-5" />
            </Button>
            
            <div className="text-center">
              <p className="font-semibold">{friend.display_name}</p>
              <p className="text-xs text-muted-foreground">
                {isCalling ? 'Calling...' : isInCall ? 'Connected' : 'Connecting...'}
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
              
              {!isCalling && !isInCall && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Connecting...</span>
                </div>
              )}
              
              {isInCall && !remoteStream && (
                <p className="text-muted-foreground">Waiting for video...</p>
              )}
            </div>
          )}

          {/* Local video (picture-in-picture) */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute bottom-24 right-4 w-28 h-40 rounded-2xl overflow-hidden border-2 border-border shadow-xl"
          >
            {localStream && !isVideoOff ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <VideoOff className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </motion.div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background to-transparent safe-bottom">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant={isMuted ? 'destructive' : 'outline'}
              size="lg"
              className="w-14 h-14 rounded-full"
              onClick={toggleMute}
              type="button"
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </Button>
            
            <Button
              variant="destructive"
              size="lg"
              className="w-16 h-16 rounded-full"
              onClick={handleEndCall}
              type="button"
            >
              <PhoneOff className="w-7 h-7" />
            </Button>
            
            <Button
              variant={isVideoOff ? 'destructive' : 'outline'}
              size="lg"
              className="w-14 h-14 rounded-full"
              onClick={toggleVideo}
              type="button"
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

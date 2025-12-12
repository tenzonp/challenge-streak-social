import { useState, useRef, useCallback, useEffect } from 'react';

interface PeerConnection {
  pc: RTCPeerConnection;
  remoteStream: MediaStream | null;
}

export const useVideoCall = (onCallEnded?: () => void) => {
  const [isInCall, setIsInCall] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const cleanup = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setIsInCall(false);
    setIsCalling(false);
    onCallEnded?.();
  }, [localStream, onCallEnded]);

  const initializeCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: true
      });
      
      setLocalStream(stream);
      
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          cleanup();
        }
      };

      pcRef.current = pc;
      return pc;
    } catch (error) {
      console.error('Failed to initialize call:', error);
      throw error;
    }
  }, [cleanup]);

  const startCall = useCallback(async () => {
    setIsCalling(true);
    
    try {
      const pc = await initializeCall();
      
      // For demo purposes, we'll simulate a connection
      // In production, you'd use signaling server to exchange offers/answers
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      setIsInCall(true);
      setIsCalling(false);
      
      return offer;
    } catch (error) {
      setIsCalling(false);
      throw error;
    }
  }, [initializeCall]);

  const answerCall = useCallback(async (offer: RTCSessionDescriptionInit) => {
    try {
      const pc = await initializeCall();
      
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      setIsInCall(true);
      
      return answer;
    } catch (error) {
      cleanup();
      throw error;
    }
  }, [initializeCall, cleanup]);

  const endCall = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, [localStream]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    isInCall,
    isCalling,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    localVideoRef,
    remoteVideoRef,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleVideo
  };
};

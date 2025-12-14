import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-ended' | 'call-rejected';
  data: any;
  from: string;
  to: string;
  callerName?: string;
  callerAvatar?: string;
}

export interface IncomingCallData {
  from: string;
  callerName: string;
  callerAvatar: string;
  offer: RTCSessionDescriptionInit;
}

export const useVideoCall = (partnerId: string, onCallEnded?: () => void) => {
  const { user } = useAuth();
  const [isInCall, setIsInCall] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState<IncomingCallData | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);

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
    setIsReceivingCall(false);
    setIncomingCallData(null);
    pendingOfferRef.current = null;
    iceCandidatesQueue.current = [];
  }, [localStream]);

  const sendSignal = useCallback(async (type: SignalingMessage['type'], data: any, extras?: Partial<SignalingMessage>) => {
    if (!user || !channelRef.current) return;
    
    await channelRef.current.send({
      type: 'broadcast',
      event: 'signal',
      payload: {
        type,
        data,
        from: user.id,
        to: partnerId,
        ...extras
      }
    });
  }, [user, partnerId]);

  const createPeerConnection = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: true
    });
    
    setLocalStream(stream);
    
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });
    
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      console.log('Received remote track:', event.streams[0]);
      setRemoteStream(event.streams[0]);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate');
        sendSignal('ice-candidate', event.candidate.toJSON());
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected') {
        setIsInCall(true);
        setIsCalling(false);
      }
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        cleanup();
        onCallEnded?.();
      }
    };

    pcRef.current = pc;
    return pc;
  }, [cleanup, sendSignal, onCallEnded]);

  const startCall = useCallback(async (callerName?: string, callerAvatar?: string) => {
    if (!user) return;
    
    setIsCalling(true);
    
    try {
      const pc = await createPeerConnection();
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      console.log('Sending offer');
      await sendSignal('offer', offer, { callerName, callerAvatar });
      
    } catch (error) {
      console.error('Failed to start call:', error);
      setIsCalling(false);
      cleanup();
    }
  }, [user, createPeerConnection, sendSignal, cleanup]);

  const acceptCall = useCallback(async () => {
    if (!user || !pendingOfferRef.current) return;
    
    try {
      setIsReceivingCall(false);
      const pc = await createPeerConnection();
      
      await pc.setRemoteDescription(new RTCSessionDescription(pendingOfferRef.current));
      
      // Process queued ICE candidates
      for (const candidate of iceCandidatesQueue.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      iceCandidatesQueue.current = [];
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      console.log('Sending answer');
      await sendSignal('answer', answer);
      
      setIsInCall(true);
      setIncomingCallData(null);
      pendingOfferRef.current = null;
      
    } catch (error) {
      console.error('Failed to answer call:', error);
      cleanup();
    }
  }, [user, createPeerConnection, sendSignal, cleanup]);

  const rejectCall = useCallback(async () => {
    await sendSignal('call-rejected', {});
    setIsReceivingCall(false);
    setIncomingCallData(null);
    pendingOfferRef.current = null;
    iceCandidatesQueue.current = [];
  }, [sendSignal]);

  const endCall = useCallback(() => {
    sendSignal('call-ended', {});
    cleanup();
    onCallEnded?.();
  }, [sendSignal, cleanup, onCallEnded]);

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

  // Set up signaling channel
  useEffect(() => {
    if (!user || !partnerId) return;

    const channelId = [user.id, partnerId].sort().join('-');
    const channel = supabase.channel(`video-call-${channelId}`);

    channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
      const signal = payload as SignalingMessage;
      
      // Only process messages meant for us
      if (signal.to !== user.id) return;
      
      console.log('Received signal:', signal.type);

      switch (signal.type) {
        case 'offer':
          // Store offer and show incoming call UI
          pendingOfferRef.current = signal.data;
          iceCandidatesQueue.current = [];
          setIsReceivingCall(true);
          setIncomingCallData({
            from: signal.from,
            callerName: signal.callerName || 'Unknown',
            callerAvatar: signal.callerAvatar || '',
            offer: signal.data
          });
          break;
          
        case 'answer':
          if (pcRef.current) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.data));
            setIsInCall(true);
            setIsCalling(false);
          }
          break;
          
        case 'ice-candidate':
          if (pcRef.current && pcRef.current.remoteDescription) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(signal.data));
          } else {
            // Queue candidate if remote description not set yet
            iceCandidatesQueue.current.push(signal.data);
          }
          break;
          
        case 'call-ended':
          cleanup();
          onCallEnded?.();
          break;

        case 'call-rejected':
          cleanup();
          onCallEnded?.();
          break;
      }
    });

    channel.subscribe((status) => {
      console.log('Video call channel status:', status);
    });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      cleanup();
    };
  }, [user, partnerId, cleanup, onCallEnded]);

  return {
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
  };
};

// Global hook for listening to incoming calls from any user
export const useIncomingCalls = (onIncomingCall: (data: IncomingCallData) => void) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`incoming-calls-${user.id}`);

    channel.on('broadcast', { event: 'incoming-call' }, ({ payload }) => {
      if (payload.to === user.id) {
        onIncomingCall(payload as IncomingCallData);
      }
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, onIncomingCall]);
};

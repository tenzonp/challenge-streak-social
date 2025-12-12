import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useCamera = () => {
  const { user } = useAuth();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const startCamera = useCallback(async (mode: 'user' | 'environment' = 'user') => {
    try {
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1080 },
          height: { ideal: 1440 },
        },
        audio: false,
      });

      setStream(newStream);
      setFacingMode(mode);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }

      return newStream;
    } catch (error) {
      console.error('Error accessing camera:', error);
      throw error;
    }
  }, [stream]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const switchCamera = useCallback(async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    await startCamera(newMode);
  }, [facingMode, startCamera]);

  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Mirror for front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);
    
    return canvas.toDataURL('image/jpeg', 0.8);
  }, [facingMode]);

  const uploadPhoto = async (dataUrl: string, photoType: 'front' | 'back'): Promise<string | null> => {
    if (!user) return null;

    try {
      // Convert base64 to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      const fileName = `${user.id}/${Date.now()}_${photoType}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('challenge-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('challenge-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  return {
    stream,
    facingMode,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
    uploadPhoto,
  };
};

import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
import { compressImage, dataUrlToBlob } from '@/utils/imageCompression';

export const useCamera = () => {
  const { user } = useAuth();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isNative = Capacitor.isNativePlatform();

  const startCamera = useCallback(async (mode: 'user' | 'environment' = 'user') => {
    if (isNative) {
      // For native, we don't need to start a stream - we'll use Camera.getPhoto
      setFacingMode(mode);
      setStream({} as MediaStream); // Dummy to indicate camera is "ready"
      return {} as MediaStream;
    }

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
  }, [stream, isNative]);

  const stopCamera = useCallback(() => {
    if (stream && !isNative) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setCapturedPhoto(null);
  }, [stream, isNative]);

  const switchCamera = useCallback(async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    if (!isNative) {
      await startCamera(newMode);
    }
  }, [facingMode, startCamera, isNative]);

  const capturePhoto = useCallback((): string | null => {
    if (isNative) {
      // For native, return the previously captured photo
      return capturedPhoto;
    }

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
  }, [facingMode, isNative, capturedPhoto]);

  // Native camera capture using Capacitor
  const captureNativePhoto = useCallback(async (): Promise<string | null> => {
    if (!isNative) return null;

    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        direction: facingMode === 'user' ? CameraDirection.Front : CameraDirection.Rear,
        correctOrientation: true,
      });

      if (photo.dataUrl) {
        setCapturedPhoto(photo.dataUrl);
        return photo.dataUrl;
      }
      return null;
    } catch (error) {
      console.error('Native camera error:', error);
      throw error;
    }
  }, [isNative, facingMode]);

  const uploadPhoto = async (dataUrl: string, photoType: 'front' | 'back'): Promise<string | null> => {
    if (!user) return null;

    try {
      // Compress image before upload (max 1200x1600, 80% quality)
      const compressedDataUrl = await compressImage(dataUrl, {
        maxWidth: 1200,
        maxHeight: 1600,
        quality: 0.8,
      });

      // Convert to blob
      const blob = await dataUrlToBlob(compressedDataUrl);

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
    captureNativePhoto,
    uploadPhoto,
    isNative,
  };
};

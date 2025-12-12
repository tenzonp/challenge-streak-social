import { useState, useEffect } from 'react';
import { X, Camera, RotateCcw, Check, Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCamera } from '@/hooks/useCamera';
import { useToast } from '@/hooks/use-toast';
import { Challenge } from '@/hooks/useChallenges';
import { Profile } from '@/hooks/useProfile';

interface CameraModalProps {
  challenge: {
    id: string;
    challenge_text: string;
    from_user?: Profile;
  };
  onClose: () => void;
  onSubmit: (challengeId: string, frontUrl: string, backUrl: string, caption?: string) => Promise<void>;
}

const CameraModal = ({ challenge, onClose, onSubmit }: CameraModalProps) => {
  const { toast } = useToast();
  const {
    stream,
    facingMode,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
    uploadPhoto,
  } = useCamera();

  const [step, setStep] = useState<'camera-front' | 'camera-back' | 'preview'>('camera-front');
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [backPhoto, setBackPhoto] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    initCamera();
    return () => stopCamera();
  }, []);

  const initCamera = async () => {
    try {
      setCameraError(null);
      await startCamera('user');
    } catch (error) {
      setCameraError('Could not access camera. Please allow camera permissions.');
    }
  };

  const handleCapture = async () => {
    const photo = capturePhoto();
    if (!photo) {
      toast({
        title: "capture failed",
        description: "please try again",
        variant: "destructive",
      });
      return;
    }

    if (step === 'camera-front') {
      setFrontPhoto(photo);
      // Switch to back camera
      try {
        await startCamera('environment');
        setStep('camera-back');
      } catch {
        // If back camera fails, use front camera again
        await startCamera('user');
        setStep('camera-back');
      }
    } else if (step === 'camera-back') {
      setBackPhoto(photo);
      stopCamera();
      setStep('preview');
    }
  };

  const handleRetake = async () => {
    setFrontPhoto(null);
    setBackPhoto(null);
    setStep('camera-front');
    await startCamera('user');
  };

  const handleSubmit = async () => {
    if (!frontPhoto || !backPhoto) return;

    setSubmitting(true);
    try {
      // Upload photos
      const frontUrl = await uploadPhoto(frontPhoto, 'front');
      const backUrl = await uploadPhoto(backPhoto, 'back');

      if (!frontUrl || !backUrl) {
        throw new Error('Failed to upload photos');
      }

      await onSubmit(challenge.id, frontUrl, backUrl, caption || undefined);
      
      toast({
        title: "posted! 🎉",
        description: "streak +1! keep it going 🔥",
      });
      onClose();
    } catch (error) {
      toast({
        title: "upload failed",
        description: "please try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Hidden canvas for capturing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between p-4 glass">
        <Button variant="ghost" size="icon" onClick={onClose} disabled={submitting}>
          <X className="w-6 h-6" />
        </Button>
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            challenge from {challenge.from_user?.display_name || 'friend'}
          </p>
          <p className="font-semibold">{challenge.challenge_text}</p>
        </div>
        
        <div className="w-10" />
      </div>
      
      {/* Camera/Preview Area */}
      <div className="flex-1 relative overflow-hidden">
        {cameraError ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <Camera className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">{cameraError}</p>
            <Button variant="outline" onClick={initCamera}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : step === 'preview' ? (
          <div className="h-full flex flex-col items-center justify-center p-6">
            <div className="relative w-full max-w-sm aspect-[4/5] rounded-3xl overflow-hidden mb-4 shadow-xl">
              <img 
                src={backPhoto!} 
                alt="Back camera"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 w-20 h-28 rounded-xl overflow-hidden border-2 border-card shadow-lg">
                <img 
                  src={frontPhoto!} 
                  alt="Front camera"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="add a caption... ✨"
              className="w-full max-w-sm p-4 rounded-2xl bg-muted/50 border border-border focus:border-primary outline-none text-center"
              maxLength={50}
            />
          </div>
        ) : (
          <div className="h-full relative">
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              muted
              className="w-full h-full object-cover"
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />
            
            {/* Step indicator */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full glass">
              <p className="text-sm font-medium">
                {step === 'camera-front' ? '1/2 selfie 🤳' : '2/2 flip it 📷'}
              </p>
            </div>

            {/* Camera switch button */}
            <Button 
              variant="glass" 
              size="icon"
              onClick={switchCamera}
              className="absolute top-4 right-4"
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>
      
      {/* Bottom Controls */}
      <div className="p-6 flex items-center justify-center gap-6 glass">
        {step === 'preview' ? (
          <>
            <Button 
              variant="outline" 
              size="lg"
              onClick={handleRetake}
              disabled={submitting}
              className="gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              retake
            </Button>
            
            <Button 
              variant="neon" 
              size="lg"
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-2 px-8"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  post it!
                </>
              )}
            </Button>
          </>
        ) : (
          <button
            onClick={handleCapture}
            disabled={!stream}
            className="w-20 h-20 rounded-full border-4 border-foreground flex items-center justify-center hover:scale-105 transition-transform active:scale-95 disabled:opacity-50"
          >
            <div className={`w-16 h-16 rounded-full ${step === 'camera-front' ? 'gradient-secondary' : 'gradient-primary'}`} />
          </button>
        )}
      </div>
    </div>
  );
};

export default CameraModal;

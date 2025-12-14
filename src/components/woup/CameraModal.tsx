import { useState, useEffect } from 'react';
import { X, Camera, RotateCcw, Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCamera } from '@/hooks/useCamera';
import { useToast } from '@/hooks/use-toast';
import { Profile } from '@/hooks/useProfile';
import ChallengeCompleteAnimation from './ChallengeCompleteAnimation';

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
    captureNativePhoto,
    uploadPhoto,
    isNative,
  } = useCamera();

  const [step, setStep] = useState<'camera-front' | 'camera-back' | 'preview' | 'complete'>('camera-front');
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [backPhoto, setBackPhoto] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showComplete, setShowComplete] = useState(false);

  useEffect(() => {
    if (!isNative) {
      initCamera();
    }
    return () => stopCamera();
  }, [isNative]);

  const initCamera = async () => {
    try {
      setCameraError(null);
      await startCamera('user');
    } catch (error) {
      setCameraError('Could not access camera. Please allow camera permissions.');
    }
  };

  const handleCapture = async () => {
    let photo: string | null = null;

    if (isNative) {
      // Use native camera
      try {
        photo = await captureNativePhoto();
      } catch (error) {
        toast({
          title: "Camera error",
          description: "Please allow camera permissions in settings",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Use web camera
      photo = capturePhoto();
    }

    if (!photo) {
      toast({
        title: "Capture failed",
        description: "Please try again",
        variant: "destructive",
      });
      return;
    }

    if (step === 'camera-front') {
      setFrontPhoto(photo);
      setStep('camera-back');
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
    if (!isNative) {
      await startCamera('user');
    }
  };

  const handleSubmit = async () => {
    if (!frontPhoto || !backPhoto) return;

    setSubmitting(true);
    try {
      const frontUrl = await uploadPhoto(frontPhoto, 'front');
      const backUrl = await uploadPhoto(backPhoto, 'back');

      if (!frontUrl || !backUrl) {
        throw new Error('Failed to upload photos');
      }

      await onSubmit(challenge.id, frontUrl, backUrl, caption || undefined);
      setShowComplete(true);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  const handleAnimationComplete = () => {
    setShowComplete(false);
    onClose();
  };

  if (showComplete) {
    return (
      <ChallengeCompleteAnimation 
        challengeText={challenge.challenge_text}
        fromUser={challenge.from_user?.display_name || 'Friend'}
        onComplete={handleAnimationComplete}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col safe-area-inset">
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-background/80 backdrop-blur-md border-b border-border/30 safe-top">
        <Button variant="ghost" size="icon" onClick={onClose} disabled={submitting} className="rounded-full">
          <X className="w-6 h-6" />
        </Button>
        
        <div className="text-center flex-1 px-4">
          <p className="text-xs text-muted-foreground truncate">
            from {challenge.from_user?.display_name || 'friend'}
          </p>
          <p className="font-medium text-sm truncate">{challenge.challenge_text}</p>
        </div>
        
        <div className="w-10" />
      </div>
      
      {/* Camera/Preview Area */}
      <div className="flex-1 relative overflow-hidden">
        {cameraError && !isNative ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <Camera className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">{cameraError}</p>
            <Button variant="outline" onClick={initCamera}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : step === 'preview' ? (
          <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="relative w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden mb-4 shadow-xl">
              <img 
                src={backPhoto!} 
                alt="Back camera"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 w-16 h-24 rounded-xl overflow-hidden border-2 border-background shadow-lg">
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
              placeholder="Add a caption..."
              className="w-full max-w-sm p-3 rounded-xl bg-muted/50 border border-border focus:border-primary outline-none text-center text-sm"
              maxLength={50}
            />
          </div>
        ) : isNative ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center gap-6">
            {frontPhoto && step === 'camera-back' && (
              <div className="w-24 h-32 rounded-xl overflow-hidden border-2 border-primary shadow-lg">
                <img src={frontPhoto} alt="Selfie" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="bg-muted/30 rounded-2xl p-6">
              <Camera className="w-16 h-16 text-primary mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">
                {step === 'camera-front' ? 'Take your selfie' : 'Now flip & capture'}
              </p>
              <p className="text-sm text-muted-foreground">
                {step === 'camera-front' ? 'Step 1 of 2' : 'Step 2 of 2'}
              </p>
            </div>
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
            
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-background/60 backdrop-blur-md">
              <p className="text-sm font-medium">
                {step === 'camera-front' ? '1/2 Selfie' : '2/2 Flip it'}
              </p>
            </div>

            <Button 
              variant="ghost" 
              size="icon"
              onClick={switchCamera}
              className="absolute top-4 right-4 bg-background/40 backdrop-blur-sm rounded-full"
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>
      
      {/* Bottom Controls */}
      <div className="p-4 pb-8 flex items-center justify-center gap-4 bg-background/80 backdrop-blur-md border-t border-border/30 safe-bottom">
        {step === 'preview' ? (
          <>
            <Button 
              variant="outline" 
              size="lg"
              onClick={handleRetake}
              disabled={submitting}
              className="gap-2 rounded-xl"
            >
              <RotateCcw className="w-4 h-4" />
              Retake
            </Button>
            
            <Button 
              variant="neon" 
              size="lg"
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-2 px-6 rounded-xl"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Post
                </>
              )}
            </Button>
          </>
        ) : (
          <button
            onClick={handleCapture}
            disabled={!isNative && !stream}
            className="w-18 h-18 rounded-full border-4 border-foreground/80 flex items-center justify-center hover:scale-105 transition-transform active:scale-95 disabled:opacity-50"
          >
            <div className={`w-14 h-14 rounded-full ${step === 'camera-front' ? 'bg-primary' : 'bg-secondary'}`} />
          </button>
        )}
      </div>
    </div>
  );
};

export default CameraModal;

import { useState } from 'react';
import { X, Camera, RotateCcw, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Challenge } from '@/types/woup';
import { useToast } from '@/hooks/use-toast';

interface CameraModalProps {
  challenge: Challenge;
  onClose: () => void;
  onSubmit: (challengeId: string) => void;
}

const CameraModal = ({ challenge, onClose, onSubmit }: CameraModalProps) => {
  const [step, setStep] = useState<'front' | 'back' | 'preview'>('front');
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [backPhoto, setBackPhoto] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const { toast } = useToast();

  // Simulate taking a photo
  const takePhoto = () => {
    const demoPhotos = {
      front: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop',
      back: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=500&fit=crop',
    };
    
    if (step === 'front') {
      setFrontPhoto(demoPhotos.front);
      setStep('back');
    } else if (step === 'back') {
      setBackPhoto(demoPhotos.back);
      setStep('preview');
    }
  };

  const handleSubmit = () => {
    onSubmit(challenge.id);
    toast({
      title: "posted! 🎉",
      description: "streak +1! keep it going 🔥",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-6 h-6" />
        </Button>
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground">challenge from {challenge.fromUser.displayName}</p>
          <p className="font-semibold">{challenge.challengeText}</p>
        </div>
        
        <div className="w-10" />
      </div>
      
      {/* Camera/Preview Area */}
      <div className="flex-1 relative overflow-hidden">
        {step === 'preview' ? (
          <div className="h-full flex flex-col items-center justify-center p-6">
            <div className="relative w-full max-w-sm aspect-[4/5] rounded-3xl overflow-hidden mb-4">
              <img 
                src={backPhoto!} 
                alt="Back camera"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 w-20 h-28 rounded-xl overflow-hidden border-2 border-card">
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
          <div className="h-full flex items-center justify-center">
            <div className="w-full max-w-sm aspect-[3/4] rounded-3xl bg-muted/30 border-2 border-dashed border-border flex flex-col items-center justify-center gap-4">
              <div className={`p-6 rounded-full ${step === 'front' ? 'gradient-secondary' : 'gradient-primary'}`}>
                <Camera className="w-12 h-12 text-foreground" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg">
                  {step === 'front' ? 'take a selfie 🤳' : 'now flip the camera 📷'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {step === 'front' ? 'show ur face!' : 'show what u see!'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Bottom Controls */}
      <div className="p-6 flex items-center justify-center gap-6">
        {step === 'preview' ? (
          <>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => {
                setStep('front');
                setFrontPhoto(null);
                setBackPhoto(null);
              }}
              className="gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              retake
            </Button>
            
            <Button 
              variant="neon" 
              size="lg"
              onClick={handleSubmit}
              className="gap-2 px-8"
            >
              <Sparkles className="w-5 h-5" />
              post it!
            </Button>
          </>
        ) : (
          <button
            onClick={takePhoto}
            className="w-20 h-20 rounded-full border-4 border-foreground flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
          >
            <div className={`w-16 h-16 rounded-full ${step === 'front' ? 'gradient-secondary' : 'gradient-primary'}`} />
          </button>
        )}
      </div>
    </div>
  );
};

export default CameraModal;
